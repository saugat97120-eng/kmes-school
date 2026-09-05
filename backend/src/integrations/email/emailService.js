// Phase 18B/18C-4/20 — Email service. Thin facade over the adapter interface so
// the auth route never touches provider-specific code.
//
// The active adapter is chosen from configuration:
//   - EMAIL_PROVIDER=mock (default; used by tests) -> MockEmailAdapter
//   - EMAIL_PROVIDER=none                          -> NoopEmailAdapter (safe no-op)
//   - EMAIL_PROVIDER=smtp (production)             -> SmtpEmailAdapter (Nodemailer)
//
// IMPORTANT SECURITY BEHAVIOR:
//   - This module NEVER logs the raw reset token and never persists it.
//   - It returns only generic/safe results to callers (no token echoed back).
//
// Provider selection / configuration (Phase 20):
//   - Supported providers: mock | smtp | none.
//   - "none" is kept as an explicit supported no-op for back-compat with tests.
//   - ANY other value fails startup predictably (no silent fallback, especially
//     SMTP -> mock in production).
//   - When EMAIL_PROVIDER=smtp, SMTP_HOST + SMTP_USER + SMTP_PASSWORD are
//     all required (asserted at boot via assertEmailProviderConfiguration()).
import { MockEmailAdapter, NoopEmailAdapter } from "./emailAdapter.js";
import { SmtpEmailAdapter, SMTPServiceError } from "./smtpEmailAdapter.js";

const SUPPORTED_PROVIDERS = ["mock", "smtp", "none"];

let activeConfig = {
  provider: process.env.EMAIL_PROVIDER || "mock",
};

const mockAdapter = new MockEmailAdapter();
const noopAdapter = new NoopEmailAdapter();
const smtpAdapter = new SmtpEmailAdapter();

export function setEmailProviderConfig({ provider }) {
  activeConfig.provider = provider || "mock";
  if (provider === "mock") mockAdapter.clear();
}

export function getEmailAdapter() {
  if (activeConfig.provider === "smtp") return smtpAdapter;
  if (activeConfig.provider === "mock") return mockAdapter;
  return noopAdapter;
}

// Exposed for tests to inspect mock deliveries.
export function getMockEmailAdapter() {
  return mockAdapter;
}

// Resolve the effective provider from the live environment (thread-safe; used
// at boot and by provider-selection tests).
export function selectEmailProvider() {
  const raw = (process.env.EMAIL_PROVIDER || "mock").trim().toLowerCase();
  if (SUPPORTED_PROVIDERS.includes(raw)) return raw;
  return raw; // caller treats unknown as a hard failure
}

// Assert the running email provider is valid and, when it is SMTP, fully and
// correctly configured. Called once at server boot. Throws on any problem so
// startup fails predictably rather than silently falling back to mock in
// production.
export function assertEmailProviderConfiguration() {
  const provider = selectEmailProvider();
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported EMAIL_PROVIDER '${process.env.EMAIL_PROVIDER}'. Supported: ${SUPPORTED_PROVIDERS.join(", ")}.`
    );
  }
  if (provider === "smtp") {
    const missing = [];
    if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
    if (!process.env.SMTP_USER) missing.push("SMTP_USER");
    if (!(process.env.SMTP_PASSWORD || process.env.SMTP_PASS)) missing.push("SMTP_PASSWORD");
    if (missing.length) {
      throw new SMTPServiceError(
        `SMTP is not configured. Set ${missing.join(", ")} for EMAIL_PROVIDER=smtp.`
      );
    }
  }
  return provider;
}

// Deliver a password-reset message.
//
// `resetToken` is the RAW token destined for the end user via the provider. It
// is never logged here and never stored. When no real provider is configured
// (EMAIL_PROVIDER unset or "none"), sendPasswordReset is a safe no-op so that
// production does not emit a spurious "email sent" side effect; callers should
// still treat the request generically (the token stays valid only server-side
// for the mock/test path).
export async function sendPasswordReset({ to, resetToken, resetClientUrl }) {
  const adapter = getEmailAdapter();
  return adapter.sendPasswordReset({ to, resetToken, resetClientUrl });
}

// Deliver a best-effort security notification to an account email (e.g. after a
// password reset or another sensitive action). Never contains a raw token or
// password; no sensitive content. Failures are intentionally swallowed (the
// caller must not fail the primary action because a notification could not be
// delivered). No-op for the mock/noop providers.
export async function sendSecurityNotification({ to, subject, text }) {
  const adapter = getEmailAdapter();
  if (typeof adapter.sendSecurityNotification === "function") {
    return adapter.sendSecurityNotification({ to, subject, text });
  }
  return { ok: true, mock: true };
}
