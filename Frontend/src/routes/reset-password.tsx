import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, acuHeadLinks } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { changeAccountPassword } from "@/lib/password-change.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set your password — ACU Event Management" },
      { name: "description", content: "Set or reset your ACU Event Management password." },
      { property: "og:title", content: "Set your password — ACU Event Management" },
      { property: "og:description", content: "Set or reset your ACU Event Management password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: acuHeadLinks,
  }),
  component: ResetPage,
});

function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("pwned") || m.includes("leak") || m.includes("weak") || m.includes("known")) return "This password is too common or has appeared in a data leak. Please choose a different, stronger password.";
  if (m.includes("different from the old")) return "Please choose a password different from your current one.";
  if (m.includes("session") || m.includes("jwt") || m.includes("expired")) return "Your link has expired. Request a new one from the sign-in page (Forgot password).";
  return msg;
}

function ResetPage() {
  const navigate = useNavigate();
  const updatePassword = useServerFn(changeAccountPassword);
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const linkError = hash.get("error_description") || query.get("error_description");
    if (linkError) { setErr(friendly(linkError)); setState("invalid"); return; }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) setState("ready");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && !cancelled) setState("ready");
    });

    const tokenHash = query.get("token_hash");
    const code = query.get("code");
    const type = (query.get("type") || "invite") as any;

    if (tokenHash) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ data: vData, error: vError }) => {
        if (cancelled) return;
        if (vError) {
          setErr(friendly(vError.message));
          setState("invalid");
        } else if (vData.session) {
          setState("ready");
        }
      });
    } else if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data: cData, error: cError }) => {
        if (cancelled) return;
        if (cError) {
          setErr(friendly(cError.message));
          setState("invalid");
        } else if (cData.session) {
          setState("ready");
        }
      });
    }

    // Give the email link a few seconds to sign in before saying it is invalid.
    const t = setTimeout(() => {
      if (!cancelled) setState((s) => (s === "checking" ? "invalid" : s));
    }, 8000);

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords do not match.");
    setBusy(true);
    setErr("");
    try {
      // Recovery and invitation sessions must not include current_password.
      const result = await updatePassword({ data: { password: pw } });
      if (!result.ok) return setErr(friendly(result.error));
      setPw("");
      setPw2("");
      await navigate({ to: "/app", replace: true });
    } catch {
      setErr("Could not save the password. Please try again, or request a new link from the sign-in page.");
    } finally {
      setBusy(false);
    }
  }

  const field = (value: string, set: (v: string) => void, placeholder: string, id: string) => (
    <div className="l-input-wrap l-password-wrap">
      <input id={id} aria-label={placeholder} type={show ? "text" : "password"} autoComplete="new-password" placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} />
      <Button type="button" variant="ghost" size="icon" className="l-password-toggle" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );

  return (
    <AuthShell>
      <h2>Set your password</h2>
      {state === "checking" ? (
        <p className="sub">Checking your link…</p>
      ) : state === "invalid" ? (
        <>
          <p className="sub">{err || "This link is invalid or has expired."}</p>
          <p className="sub">Go to the sign-in page, click "Forgot password?" and enter your email to get a fresh link.</p>
          <Button className="btn-primary" type="button" onClick={() => navigate({ to: "/auth" })}>Go to sign in</Button>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="sub">Choose a password with at least 8 characters. Avoid common passwords.</p>
          {field(pw, setPw, "New password", "new-password")}
          {field(pw2, setPw2, "Repeat password", "repeat-password")}
          {pw2 && pw !== pw2 && <p className="rq">Passwords do not match.</p>}
          {err && <p className="rq">{err}</p>}
          <Button className="btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
