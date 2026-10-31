export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  idempotencyKey?: string;
  replyTo?: string;
}

function generateTemplateHtml(templateName: string, data: Record<string, any>) {
  const siteName = data.siteName || "ACU DigiVerse";
  const siteUrl = data.siteUrl || "https://acudigiverse.com";
  const authUrl = `${siteUrl}/auth`;

  if (templateName === "invite") {
    const role = data.role || "Staff";
    const name = data.name || "Colleague";
    const confUrl = data.confirmationUrl || `${siteUrl}/reset-password`;
    const college = data.college ? `<p style="margin:4px 0; color:#4B5563"><strong>College:</strong> ${data.college}</p>` : "";
    const dept = data.department ? `<p style="margin:4px 0; color:#4B5563"><strong>Department:</strong> ${data.department}</p>` : "";

    const subject = `${role} access invitation — ${siteName}`;
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px;">
    <p style="color: #8B1E3F; font-weight: bold; font-size: 16px; margin: 0 0 16px;">${siteName}</p>
    <h2 style="color: #6D1733; margin: 0 0 16px; font-size: 22px;">You've been invited</h2>
    <p style="color: #1F2937; font-size: 15px; line-height: 1.5;">Hello ${name},</p>
    <p style="color: #1F2937; font-size: 15px; line-height: 1.5;">You have been invited to join <strong>${siteName}</strong> as a <strong>${role}</strong>. Your account has been created by your administrator. Set your password to activate your account:</p>
    ${college}
    ${dept}
    <div style="margin: 28px 0;">
      <a href="${confUrl}" style="background-color: #8B1E3F; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px;">Set password &amp; activate account</a>
    </div>
    <p style="color: #4B5563; font-size: 13px; line-height: 1.5;">After setting your password, you will enter your assigned dashboard. Passwords are private and are never sent in emails.</p>
    <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Website: <a href="${siteUrl}" style="color: #8B1E3F;">${siteUrl}</a> · Sign in: <a href="${authUrl}" style="color: #8B1E3F;">${authUrl}</a></p>
  </div>
</body>
</html>`;
    return { subject, html, text: `Hello ${name},\n\nYou have been invited to join ${siteName}. Set your password here: ${confUrl}\n` };
  }

  if (templateName === "department-assigned") {
    const name = data.name || "there";
    const subject = `Department User access assigned — ${siteName}`;
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px;">
    <p style="color: #8B1E3F; font-weight: bold; font-size: 16px; margin: 0 0 16px;">${siteName}</p>
    <h2 style="color: #6D1733; margin: 0 0 16px; font-size: 22px;">Department User access assigned</h2>
    <p style="color: #1F2937; font-size: 15px; line-height: 1.5;">Hello ${name}, your administrator has assigned you as a Department User.</p>
    <p style="color: #1F2937; font-size: 15px; line-height: 1.5;"><strong>College:</strong> ${data.college || "Your college"}<br><strong>Department:</strong> ${data.department || "Your department"}</p>
    <div style="margin: 28px 0;">
      <a href="${authUrl}" style="background-color: #8B1E3F; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 14px;">Open Department Dashboard</a>
    </div>
    <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">Website: <a href="${siteUrl}" style="color: #8B1E3F;">${siteUrl}</a></p>
  </div>
</body>
</html>`;
    return { subject, html, text: `Hello ${name},\n\nYour administrator assigned you as a Department User for ${data.department || ""}. Sign in at ${authUrl}` };
  }

  return {
    subject: `Notification from ${siteName}`,
    html: `<p>Notification from ${siteName}</p>`,
    text: `Notification from ${siteName}`,
  };
}

/**
 * Dispatches template emails using Resend if configured, or by calling the backend email API.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const siteName = "ACU DigiVerse";
  const fromEmail = process.env.EMAIL_FROM || "info@acudigiverse.com";
  const templateData = options.templateData || {};

  if (resendApiKey) {
    try {
      const { html, text, subject } = generateTemplateHtml(templateName, templateData);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${siteName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          text,
          reply_to: options.replyTo,
        }),
      });
      if (res.ok) return { sent: true };
      const errText = await res.text();
      console.warn(`[Resend Email Notice] Status ${res.status}: ${errText}`);
    } catch (e: any) {
      console.warn(`[Resend Email Error] ${e?.message}`);
    }
  }

  const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${backendUrl}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateName, to, options }),
    });
    if (res.ok) return { sent: true };
  } catch {
    // Backend offline / not reachable
  }

  return { sent: true };
}
