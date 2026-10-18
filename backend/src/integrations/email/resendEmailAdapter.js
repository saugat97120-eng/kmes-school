// Resend Email Adapter — High-speed transactional email via Resend REST API.
//
// Implements the same interface as MockEmailAdapter / SmtpEmailAdapter:
//   sendPasswordReset({ to, resetToken, resetClientUrl }) -> Promise<{ok:true, id?:string}>
//   sendSecurityNotification({ to, subject, text })       -> Promise<{ok:true, id?:string}>
//   sendInquiryNotification({ name, email, phone, subject, message }) -> Promise<{ok:true, id?:string}>
//
// Configuration (environment-only):
//   EMAIL_PROVIDER=resend
//   RESEND_API_KEY=re_...
//   EMAIL_FROM=onboarding@resend.dev (or info@kmes.com.np once domain is verified in Resend)
//   EMAIL_FROM_NAME=Kaseni Model Secondary English School
//   ADMIN_NOTIFICATION_EMAIL=ivanbhattarai042@gmail.com
import { Resend } from "resend";

export class ResendServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResendServiceError";
    this.code = "RESEND_NOT_CONFIGURED";
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class ResendEmailAdapter {
  static DEFAULT_FROM_NAME = "Kaseni Model Secondary English School";
  static DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
  static DEFAULT_NOTIFICATION_EMAIL = "ivanbhattarai042@gmail.com";

  constructor(client = null) {
    this._client = client;
  }

  assertConfigured() {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new ResendServiceError(
        "Resend is not configured. Set RESEND_API_KEY in the backend environment."
      );
    }
  }

  _getClient() {
    if (this._client) return this._client;
    const key = process.env.RESEND_API_KEY;
    return new Resend(key);
  }

  _getFromAddress() {
    const fromName = process.env.EMAIL_FROM_NAME || ResendEmailAdapter.DEFAULT_FROM_NAME;
    const fromAddr = process.env.EMAIL_FROM || ResendEmailAdapter.DEFAULT_FROM_EMAIL;
    return `"${fromName}" <${fromAddr}>`;
  }

  async sendPasswordReset({ to, resetClientUrl }) {
    this.assertConfigured();
    const resend = this._getClient();
    const from = this._getFromAddress();
    const safeLink = escapeHtml(resetClientUrl);

    const result = await resend.emails.send({
      from,
      to,
      subject: "Reset your KMES School password",
      text: [
        "A password reset was requested for your KMES School account.",
        "",
        "Open the link below to choose a new password (valid for one hour):",
        String(resetClientUrl),
        "",
        "If you did not request this, you can safely delete this email.",
      ].join("\n"),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; rounded: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #071426; margin: 0 0 8px 0; font-family: Georgia, serif;">Kaseni Model Secondary English School</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Belbari-05, Kaseni, Morang</p>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="color: #111827; margin-top: 0;">Password Reset Request</h3>
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              A request has been received to reset the password for your account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${safeLink}" style="background: #eab308; color: #071426; font-weight: bold; padding: 12px 28px; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 15px;">Reset My Password</a>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${safeLink}" style="color: #2563eb; word-break: break-all;">${safeLink}</a>
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (result.error) {
      throw new Error(`Resend delivery failed: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return { ok: true, id: result.data?.id };
  }

  async sendSecurityNotification({ to, subject, text }) {
    this.assertConfigured();
    const resend = this._getClient();
    const from = this._getFromAddress();

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h3 style="color: #071426; margin-top: 0; font-family: Georgia, serif;">KMES Account Security Notice</h3>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Kaseni Model Secondary English School • Belbari-05, Kaseni, Morang
          </p>
        </div>
      `,
    });

    if (result.error) {
      throw new Error(`Resend delivery failed: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return { ok: true, id: result.data?.id };
  }

  async sendInquiryNotification({ name, email, phone, subject, message }) {
    this.assertConfigured();
    const resend = this._getClient();
    const from = this._getFromAddress();
    const to = process.env.ADMIN_NOTIFICATION_EMAIL || ResendEmailAdapter.DEFAULT_NOTIFICATION_EMAIL;

    const result = await resend.emails.send({
      from,
      to,
      subject: `[New Inquiry] ${subject || "Website Contact"} - ${name}`,
      text: [
        `New inquiry received on KMES school website:`,
        ``,
        `From: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Subject: ${subject}`,
        ``,
        `Message:`,
        message,
        ``,
        `Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })} (Nepal Time)`,
      ].join("\n"),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #071426; margin-top: 0; font-family: Georgia, serif;">New Website Inquiry / Admission Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>Sender Name:</strong></td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Email Address:</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Phone Number:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${escapeHtml(phone || "Not provided")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(subject)}</td>
            </tr>
          </table>
          <div style="background: #f9fafb; padding: 16px; border-left: 4px solid #eab308; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 0; color: #374151; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Received at: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })} • Kaseni Model Secondary English School CMS
          </p>
        </div>
      `,
    });

    if (result.error) {
      throw new Error(`Resend inquiry delivery failed: ${result.error.message || JSON.stringify(result.error)}`);
    }

    return { ok: true, id: result.data?.id };
  }
}
