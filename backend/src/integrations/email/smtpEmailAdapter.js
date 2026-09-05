// Phase 18C-4/20 — Production SMTP email adapter (Nodemailer).
//
// Implements the same interface as MockEmailAdapter:
//   sendPasswordReset({ to, resetToken, resetClientUrl }) -> Promise<{ok:true}>
//   sendSecurityNotification({ to, subject, text })       -> Promise<{ok:true}>
//
// Credentials come ONLY from environment variables (never committed). The raw
// reset token is placed inside the delivered reset URL for the end user and is
// never logged, never stored server-side, and never surfaced in any error path.
//
// Configuration (environment-only):
//   EMAIL_PROVIDER=smtp   (selects this adapter; must match at boot)
//   SMTP_HOST             (required)
//   SMTP_PORT             (default 587; 465 implies implicit TLS)
//   SMTP_SECURE           (true -> implicit TLS; default false -> STARTTLS)
//   SMTP_USER             (required)
//   SMTP_PASSWORD         (primary credential; required)
//   SMTP_PASS             (fallback credential for back-compat with old tests)
//   EMAIL_FROM / EMAIL_FROM_NAME (sender)
//
// Failure behavior: configuration problems throw SMTPServiceError immediately
// (before any network I/O); transport failures propagate from nodemailer. The
// auth route catches both and still returns the generic reset response.
import nodemailer from "nodemailer";

export class SMTPServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = "SMTPServiceError";
    this.code = "SMTP_NOT_CONFIGURED";
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class SmtpEmailAdapter {
  // Phase 20 default from-name for the school.
  static DEFAULT_FROM_NAME = "Kaseni Model Secondary English School";

  // Throws SMTPServiceError when configuration is missing/incomplete. Never
  // throws anything containing secret values.
  assertConfigured() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;

    if (!host) {
      throw new SMTPServiceError(
        "SMTP is not configured. Set SMTP_HOST (and SMTP_USER/SMTP_PASSWORD) in the backend environment."
      );
    }
    if ((user && !pass) || (!user && pass)) {
      throw new SMTPServiceError(
        "SMTP credentials are incomplete. Provide both SMTP_USER and SMTP_PASSWORD, or neither."
      );
    }
    if (!from) {
      throw new SMTPServiceError("SMTP sender is not configured. Set EMAIL_FROM or SMTP_USER.");
    }
  }

  _createTransporter() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    // SMTP_SECURE=true forces implicit TLS; otherwise 465 implies it by the
    // port-465 convention.
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordReset({ to, resetClientUrl }) {
    this.assertConfigured();
    const transporter = this._createTransporter();
    const fromAddr = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const fromName = process.env.EMAIL_FROM_NAME || SmtpEmailAdapter.DEFAULT_FROM_NAME;
    const safeLink = escapeHtml(resetClientUrl);

    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
      to,
      subject: "Reset your KMES School password",
      text: [
        "A password reset was requested for this account.",
        "",
        "Open the link below to choose a new password (valid for one hour):",
        String(resetClientUrl),
        "",
        "If you did not request this, you can safely delete this email.",
      ].join("\n"),
      html: [
        "<p>A password reset was requested for this account.</p>",
        `<p><a href="${safeLink}">Reset your password</a></p>`,
        "<p>This link is valid for one hour. If you did not request this, you can safely delete this email.</p>",
      ].join(""),
    });

    return { ok: true };
  }

  // Phase 20: best-effort security notification (e.g. post password-reset).
  // Generic content only — never any token, password, or reset link.
  async sendSecurityNotification({ to, subject, text }) {
    this.assertConfigured();
    const transporter = this._createTransporter();
    const fromAddr = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const fromName = process.env.EMAIL_FROM_NAME || SmtpEmailAdapter.DEFAULT_FROM_NAME;

    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
      to,
      subject,
      text,
    });

    return { ok: true };
  }
}