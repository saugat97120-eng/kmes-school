import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { getPermissionsForRole } from "../permissions.js";
import {
  generateResetToken,
  hashResetToken,
  buildResetLink,
  GENERIC_RESET_RESPONSE,
} from "../utils/resetToken.js";
import { sendPasswordReset, sendSecurityNotification } from "../integrations/email/emailService.js";
import { env } from "../config/env.js";
import {
  GENERIC_REGISTRATION_DENIED,
  isAuthorizedBootstrapEmail,
  normalizeEmail,
  tryAcquireBootstrapLock,
  releaseBootstrapLock,
} from "../utils/adminBootstrap.js";

const router = express.Router();

// Safe authorization payload. NEVER expose the full Mongoose document here
// (no password hashes, reset tokens, or internal security fields).
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: getPermissionsForRole(user.role),
  };
}

async function ensureDevelopmentAdminUser() {
  if (process.env.NODE_ENV !== "development") return null;

  const email = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEV_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name: "Development Admin",
      email,
      password,
      role: "admin",
    });
  } else {
    user.name = user.name || "Development Admin";
    user.role = "admin";
    user.password = password;
    await user.save();
  }

  return user;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, authVersion: user.authVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// --- Phase 18B: secure password reset --------------------------------------
// Token generation, hashing, the generic response, and reset-link construction
// live in src/utils/resetToken.js (pure + unit-tested offline). The route below
// orchestrates storage, delivery, and invalidation only.

// POST /api/auth/forgot-password
// Always returns the generic response. Generates a token + stores its hash ONLY
// for an existing account. No account enumeration. Rate limited via the existing
// /api/auth limiter (express-rate-limit in server.js).
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Still generic: we do not reveal whether the email matched; validation
        // failures for a malformed email are safe and expected.
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const email = String(req.body.email).trim().toLowerCase();

      // Normalize by existence check exactly once; the response is identical
      // whether the user exists or not.
      let user = null;
      try {
        user = await User.findOne({ email });
      } catch {
        return res.status(200).json(GENERIC_RESET_RESPONSE);
      }

      if (user) {
        const resetToken = generateResetToken();
        user.passwordResetTokenHash = hashResetToken(resetToken);
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save({ validateBeforeSave: false });

        // Deliver via the email abstraction. Never logs the raw token.
        // Phase 18C-4: if the provider fails (e.g. SMTP not configured /
        // unreachable), STILL return the generic response so account existence
        // and the token are never revealed. Only safe diagnostics are logged.
        try {
          await sendPasswordReset({
            to: email,
            resetToken,
            resetClientUrl: buildResetLink(resetToken),
          });
        } catch (err) {
          console.error("Password reset email delivery failed:", err.message);
        }
      }

      return res.status(200).json(GENERIC_RESET_RESPONSE);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
// Body: { token, password }.
// Rejects expired / invalid / already-used tokens. Enforces the existing
// password policy (min 6). On success re-hashes via the existing bcrypt strategy,
// clears the reset fields, and bumps authVersion so previously issued JWTs are
// invalidated. Generic errors except for explicit policy violations.
router.post(
  "/reset-password",
  [
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const rawToken = req.body.token ? String(req.body.token).trim() : "";
      const password = req.body.password;
      if (!rawToken) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      // Never accept a token that has already been used or that has expired.
      const hash = hashResetToken(rawToken);
      const user = await User.findOne({ passwordResetTokenHash: hash }).select("+password");

      if (!user) {
        // No such active token (invalid or already used — the record is cleared
        // on success, so a used token no longer matches).
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      if (!user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      // Enforce the audited minimum password policy.
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }

      // Apply the new password using the existing bcrypt pre-save strategy, then
      // clear the reset token (single-use) and bump the session version so all
      // previously issued JWTs for this user stop working.
      user.password = password;
      user.passwordResetTokenHash = null;
      user.passwordResetExpires = null;
      await user.bumpAuthVersion();
      await user.save();

      // Phase 20: best-effort security notification. Failures are swallowed so
      // a non-delivered notification never fails the reset itself. No token or
      // password content is ever included.
      try {
        await sendSecurityNotification({
          to: user.email,
          subject: "Your KMES School password was changed",
          text: "The password for your KMES School account was reset. "
            + "If you did not do this, contact an administrator immediately.",
        });
      } catch (err) {
        console.error("Security notification email delivery failed:", err.message);
      }

      res.json({ success: true, message: "Password has been reset. Please log in with your new password." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/register
// Phase 20 — First-admin bootstrap. Public registration creates a user ONLY when
// ALL of the following hold:
//   - ALLOW_ADMIN_BOOTSTRAP === true (strict literal "true")
//   - The database currently has ZERO users
//   - The submitted (normalized) email === ADMIN_BOOTSTRAP_EMAIL
//   - The payload is valid (name/email/password)
//
// Any other request (flag off, wrong email, users already exist, invalid body
// that fails express-validator) returns an IDENTICAL generic 403 so the service
// never leaks whether bootstrap is enabled, whether the email is authorized, or
// whether an account already exists. The first user is ALWAYS forced to role
// "admin", regardless of what the client sends.
//
// Concurrency: acquiring a unique-indexed lock guarantees exactly one request
// creates the first admin even under simultaneous attempts. On success the lock
// is kept (the open window is permanently closed); on failure it is released
// best-effort so a retry against an empty DB can still succeed.
router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    try {
      // Validation failures are safe to return as 400 (malformed input reveals
      // nothing about authorization or user count).
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Bootstrap must be explicitly enabled AND the email must be authorized
      // (case-insensitive). Nothing else about this comparison is revealed.
      const email = normalizeEmail(req.body.email);
      if (!env.allowAdminBootstrap || !isAuthorizedBootstrapEmail(email)) {
        return res.status(403).json(GENERIC_REGISTRATION_DENIED);
      }

      // The database must have zero users. This re-check happens AFTER acquiring
      // the lock so two racing requests cannot both observe zero and both create.
      const acquired = await tryAcquireBootstrapLock();
      if (!acquired) {
        return res.status(403).json(GENERIC_REGISTRATION_DENIED);
      }

      let created = false;
      try {
        const userCount = await User.countDocuments();
        if (userCount > 0) {
          return res.status(403).json(GENERIC_REGISTRATION_DENIED);
        }

        const existing = await User.findOne({ email });
        if (existing) {
          return res.status(403).json(GENERIC_REGISTRATION_DENIED);
        }

        // First-ever account is ALWAYS an admin, regardless of what's sent.
        const user = await User.create({
          name: req.body.name,
          email,
          password: req.body.password,
          role: "admin",
        });
        created = true;
        return res.status(201).json({
          success: true,
          token: signToken(user),
          user: publicUser(user),
        });
      } finally {
        // On success the lock stays (window closed forever). Only a failed
        // creation (no admin persisted) releases it so an empty-DB retry can work.
        if (!created) {
          const stillEmpty = (await User.countDocuments()) === 0;
          if (stillEmpty) {
            await releaseBootstrapLock();
          }
        }
      }
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [body("email").isString().trim().isEmail(), body("password").isString().notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const loginEmail = String(req.body.email).trim().toLowerCase();
      let user = await User.findOne({ email: loginEmail }).select("+password");

      if (!user) {
        const developmentAdmin = await ensureDevelopmentAdminUser();
        if (developmentAdmin && developmentAdmin.email === loginEmail) {
          user = developmentAdmin;
        }
      }

      // Constant-time check: always perform a bcrypt comparison even when the user
      // does not exist, preventing timing analysis from leaking account existence.
      const DUMMY_HASH = "$2b$10$wT8vM97XvY5w2K3p5Y9T2O1M6K5J4L3H2G1F0E9D8C7B6A5Z4Y3X2";
      const passwordValid = user
        ? await user.comparePassword(req.body.password)
        : await bcrypt.compare(String(req.body.password), DUMMY_HASH);

      if (!user || !passwordValid) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      res.json({
        success: true,
        token: signToken(user),
        user: publicUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
// Returns the safe authorization payload (role + effective permissions). The
// frontend derives its authorization info from THIS authoritative response.
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
