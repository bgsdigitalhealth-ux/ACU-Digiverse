import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { changedAt?: string }

export function PasswordChangedEmail({ changedAt }: Props) {
  return <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ACU DigiVerse password has been changed.</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Text style={styles.brand}>ACU DigiVerse</Text>
        <Heading style={styles.title}>Your password was changed</Heading>
        <Text style={styles.text}>The password for your ACU DigiVerse account was successfully updated{changedAt ? ` on ${changedAt}` : ""}.</Text>
        <Text style={styles.text}>If you made this change, no further action is needed. Your new password is never included in emails.</Text>
        <Text style={styles.text}>If you did not make this change, reset your password immediately using “Forgot password?” on the sign-in page and contact your college or university administrator.</Text>
        <Button href="https://acudigiverse.com/auth" style={styles.button}>Secure my account</Button>
      </Container>
    </Body>
  </Html>;
}

export const template = {
  component: PasswordChangedEmail,
  subject: "Your password was changed — ACU DigiVerse",
  displayName: "Password changed notification",
  previewData: { changedAt: "27 October 2026, 15:07 IST" },
} satisfies TemplateEntry;

// React Email requires inline styles; match the ACU global semantic palette.
const brand = { surface: "#FFFFFF", primary: "#8B1E3F", deep: "#6D1733", text: "#1F2937" };
const styles = {
  body: { backgroundColor: brand.surface, fontFamily: "Arial, sans-serif" },
  container: { maxWidth: "600px", padding: "32px 28px" },
  brand: { color: brand.primary, fontSize: "16px", fontWeight: "bold" },
  title: { color: brand.deep, fontSize: "24px", lineHeight: "1.3" },
  text: { color: brand.text, fontSize: "15px", lineHeight: "1.6" },
  button: { backgroundColor: brand.primary, color: brand.surface, fontSize: "15px", borderRadius: "6px", padding: "12px 20px", margin: "12px 0" },
};