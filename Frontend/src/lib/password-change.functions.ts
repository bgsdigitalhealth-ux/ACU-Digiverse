import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const passwordInput = z.object({
  password: z.string().min(8).max(4096),
  currentPassword: z.string().min(1).max(4096).optional(),
}).strict();

/** One authenticated password update and one notification to that account only. */
export const changeAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passwordInput.parse(input))
  .handler(async ({ data, context }) => {
    const url = process.env['SUPABASE_URL'];
    const apiKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
    const authorization = getRequest().headers.get("Authorization");
    if (!url || !apiKey || !authorization) throw new Error("Password change is unavailable.");

    // The generated middleware client validates bearer claims but stores no
    // session. Its auth.updateUser would fail with AuthSessionMissingError.
    // Use the same caller bearer with Auth's update endpoint, never admin auth.
    let response: Response;
    try {
      response = await fetch(`${url}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: apiKey, Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password, ...(data.currentPassword ? { current_password: data.currentPassword } : {}) }),
      });
    } catch {
      return { ok: false as const, error: "Could not reach the account service. Please try again." };
    }
    const account = await response.json() as { id?: string; email?: string; email_confirmed_at?: string; updated_at?: string; msg?: string; message?: string };
    if (!response.ok) {
      return { ok: false as const, error: account.msg || account.message || "Could not change your password." };
    }
    // Recipient and event timestamp come only from Auth, never browser input.
    if (account.id !== context.userId || !account.email || !account.email_confirmed_at) {
      return { ok: true as const, notification: "unavailable" as const };
    }
    const changedAt = account.updated_at || new Date().toISOString();
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      const sent = await sendTemplateEmail("password-changed", account.email, {
        idempotencyKey: `password-changed:${context.userId}:${changedAt}`,
        templateData: { changedAt: new Date(changedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" }) + " IST" },
      });
      return { ok: true as const, notification: sent.sent ? "sent" as const : "suppressed" as const };
    } catch {
      // An email failure must never report a successful password change as a
      // failed update or cause the user to retry/lose access. No passwords/logs.
      console.warn("Password-change notification could not be sent.");
      return { ok: true as const, notification: "unavailable" as const };
    }
  });