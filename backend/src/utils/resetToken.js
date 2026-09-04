// Phase 18C-4 — password-reset token primitives (pure and testable offline).
// Extracted from auth.routes.js so the security-critical rules can be verified
// without a live database. No raw token value is ever logged or persisted; only
// the SHA-256 hash is stored. The reset URL is built from the environment's own
// RESET_LINK_BASE so staging and production can never cross-link.
import crypto from "node:crypto";
import { env } from "../config/env.js";

// 32 random bytes -> 43-char URL-safe string (RFC 4648 base64url).
export function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Only a hash is ever stored (single-use bearer secret). SHA-256 of a
// high-entropy random token is appropriate: the token is unguessable, so the
// stored value being one-way is sufficient and lets us compare by re-hashing.
export function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generic success payload so callers cannot tell whether an account exists.
export const GENERIC_RESET_RESPONSE = {
  success: true,
  message: "If that email address is registered, a password reset has been initiated.",
};

// Build the reset link the end user clicks. Uses the configured reset-link base
// (RESET_LINK_BASE, falling back to FRONTEND_URL) so staging and production can
// never cross-link. The raw token travels inside the link for the email provider
// only; it is never stored and never logged.
export function buildResetLink(resetToken) {
  const base = env.resetLinkBase;
  return `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;
}