import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, acuHeadLinks } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ACU Event Management" },
      { name: "description", content: "Staff sign-in for Adichunchanagiri University reporting and event management." },
      { property: "og:title", content: "Sign in — ACU Event Management" },
      { property: "og:description", content: "Staff sign-in for Adichunchanagiri University reporting and event management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: acuHeadLinks,
  }),
  validateSearch: (s: Record<string, unknown>): { portal?: string } =>
    typeof s['portal'] === "string" && /^[a-z0-9]{1,32}$/.test(s['portal']) ? { portal: s['portal'] } : {},
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { portal } = Route.useSearch();
  const goNext = () =>
    portal ? navigate({ to: "/$college", params: { college: portal }, replace: true }) : navigate({ to: "/app", replace: true });
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goNext();
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        let { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          // If first login fails, try bootstrapping the initial super admin
          try {
            const { bootstrapInitialAdmin } = await import("@/lib/bootstrap-admin.functions");
            const bootRes = await bootstrapInitialAdmin({ data: { email: email.trim(), password } });
            if (bootRes?.success) {
              const retry = await supabase.auth.signInWithPassword({ email: email.trim(), password });
              error = retry.error;
            }
          } catch (_) {
            // keep original error
          }
        }
        if (error) {
          if ((error as any).code === "email_provider_disabled" || error.message?.toLowerCase().includes("email logins are disabled")) {
            throw new Error("Email provider is disabled in Supabase. Please enable Email Provider under Authentication > Providers in your Supabase Dashboard.");
          }
          if (error.message?.toLowerCase().includes("email not confirmed") || (error as any).code === "email_not_confirmed") {
            throw new Error("Email not confirmed. Please check your inbox or confirm your email in Supabase.");
          }
          throw error;
        }
        goNext();
      } else if (mode === "up") {
        const trimmedEmail = email.trim().toLowerCase();
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { name: name.trim() || "User" }
          }
        });
        if (signUpErr) throw signUpErr;
        // If session is immediately returned, proceed to app
        if (signUpData.session) {
          goNext();
        } else {
          // If email confirmation is required by Supabase
          setMsg({ ok: true, text: "Account created! You can now sign in or check your email if confirmation is required." });
          setMode("in");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h2>{mode === "in" ? "Sign in" : mode === "up" ? "Create an account" : "Reset password"}</h2>
      <p className="sub">
        {mode === "in"
          ? "Sign in with your email to continue."
          : mode === "up"
          ? "Create a new user account with email and password."
          : "We'll email you a link to set a new password."}
      </p>
      <form onSubmit={submit}>
        {mode === "up" && (
          <div className="l-input-wrap" style={{ marginBottom: "12px" }}>
            <input required type="text" autoComplete="name" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="l-input-wrap">
          <input required type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" && (
          <div className="l-input-wrap l-password-wrap">
            <input
              required
              id="signin-password"
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="l-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-controls="signin-password"
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        )}
        {mode === "in" && (
          <div className="l-opts">
            <a href="#" onClick={(e) => (e.preventDefault(), setMode("up"), setShowPassword(false), setMsg(null))}>
              Need an account? Sign up
            </a>
            <a href="#" onClick={(e) => (e.preventDefault(), setMode("forgot"), setShowPassword(false), setMsg(null))}>
              Forgot password?
            </a>
          </div>
        )}
        {mode === "up" && (
          <div className="l-opts">
            <a href="#" onClick={(e) => (e.preventDefault(), setMode("in"), setShowPassword(false), setMsg(null))}>
              Already have an account? Sign in
            </a>
          </div>
        )}
        {msg && (
          <p role="status" className={msg.ok ? "ok" : "rq"} style={{ margin: "12px 0" }}>
            {msg.text}
          </p>
        )}
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create Account" : "Send reset link"}
        </button>
      </form>
      {mode !== "in" && (
        <p style={{ marginTop: 20, fontSize: 13 }}>
          <a href="#" onClick={(e) => (e.preventDefault(), setMode("in"), setMsg(null))}>
            ← Back to sign in
          </a>
        </p>
      )}
    </AuthShell>
  );
}
