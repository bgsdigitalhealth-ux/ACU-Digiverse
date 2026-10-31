import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), request: vi.fn(), fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./email-templates/send-email", () => ({ sendTemplateEmail: mocks.send }));
import { changeAccountPassword } from "./password-change.functions";

const userId = "00000000-0000-4000-8000-000000000001";
const account = { id: userId, email: "account@example.com", email_confirmed_at: "2026-10-01", updated_at: "2026-10-27T09:37:00Z" };
const invoke = changeAccountPassword as unknown as (arg: unknown) => Promise<Record<string, unknown>>;
const data = { password: "new-password-fixture", currentPassword: "current-password-fixture" };
const context = { userId };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://auth.example.com");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_fixture");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.request.mockReturnValue(new Request("https://acudigiverse.com", { headers: { Authorization: "Bearer fixture" } }));
  mocks.fetch.mockResolvedValue(Response.json(account));
  mocks.send.mockResolvedValue({ sent: true });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Password-change notification", () => {
  it("automatically sends one notification after a successful password change to the account email only", async () => {
    expect(await invoke({ data, context })).toEqual({ ok: true, notification: "sent" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith("password-changed", "account@example.com", {
      idempotencyKey: `password-changed:${userId}:2026-10-27T09:37:00Z`, templateData: { changedAt: expect.stringContaining("IST") },
    });
    expect(JSON.stringify(mocks.send.mock.calls)).not.toContain(data.password);
    expect(JSON.stringify(mocks.send.mock.calls)).not.toContain(data.currentPassword);
    expect(mocks.fetch).toHaveBeenCalledWith("https://auth.example.com/auth/v1/user", expect.objectContaining({
      method: "PUT", headers: expect.objectContaining({ Authorization: "Bearer fixture" }),
      body: JSON.stringify({ password: data.password, current_password: data.currentPassword }),
    }));
  });
  it("also notifies after password reset and never requires the old password on recovery", async () => {
    expect(await invoke({ data: { password: data.password }, context })).toEqual({ ok: true, notification: "sent" });
    expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1]?.body)).toEqual({ password: data.password });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("does not send any notification when Auth rejects the password change", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ msg: "Current password is incorrect" }, { status: 400 }));
    expect(await invoke({ data, context })).toEqual({ ok: false, error: "Current password is incorrect" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("never lets a browser-provided recipient override the Auth account", async () => {
    await invoke({ data: { ...data, email: "another@example.com" }, context });
    expect(mocks.send.mock.calls[0]?.[1]).toBe("account@example.com");
  });
  it("does not send to an unverified email or a different authenticated account", async () => {
    for (const result of [{ ...account, email_confirmed_at: undefined }, { ...account, id: "another-user" }]) {
      mocks.fetch.mockResolvedValue(Response.json(result));
      expect(await invoke({ data, context })).toEqual({ ok: true, notification: "unavailable" });
    }
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("respects recipient suppression without retrying or failing the saved password", async () => {
    mocks.send.mockResolvedValue({ sent: false, reason: "recipient_suppressed" });
    expect(await invoke({ data, context })).toEqual({ ok: true, notification: "suppressed" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("reports an email failure separately from a successfully saved password", async () => {
    mocks.send.mockRejectedValue(new Error("sending unavailable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await invoke({ data, context })).toEqual({ ok: true, notification: "unavailable" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
  it("does not update or send without caller authorization", async () => {
    mocks.request.mockReturnValue(new Request("https://acudigiverse.com"));
    await expect(invoke({ data, context })).rejects.toThrow("Password change is unavailable");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});