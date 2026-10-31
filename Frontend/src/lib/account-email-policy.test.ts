import { describe, expect, it } from "vitest";
import { ACCOUNT_EMAIL_SENDER, canManageAccountEmails, validateAccountEmailRedirect } from "./account-email-policy";

describe("Account email controls", () => {
  it("uses the owner's requested sender info@acudigiverse.com", () => {
    expect(ACCOUNT_EMAIL_SENDER).toBe("info@acudigiverse.com");
  });
  it("allows only Super Admin to manage account emails", () => {
    expect(canManageAccountEmails("su")).toBe(true);
    for (const role of ["ua", "ca", "dean", "dept", "NONE"]) expect(canManageAccountEmails(role)).toBe(false);
  });
  it("keeps account-email links on the application's password-setup page", () => {
    expect(validateAccountEmailRedirect("https://acudigiverse.com/reset-password")).toBe("https://acudigiverse.com/reset-password");
    expect(validateAccountEmailRedirect("http://localhost:8080/reset-password")).toBe("https://acudigiverse.com/reset-password");
    expect(validateAccountEmailRedirect("https://acu-digiverse.onrender.com/reset-password")).toBe("https://acu-digiverse.onrender.com/reset-password");
    expect(validateAccountEmailRedirect("https://acudigiverse.vercel.app/reset-password")).toBe("https://acudigiverse.vercel.app/reset-password");
    expect(() => validateAccountEmailRedirect("https://unauthorized.domain.com/reset-password")).toThrow();
    for (const address of ["https://attacker.example/reset-password", "https://acudigiverse.com/auth", "https://acudigiverse.com/reset-password?next=https://attacker.example", "https://acudigiverse.com:444/reset-password"]) {
      expect(() => validateAccountEmailRedirect(address)).toThrow("Invalid password-setup address.");
    }
  });
});