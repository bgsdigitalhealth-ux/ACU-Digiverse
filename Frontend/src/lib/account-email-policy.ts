/** Desired branded sender; activation is controlled by verified managed-email setup. */
export const ACCOUNT_EMAIL_SENDER =
  (typeof process !== "undefined" && process.env?.EMAIL_FROM) || "info@acudigiverse.com";
export const ACCOUNT_PASSWORD_SETUP_URL = "https://acudigiverse.com/reset-password";

export function canManageAccountEmails(role: string) {
  return role === "su";
}

/** Invitation links may only return to this application's password-setup page. */
export function validateAccountEmailRedirect(value: string) {
  const url = new URL(value);
  const hosts = new Set([
    "acudigiverse.com",
    "www.acudigiverse.com",
    "acu-digiverse.onrender.com",
    "acudigiverse.vercel.app",
  ]);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const isAllowedHost =
    hosts.has(url.hostname) ||
    url.hostname.endsWith(".onrender.com") ||
    url.hostname.endsWith(".vercel.app");

  if (
    (!isLocal && (!isAllowedHost || url.protocol !== "https:" || url.port)) ||
    (isLocal && url.protocol !== "http:" && url.protocol !== "https:") ||
    url.pathname !== "/reset-password" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid password-setup address.");
  }

  // Allowed hosts (Vercel, Render, custom domains) redirect directly to their own reset-password page
  if (isAllowedHost) {
    return `${url.origin}/reset-password`;
  }

  // Staff invitations must never require the recipient to join the builder's
  // private preview. Validate the caller input, then use the public app.
  return ACCOUNT_PASSWORD_SETUP_URL;
}
