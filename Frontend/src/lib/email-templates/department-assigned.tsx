import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

type Props = { name?: string; department?: string; college?: string };
function DepartmentAssigned({ name, department, college }: Props) {
  return <Html lang="en"><Head /><Preview>Your Department User assignment — ACU DigiVerse</Preview><Body style={styles.body}><Container style={styles.container}>
    <Text style={styles.brand}>ACU DigiVerse</Text><Heading style={styles.heading}>Department User access assigned</Heading>
    <Text style={styles.text}>Hello {name || "there"}, your administrator has assigned you as a Department User.</Text>
    <Text style={styles.text}><strong>College:</strong> {college || "Your assigned college"}<br /><strong>Department:</strong> {department || "Your assigned department"}</Text>
    <Text style={styles.text}>Sign in with your existing account email and password. Your access is limited to your assigned college and department. If you have not set a password or have forgotten it, use “Forgot password?” on the sign-in page.</Text>
    <Button href="https://acudigiverse.com/auth" style={styles.button}>Open my Department Dashboard</Button>
    <Text style={styles.text}>Website: <a href="https://acudigiverse.com">https://acudigiverse.com</a><br />Sign in: <a href="https://acudigiverse.com/auth">https://acudigiverse.com/auth</a></Text>
  </Container></Body></Html>;
}
export const template = { component: DepartmentAssigned, subject: "Department User access assigned — ACU DigiVerse", displayName: "Department User assignment", previewData: { name: "Department colleague", department: "Assigned department", college: "Assigned college" } } satisfies TemplateEntry;
const styles = {
  body: { backgroundColor: "#FFFFFF", fontFamily: "Arial, sans-serif" },
  container: { maxWidth: "600px", padding: "32px 28px" },
  brand: { color: "#8B1E3F", fontWeight: "bold" },
  heading: { color: "#6D1733", fontSize: "24px" },
  text: { color: "#1F2937", fontSize: "15px", lineHeight: "1.6" },
  button: { backgroundColor: "#8B1E3F", color: "#FFFFFF", padding: "12px 20px", borderRadius: "6px" },
};