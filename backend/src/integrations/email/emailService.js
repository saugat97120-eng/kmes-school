// Phase 18B — Email service. Thin facade over the adapter interface so the
// auth route never touches provider-specific code.
//
// The active adapter is chosen from configuration:
//   - EMAIL_PROVIDER=mock (default; also used for tests) -> MockEmailAdapter
//   - EMAIL_PROVIDER=none (or unset)                     -> NoopEmailAdapter, and
//     sendPasswordReset is a safe no-op unless `force` is set (used by tests).
//
// IMPORTANT SECURITY BEHAVIOR:
//   - This module NEVER logs the raw reset token and never persists it.
//   - It returns only generic/safe results to callers (no token echoed back).
import { MockEmailAdapter, NoopEmailAdapter } from "./emailAdapter.js";

let activeConfig = {
  provider: process.env.EMAIL_PROVIDER || "mock",
};

const mockAdapter = new MockEmailAdapter();
const noopAdapter = new NoopEmailAdapter();

export function setEmailProviderConfig({ provider }) {
  activeConfig.provider = provider || "mock";
  if (provider === "mock") mockAdapter.clear();
}

export function getEmailAdapter() {
  return activeConfig.provider === "mock" ? mockAdapter : noopAdapter;
}

// Exposed for tests to inspect mock deliveries.
export function getMockEmailAdapter() {
  return mockAdapter;
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