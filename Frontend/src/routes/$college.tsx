import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, acuHeadLinks } from "@/components/AuthShell";
import { checkCollegePortal } from "@/lib/college-portal.functions";

export const Route = createFileRoute("/$college")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "College Portal — ACU DigiVerse" },
      { name: "description", content: "College portal access for Adichunchanagiri University staff." },
      { property: "og:title", content: "College Portal — ACU DigiVerse" },
      { property: "og:description", content: "College portal access for Adichunchanagiri University staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: acuHeadLinks,
  }),
  component: CollegePortal,
});

type State = "loading" | "signin" | "not_found" | "denied" | "error";

function CollegePortal() {
  const { college } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const slug = college.toLowerCase();

  useEffect(() => {
    let off = false;
    (async () => {
      if (!/^[a-z0-9]{1,32}$/.test(slug)) return setState("not_found");
      const { data } = await supabase.auth.getUser();
      if (!data.user) return !off && setState("signin");
      try {
        const res = await checkCollegePortal({ data: { slug } });
        if (off) return;
        if (res.status === "ok") {
          sessionStorage.removeItem("acu_view");
          sessionStorage.setItem("acu_portal", slug);
          navigate({ to: "/app", replace: true });
        } else {
          sessionStorage.removeItem("acu_portal");
          setState(res.status);
        }
      } catch {
        if (!off) setState("error");
      }
    })();
    return () => {
      off = true;
    };
  }, [slug, navigate]);

  return (
    <AuthShell>
      {state === "loading" && <p className="sub">Opening college portal…</p>}
      {state === "signin" && (
        <>
          <h2>College portal</h2>
          <p className="sub">Sign in with your ACU account to open this college portal.</p>
          <Link to="/auth" search={{ portal: slug }} className="btn-primary" style={{ display: "inline-block", textAlign: "center" }}>
            Sign in
          </Link>
        </>
      )}
      {state === "not_found" && (
        <>
          <h2>College Portal Not Found.</h2>
          <p className="sub">Check the link you were given.</p>
        </>
      )}
      {state === "denied" && (
        <>
          <h2>Access Denied</h2>
          <p className="rq">Access Denied — Your account is not authorized to access this college portal.</p>
        </>
      )}
      {state === "error" && <p className="rq">Could not verify this portal. Please try again.</p>}
      {state !== "loading" && state !== "signin" && (
        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link to="/">← Back to home</Link>
        </p>
      )}
    </AuthShell>
  );
}
