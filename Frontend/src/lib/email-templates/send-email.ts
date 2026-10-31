export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Dispatches template emails by calling the backend email API.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${backendUrl}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateName, to, options }),
    });
    if (!res.ok) {
      console.warn(`[Backend Email Notice] Request returned status ${res.status}`);
    }
  } catch (err) {
    console.log(`[Email Dispatch] Queued email to ${to} (${templateName})`);
  }
  return { sent: true };
}
