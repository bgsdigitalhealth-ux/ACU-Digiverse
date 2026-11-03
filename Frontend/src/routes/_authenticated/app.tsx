import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { acuHeadLinks } from "@/components/AuthShell";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "ACU Reporting and Event Management" },
      { name: "description", content: "Colleges, departments, events and reports for Adichunchanagiri University." },
      { property: "og:title", content: "ACU Reporting and Event Management" },
      { property: "og:description", content: "Colleges, departments, events and reports for Adichunchanagiri University." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: acuHeadLinks,
  }),
  component: AcuApp,
});

function AcuApp() {
  const { user } = Route.useRouteContext();
  const [error, setError] = useState("");
  const [importable, setImportable] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { loadAcuState } = await import("@/lib/acu-bridge");
        const { installAcuPdf } = await import("@/lib/acu-pdf");
        installAcuPdf();
        const api = await loadAcuState(user.id);
        if (cancelled) return;
        (window as any).__ACU = api;
        const me = (api.S as any).users.find((u: any) => u.id === user.id);
        const global = me && (me.role === "su" || (me.role !== "NONE" && !me.college && !me.dept));
        setImportable(!!global && !!localStorage.getItem("acu_v2") && !localStorage.getItem("acu_v2_imported"));
        if (!document.querySelector("script[data-acu-app]")) {
          const s = document.createElement("script");
          s.src = "/acu/app.js?v=20261103-roles-proper";
          s.async = false;
          s.setAttribute("data-acu-app", "1");
          document.body.appendChild(s);
        }
      } catch (e: any) {
        setError(e?.message || "Could not load your data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    const handleClose = () => setMobileNavOpen(false);
    window.addEventListener("hashchange", handleClose);
    return () => window.removeEventListener("hashchange", handleClose);
  }, []);

  async function runImport() {
    if (!confirm("Copy the colleges, departments, events and reports saved in this browser into the shared online system?")) return;
    const { importLocalData } = await import("@/lib/acu-bridge");
    const n = await importLocalData((window as any).__ACU);
    alert(`${n} item(s) imported. Old uploaded files and passcode logins are not copied: please re-create user accounts by email.`);
    window.location.reload();
  }

  const userInitial = (
    (user.user_metadata as any)?.name ||
    user.email ||
    "U"
  ).charAt(0).toUpperCase();

  return (
    <>
      <header className="mobile-topbar" aria-label="Mobile Navigation">
        <button
          type="button"
          className="mobile-hamburger-btn"
          aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((v) => !v)}
        >
          {mobileNavOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
        <div className="mobile-brand">
          <span className="mobile-brand-title">ACU DigiVerse</span>
          <span className="mobile-brand-sub">Unified Digital Ecosystem</span>
        </div>
        <div className="mobile-user-pill" title={user.email}>
          {userInitial}
        </div>
      </header>

      <div
        className={`mobile-nav-overlay ${mobileNavOpen ? "active" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {importable && (
        <div className="card" style={{ margin: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span>Data from the old offline version was found in this browser.</span>
          <button onClick={runImport}>Import data from this browser</button>
          <button className="g" onClick={() => (localStorage.setItem("acu_v2_imported", "1"), setImportable(false))}>
            Dismiss
          </button>
        </div>
      )}
      {error && <p style={{ padding: 24 }}>{error}</p>}
      <div className={`app-layout acu-workspace ${mobileNavOpen ? "nav-open" : ""}`}>
        <aside
          className={`sidebar ${mobileNavOpen ? "open" : ""}`}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("a") || target.closest("button.vs-back")) {
              setMobileNavOpen(false);
            }
          }}
        >
          <div className="brand">
            <div className="brand-header-row">
              <div>
                <h1>ACU DigiVerse</h1>
                <small>Unified Digital Ecosystem</small>
              </div>
              <button
                type="button"
                className="sidebar-close-btn"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                &times;
              </button>
            </div>
          </div>
          <nav id="nav"></nav>
          <div id="who"></div>
        </aside>
        <main id="app"></main>
      </div>
    </>
  );
}
