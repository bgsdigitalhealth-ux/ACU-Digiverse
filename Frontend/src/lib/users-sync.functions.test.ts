import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), invite: vi.fn(), remove: vi.fn(), getUser: vi.fn(), reset: vi.fn(), send: vi.fn(), admin: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("./email-templates/send-email", () => ({ sendTemplateEmail: mocks.send }));
import { syncUsers } from "./users.functions";

type Row = Record<string, unknown>;
let rows: Record<string, Row[]>;
let failProfile = false;
let sequence: number;
function client() {
  return { from: (table: string) => {
    const filters: Record<string, unknown> = {};
    let action = "select", payload: Row | undefined;
    const result = () => {
      const existing = rows[table] || [];
      const matches = (row: Row) => Object.entries(filters).every(([k, v]) => row[k] === v);
      if (action === "select") return { data: existing.filter(matches), error: null };
      if (table === "profiles" && failProfile) return { data: null, error: { message: "Write failed" } };
      if (action === "delete") rows[table] = existing.filter(row => !matches(row));
      if (action === "update") existing.filter(matches).forEach(row => Object.assign(row, payload));
      if ((action === "upsert" || action === "insert") && payload) { const found = action === "upsert" && existing.find(row => row['id'] === payload?.['id']); if (found) Object.assign(found, payload); else existing.push(payload); rows[table] = existing }
      return { data: null, error: null };
    };
    const query = { select: () => query, eq: (k: string, v: unknown) => { filters[k] = v; return query }, upsert: (v: Row) => { action = "upsert"; payload = v; return query }, insert: (v: Row) => { action = "insert"; payload = v; return query }, update: (v: Row) => { action = "update"; payload = v; return query }, delete: () => { action = "delete"; return query }, maybeSingle: async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data } }, then: (fn: (r: unknown) => unknown) => Promise.resolve(result()).then(fn) };
    return query;
  } };
}
const callerId = "admin";
const data = (creates: Row[] = [], updates: Row[] = []) => ({ redirectTo: "https://acudigiverse.com/reset-password", creates, updates, deletes: [] });
const account = (email: string) => ({ name: "Assigned user", email, role: "dept", college: "college-a", dept: "department-a" });
const invoke = syncUsers as unknown as (arg: unknown) => Promise<{ errors: string[]; invitations: unknown[]; notices: string[] }>;
beforeEach(() => {
  vi.clearAllMocks(); failProfile = false; sequence = 0;
  rows = { profiles: [{ id: callerId, college_id: null, dept_id: null }], user_roles: [{ user_id: callerId, role: "su" }], app_settings: [{ id: 1, data: {} }], app_items: [{ collection: "depts", id: "department-a", college_id: "college-a", data: { name: "Department A" } }, { collection: "colleges", id: "college-a", data: { name: "College A" } }] };
  Object.assign(mocks.admin, client(), { auth: { admin: { createUser: mocks.create, inviteUserByEmail: mocks.invite, deleteUser: mocks.remove, getUserById: mocks.getUser }, resetPasswordForEmail: mocks.reset } });
  mocks.create.mockImplementation(async () => ({ data: { user: { id: `user-${++sequence}` } }, error: null }));
  mocks.invite.mockImplementation(async (email: string) => {
    const profile = rows['profiles']?.find(p => p['email'] === email);
    if (!profile || !rows['user_roles']?.some(r => r['user_id'] === profile['id'] && r['role'] === "dept")) throw new Error("Email sent before assignment");
    return { data: { user: { id: profile['id'] } }, error: null };
  });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { email: "assigned@example.test", last_sign_in_at: "2026-10-01", updated_at: "2026-10-29" } }, error: null });
  mocks.send.mockResolvedValue({ sent: true });
});
const run = (payload: ReturnType<typeof data>) => invoke({ data: payload, context: { supabase: client(), userId: callerId } });
describe("Department User provisioning", () => {
  it("denies account management to an unassigned Department User", async () => {
    const role = rows['user_roles']?.find(row => row['user_id'] === callerId);
    if (role) role['role'] = "dept";
    const result = await run(data([account("one@example.test")]));
    expect(result.errors).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("saves both Department Users before their separate secure invitations", async () => {
    const result = await run(data([account("one@example.test"), account("two@example.test")]));
    expect(result.errors).toEqual([]); expect(result.invitations).toHaveLength(2);
    expect(mocks.invite).toHaveBeenCalledTimes(2);
    expect(mocks.invite).toHaveBeenCalledWith("one@example.test", { redirectTo: "https://acudigiverse.com/reset-password", data: { name: "Assigned user" } });
    expect(mocks.create).toHaveBeenCalledWith({ email: "one@example.test", email_confirm: false, user_metadata: { name: "Assigned user" } });
    expect(rows['profiles']?.filter(row => row['dept_id'] === "department-a")).toHaveLength(2);
    expect(rows['profiles']?.filter(row => row['dept_id'] === "department-a").every(row => row['college_id'] === "college-a")).toBe(true);
  });
  it("blocks a third Department User without creating or sending their account", async () => {
    const result = await run(data([account("one@example.test"), account("two@example.test"), account("three@example.test")]));
    expect(result.errors[0]).toContain("two Department Users");
    expect(mocks.create).toHaveBeenCalledTimes(2); expect(mocks.invite).toHaveBeenCalledTimes(2);
  });
  it("rejects a department from a different college", async () => {
    const result = await run(data([{ ...account("one@example.test"), college: "college-b" }]));
    expect(result.errors[0]).toContain("does not belong"); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not send an invitation when assignment cannot be saved", async () => {
    failProfile = true;
    const result = await run(data([account("one@example.test")]));
    expect(result.errors).toHaveLength(1); expect(mocks.invite).not.toHaveBeenCalled(); expect(mocks.remove).toHaveBeenCalledWith("user-1");
  });
  it("reports failed invitation sending without deleting a saved assignment", async () => {
    mocks.invite.mockResolvedValue({ error: { message: "Email unavailable" } });
    const result = await run(data([account("one@example.test")]));
    expect(result.errors[0]).toContain("account saved"); expect(result.invitations).toEqual([]); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("notifies an active account once when assigned as a Department User", async () => {
    rows['profiles']?.push({ id: "assigned", name: "Assigned user", email: "assigned@example.test", college_id: null, dept_id: null });
    rows['user_roles']?.push({ user_id: "assigned", role: "dept" });
    expect((await run(data([], [{ id: "assigned", ...account("assigned@example.test") }]))).errors).toEqual([]);
    expect(mocks.send).toHaveBeenCalledWith("department-assigned", "assigned@example.test", { idempotencyKey: "department-assigned:assigned:college-a:department-a:2026-10-29", templateData: { name: "Assigned user", role: "Department User", department: "Department A", college: "College A" } });
  });
});