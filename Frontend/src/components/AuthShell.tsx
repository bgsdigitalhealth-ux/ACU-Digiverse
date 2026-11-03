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
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600;1,700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" },
  { rel: "stylesheet", href: "/acu/style.css?v=20261103-fancy-fonts-ui" },
];
