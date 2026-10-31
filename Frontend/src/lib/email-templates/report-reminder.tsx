import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import type { MissingEvent, MissingPeriod } from "../report-reminder-policy";

interface Props {
  name?: string;
  department?: string;
  periods?: MissingPeriod[];
  events?: MissingEvent[];
}

export function ReportReminderEmail({ name, department, periods = [], events = [] }: Props) {
  return <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your assigned reports are still pending in ACU DigiVerse.</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Text style={styles.brand}>ACU DigiVerse</Text>
        <Heading style={styles.title}>Pending report reminder</Heading>
        <Text style={styles.text}>Hello {name || "colleague"},</Text>
        <Text style={styles.text}>The following reports for {department || "your assigned department"} have not yet been submitted.</Text>
        {periods.map(period => <Section key={period.period} style={styles.section}>
          <Heading as="h2" style={styles.heading}>Reporting period: {period.period}</Heading>
          {period.headings.map(heading => <Text key={heading} style={styles.item}>{heading}</Text>)}
        </Section>)}
        {events.length > 0 && <Section style={styles.section}>
          <Heading as="h2" style={styles.heading}>Events Organized</Heading>
          {events.map(event => <Text key={event.id} style={styles.item}>{event.title} — {event.date}</Text>)}
        </Section>}
        <Button href="https://acudigiverse.com/app#/monthly" style={styles.button}>Open my reports</Button>
        <Text style={styles.text}>Please submit the pending reports, or submit a zero-activity report where applicable. Saved submissions are removed from future reminders.</Text>
        <Text style={styles.footer}>This is a daily reminder for your assigned reporting responsibilities. If you submitted after this email was sent, no further action is needed for that report.</Text>
      </Container>
    </Body>
  </Html>;
}

export const template = {
  component: ReportReminderEmail,
  subject: "Pending reports — ACU DigiVerse",
  displayName: "Daily pending-report reminder",
  previewData: { name: "Colleague", department: "Your department", periods: [{ period: "2026-W44", headings: ["Events Organized", "Research Publications"] }], events: [] },
} satisfies TemplateEntry;

// Email clients need inline styles; these mirror the global ACU semantic palette.
const brand = { surface: "#FFFFFF", primary: "#8B1E3F", deep: "#6D1733", accent: "#D4A017", text: "#1F2937", muted: "#6B7280", light: "#F5F5F5" };
const styles = {
  body: { backgroundColor: brand.surface, fontFamily: "Arial, sans-serif" },
  container: { maxWidth: "600px", padding: "32px 28px" },
  brand: { color: brand.primary, fontSize: "16px", fontWeight: "bold" },
  title: { color: brand.deep, fontSize: "24px", lineHeight: "1.3" },
  text: { color: brand.text, fontSize: "15px", lineHeight: "1.6" },
  section: { borderLeft: `3px solid ${brand.accent}`, backgroundColor: brand.light, padding: "12px 18px", marginBottom: "16px" },
  heading: { color: brand.deep, fontSize: "16px", margin: "0 0 10px" },
  item: { color: brand.text, fontSize: "14px", lineHeight: "1.5", margin: "6px 0" },
  button: { backgroundColor: brand.primary, color: brand.surface, fontSize: "15px", borderRadius: "6px", padding: "12px 20px", margin: "12px 0" },
  footer: { color: brand.muted, fontSize: "12px", lineHeight: "1.6" },
};