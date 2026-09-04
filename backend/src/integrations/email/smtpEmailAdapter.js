// Phase 18C-4 — Production SMTP email adapter (Nodemailer).
//
// Implements the same interface as MockEmailAdapter:
//   sendPasswordReset({ to, resetToken, resetClientUrl }) -> Promise<{ok:true}>
//
// Credentials come ONLY from environment variables (never committed). The raw
// reset token is placed inside the delivered reset URL for the end user and is
// never logged, never stored server-side, and never surfaced in any error path.
//
// Configuration (environment-only):
//   EMAIL_PROVIDER=smtp   (selects this adapter)
//   SMTP_HOST             (required)
//   SMTP_PORT             (default 587; 465 implies implicit TLS)
//   SMTP_USER / SMTP_PASS (both, or neither for an auth-less relay)
//   EMAIL_FROM / EMAIL_FROM_NAME (sender; defaults to SMTP_USER / "KMES School")
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
  // Throws SMTPServiceError when configuration is missing/incomplete. Never
  // throws anything containing secret values.
  assertConfigured() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || user;

    if (!host) {
      throw new SMTPServiceError(
        "SMTP is not configured. Set SMTP_HOST (and SMTP_USER/SMTP_PASS) in the backend environment."
      );
    }
    if ((user && !pass) || (!user && pass)) {
      throw new SMTPServiceError(
        "SMTP credentials are incomplete. Provide both SMTP_USER and SMTP_PASS, or neither."
      );
    }
    if (!from) {
      throw new SMTPServiceError("SMTP sender is not configured. Set EMAIL_FROM or SMTP_USER.");
    }
  }

  _createTransporter() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordReset({ to, resetClientUrl }) {
    this.assertConfigured();
    const transporter = this._createTransporter();
    const fromAddr = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const fromName = process.env.EMAIL_FROM_NAME || "KMES School";
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
}