// Phase 20 — First-admin bootstrap utilities.
//
// When ALLOW_ADMIN_BOOTSTRAP=true AND the database has zero users AND the
// submitted email matches the configured ADMIN_BOOTSTRAP_EMAIL, a single
// bootstrap registration is permitted. A unique-key lock in MongoDB ensures
// exactly one request can create the first admin, even under heavy concurrency.
//
// Security rules:
//   - Only the literal string "true" enables bootstrap ("1"/"yes" → false).
//   - The authorized email is compared case-insensitively.
//   - All denied responses return an identical generic message so attackers
//     cannot distinguish between "flag off", "wrong email", and "already done".
//   - The first user is ALWAYS assigned role "admin" regardless of what the
//     client sends.
//   - After the first user is created, registration is closed for ALL emails
//     (including the bootstrap email) even if the flag remains true.
import mongoose from "mongoose";
import { env } from "../config/env.js";

// Constant generic response — never reveals whether the request was for the
// bootstrap email, whether the flag is set, or whether a user already exists.
export const GENERIC_REGISTRATION_DENIED = Object.freeze({
  success: false,
  message: "Registration is temporarily unavailable.",
});

// Normalize email to lowercase + trimmed for comparison. The User schema uses
// `lowercase: true` so all stored emails are already lowercase; this ensures
// the bootstrap authorization check is case-insensitive.
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Check whether the submitted email matches the configured bootstrap email.
export function isAuthorizedBootstrapEmail(email) {
  return normalizeEmail(email) === normalizeEmail(env.adminBootstrapEmail);
}

// Concurrency guard: the first request to insert a unique key wins the bootstrap
// lock. Subsequent requests receive false. The lock document is never removed on
// success (it permanently disables the open window). If user creation fails after
// the lock is acquired, the lock is released so a retry with a different email
// can still succeed — but only if the database is still empty.
const LOCK_KEY = "admin-bootstrap";

export async function tryAcquireBootstrapLock() {
  const collection = mongoose.connection.db.collection("admin_bootstrap_locks");
  // createIndex is idempotent; safe to call on every request.
  await collection.createIndex({ key: 1 }, { unique: true, background: false });
  try {
    await collection.insertOne({ key: LOCK_KEY, createdAt: new Date() });
    return true; // lock acquired
  } catch (err) {
    if (err.code === 11000) return false; // duplicate key — another request won
    throw err; // unexpected DB error
  }
}

// Release the lock on failure so a subsequent request can retry. Only meaningful
// when the database is confirmed empty (the caller checks before calling).
export async function releaseBootstrapLock() {
  try {
    const collection = mongoose.connection.db.collection("admin_bootstrap_locks");
    await collection.deleteOne({ key: LOCK_KEY });
  } catch {
    // Best-effort — if release fails the window stays closed. Acceptable.
  }
}
