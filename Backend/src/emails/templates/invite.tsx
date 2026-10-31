import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  name?: string
  role?: string
  department?: string
  college?: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  name,
  role,
  department,
  college,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{role || "Staff"} access invitation — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{role === "Department User" ? "Your Department User account" : "You've been invited"}</Heading>
        {name && <Text style={text}>Hello {name},</Text>}
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Your account has been created by your administrator. Set your own password to activate your account.
        </Text>
        {role && <Text style={text}><strong>Role:</strong> {role}{college && <><br /><strong>College:</strong> {college}</>}{department && <><br /><strong>Department:</strong> {department}</>}</Text>}
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Set password &amp; activate account
        </Button>
        <Text style={text}>After setting your password, you will enter your assigned dashboard. Passwords are private and are never included in emails.</Text>
        <Text style={text}>Website: <Link href="https://acudigiverse.com" style={link}>https://acudigiverse.com</Link><br />Sign in: <Link href="https://acudigiverse.com/auth" style={link}>https://acudigiverse.com/auth</Link></Text>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#6D1733',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#1F2937',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#8B1E3F',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #000000',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
