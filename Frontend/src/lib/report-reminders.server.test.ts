import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./email-templates/send-email", () => ({ sendTemplateEmail: mocks.send }));
import { sendDepartmentReportReminder } from "./report-reminders.server";

const target = { departmentId: "dept-a", collegeId: "college-a", startDate: "2026-10-27" as const };
const now = new Date("2026-10-27T03:47:00Z");
const item = (head: string) => ({ collection: "recs", id: head, college_id: "college-a", dept_id: "dept-a", data: { dept: "dept-a", month: "2026-W44", head } });

function client(options: { profiles?: unknown[]; roles?: unknown[]; items?: unknown[]; banned?: string; active?: boolean; sendError?: boolean; reminderUserId?: string } = {}) {
  const defaultProfiles = [{ id: "user-a", name: "Assigned user", email: "assigned@example.com" }];
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];
  const from = (table: string) => {
    const filters: Record<string, unknown> = {};
    queries.push({ table, filters });
    const resolve = () => {
      const data = table === "profiles" ? options.profiles ?? defaultProfiles : table === "user_roles" ? options.roles ?? [{ role: "dept" }] : table === "app_settings" ? { data: { reportCycle: "weekly", headings: [["pub", "Research Publications"], ["evo", "Events Organized"]] }, event_workflow_enabled: false } : filters['collection'] === "depts" ? { data: { name: "Department A", college: "college-a", ...(options.reminderUserId ? { reminderUserId: options.reminderUserId } : {}) }, college_id: "college-a" } : filters['collection'] === "colleges" ? { id: "college-a" } : options.items ?? [];
      return { data, error: null, count: Array.isArray(data) ? data.length : 1 };
    };
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; }, in: () => query, limit: () => query,
      maybeSingle: async () => resolve(), then: (resolvePromise: (result: unknown) => unknown) => Promise.resolve(resolve()).then(resolvePromise),
    };
    return query;
  };
  const admin = { from, auth: { admin: { getUserById: async () => ({ data: { user: { email: "assigned@example.com", email_confirmed_at: options.active === false ? null : "2026-10-01", last_sign_in_at: "2026-10-01", banned_until: options.banned } }, error: null }) } } } as unknown as SupabaseClient<Database>;
  return { admin, queries };
}

beforeEach(() => { vi.clearAllMocks(); mocks.send.mockResolvedValue({ sent: true }); });

describe("Single-recipient reminder processing", () => {
  it("sends exactly one email to the server-verified assigned user with both missing report types", async () => {
    const { admin, queries } = client();
    expect(await sendDepartmentReportReminder(admin, target, now)).toEqual({ outcome: "sent" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith("report-reminder", "assigned@example.com", { idempotencyKey: "report-reminder:dept-a:user-a:2026-10-27", templateData: { name: "Assigned user", department: "Department A", periods: [{ period: "2026-W44", headings: ["Research Publications", "Events Organized"] }], events: [] } });
    expect(queries.find(query => query.table === "profiles")?.filters).toEqual({ dept_id: "dept-a", college_id: "college-a" });
  });
  it("rereads submitted reports and stops sending once all uploads exist", async () => {
    const { admin } = client({ items: [item("pub"), item("evo")] });
    expect(await sendDepartmentReportReminder(admin, target, now)).toEqual({ outcome: "complete" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not guess a recipient when no department user is assigned", async () => {
    expect(await sendDepartmentReportReminder(client({ profiles: [] }).admin, target, now)).toEqual({ outcome: "unassigned" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not email a list or choose between multiple assignments", async () => {
    expect(await sendDepartmentReportReminder(client({ profiles: [{ id: "a" }, { id: "b" }] }).admin, target, now)).toEqual({ outcome: "ambiguous_assignment" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not send to University or Super Admin roles", async () => {
    expect(await sendDepartmentReportReminder(client({ roles: [{ role: "su" }] }).admin, target, now)).toEqual({ outcome: "not_department_user" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("keeps daily reminders working for the designated user when two users share a department", async () => {
    const { admin } = client({ profiles: [{ id: "user-a", name: "Assigned user", email: "assigned@example.com" }, { id: "user-b", name: "Second user", email: "second@example.com" }], reminderUserId: "user-a" });
    expect(await sendDepartmentReportReminder(admin, target, now)).toEqual({ outcome: "sent" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith("report-reminder", "assigned@example.com", expect.any(Object));
  });
  it("does not send to inactive invitation accounts", async () => {
    expect(await sendDepartmentReportReminder(client({ active: false }).admin, target, now)).toEqual({ outcome: "account_inactive" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not send to disabled users", async () => {
    expect(await sendDepartmentReportReminder(client({ banned: "2027-01-01" }).admin, target, now)).toEqual({ outcome: "account_inactive" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("respects managed recipient suppression without retrying", async () => {
    mocks.send.mockResolvedValue({ sent: false, reason: "recipient_suppressed" });
    expect(await sendDepartmentReportReminder(client().admin, target, now)).toEqual({ outcome: "recipient_suppressed" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});