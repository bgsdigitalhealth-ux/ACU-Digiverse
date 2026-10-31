import type { ReactNode } from "react";

/** Split-screen sign-in layout, reusing the original ACU login styles (/acu/style.css). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-split">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-mark">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1>
              Adichunchanagiri
              <br />
              University
            </h1>
            <p>
              Event Management System
              <br />
              <small>Events | Knowledge | Collaboration</small>
            </p>
          </div>
        </div>
        <div className="login-footer">
          One University
          <br />
          Many Initiatives
          <br />
          Greater Impact
        </div>
      </div>
      <div className="login-right">
        <div className="login-right-inner">{children}</div>
      </div>
    </div>
  );
}

export const acuHeadLinks = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" },
  { rel: "stylesheet", href: "/acu/style.css?v=20261029-password-single-eye" },
];
