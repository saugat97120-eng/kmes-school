// Phase 18B — Email provider abstraction (adapter interface).
//
// The authentication layer depends only on this small interface, never on a
// concrete SMTP/provider implementation:
//
//   sendPasswordReset({ to, resetToken, resetClientUrl }) -> Promise<void>
//
// - Never sent "for real" in this phase.
// - The mock adapter records delivery requests IN MEMORY ONLY for tests to
//   inspect; it does NOT write to disk, does NOT console.log, and does NOT
//   persist any raw token to stable storage.
//
// A future production provider (SMTP/Resend/SendGrid/...) would implement the
// same interface without changing the auth route logic.

export class MockEmailAdapter {
  constructor() {
    this.deliveries = [];
  }

  get deliveriesWasCleared() {
    return this.deliveries.length === 0;
  }

  clear() {
    this.deliveries.length = 0;
    this.securityNotifications = [];
  }

  // Never performs a real email send. Records a sanitized delivery record for
  // automated verification only. The raw token is NOT logged and is NOT written
  // to stable storage. We keep the token only transiently in memory for tests
  // that must complete a reset end-to-end.
  async sendPasswordReset({ to, resetToken, resetClientUrl }) {
    this.deliveries.push({ to, resetToken, resetClientUrl });
    return { ok: true, mock: true };
  }

  // Phase 20: security notifications (e.g. post-reset). Recorded separately so
  // tests can assert they fire without corrupting password-reset counts.
  async sendSecurityNotification({ to, subject, text }) {
    this.securityNotifications = this.securityNotifications || [];
    this.securityNotifications.push({ to, subject, text });
    return { ok: true, mock: true };
  }

  _count() {
    return this.deliveries.length;
  }
}

// Placeholder for a future real provider. Kept as a stub so wiring is explicit
// and no real SMTP credentials are required in this phase. The auth route calls
// this interface; the active adapter is selected from configuration.
export class NoopEmailAdapter {
  async sendPasswordReset({ to }) {
    // Intentionally does nothing (production provider not configured yet).
    return { ok: true, mock: true };
  }

  async sendSecurityNotification() {
    // Intentionally does nothing.
    return { ok: true, mock: true };
  }
}