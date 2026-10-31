import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invite: vi.fn(), reset: vi.fn(), getUser: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }), auth: { admin: { inviteUserByEmail: mocks.invite, getUserById: mocks.getUser }, resetPasswordForEmail: mocks.reset } },
}));

import { resendInvite, sendAccountPasswordReset } from "./users.functions";

const targetId = "00000000-0000-4000-8000-000000000002";
function context(role: string) {
  const userId = "00000000-0000-4000-8000-000000000001";
  return {
    userId,
    supabase: { from: (table: string) => ({ select: () => ({ eq: (_field: string, id: string) => {
      const rows = table === "user_roles" ? { data: [{ role: id === userId ? role : "dept" }] } : { data: id === userId ? { college_id: "college-a", dept_id: "department-a" } : { id: targetId, email: "staff@example.com", college_id: "college-a" } };
      return { ...rows, maybeSingle: async () => rows };
    } }) }) },
  };
}
// Test the handler directly; transport and authentication middleware are framework-owned.
const invokeResend = resendInvite as unknown as (arg: unknown) => Promise<Record<string, unknown>>;
const invokeReset = sendAccountPasswordReset as unknown as (arg: unknown) => Promise<Record<string, unknown>>;
const data = { id: targetId, redirectTo: "https://acudigiverse.com/reset-password" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invite.mockResolvedValue({ data: { user: { id: targetId } }, error: null });
  mocks.reset.mockResolvedValue({ data: {}, error: null });
});

describe("Account-email actions", () => {
  it("resends a secure invitation for an unconfirmed account without returning a password", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { email: "staff@example.com", last_sign_in_at: null, email_confirmed_at: null } }, error: null });
    const result = await invokeResend({ data, context: context("su") });
    expect(mocks.invite).toHaveBeenCalledWith("staff@example.com", { redirectTo: data.redirectTo });
    expect(result).toEqual({ ok: true, email: "staff@example.com" });
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it("sends a setup link to previously confirmed but unused accounts instead of resetting their password directly", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { email: "staff@example.com", last_sign_in_at: null, email_confirmed_at: "2026-10-01" } }, error: null });
    const result = await invokeResend({ data, context: context("su") });
    expect(mocks.reset).toHaveBeenCalledWith("staff@example.com", { redirectTo: data.redirectTo });
    expect(result).toEqual({ ok: true, email: "staff@example.com" });
    expect(mocks.invite).not.toHaveBeenCalled();
  });
  it("rejects non-Super-Admin access to the Super Admin password-reset action", async () => {
    for (const role of ["ua", "ca", "dean", "dept"]) {
      await expect(invokeReset({ data, context: context(role) })).rejects.toThrow("Only Super Admin");
    }
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it("lets Super Admin send a recovery email without receiving the user's password", async () => {
    const result = await invokeReset({ data, context: context("su") });
    expect(mocks.reset).toHaveBeenCalledWith("staff@example.com", { redirectTo: data.redirectTo });
    expect(result).toEqual({ ok: true });
  });
});