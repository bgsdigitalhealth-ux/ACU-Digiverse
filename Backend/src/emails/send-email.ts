import * as React from 'react';
import { render } from '@react-email/render';
import { TEMPLATES } from './registry';

const SITE_NAME = "ACU Digiverse";
const FROM_EMAIL = process.env.EMAIL_FROM || "info@acudigiverse.com";

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Renders a registered template and dispatches it using standard email providers (Resend, SMTP, etc.).
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    );
  }

  const recipient = template.to || to;
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)');
  }

  const templateData = options.templateData ?? {};
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <${FROM_EMAIL}>`,
        to: [recipient],
        subject,
        html,
        text,
        reply_to: options.replyTo,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { sent: false, reason: err };
    }
    return { sent: true };
  }

  // Development fallback: log email to console
  console.log(`[Email Service - Dev Mode] To: ${recipient} | Subject: ${subject}`);
  return { sent: true };
}
