import express from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { getPermissionsForRole } from "../permissions.js";
import { env } from "../config/env.js";
import {
  sendPasswordReset,
  getMockEmailAdapter,
  getEmailAdapter,
} from "../integrations/email/emailService.js";

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

// Cryptographically secure random token. 32 random bytes -> 43-char URL-safe
// string (see RFC 4648). Never persisted in plaintext.
function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Only a hash of the token is ever stored in MongoDB (a single-use bearer
// secret). SHA-256 of a high-entropy random token is appropriate here because
// the token is unguessable; this keeps the stored value one-way and lets us
// compare by re-hashing the presented token.
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generic success payload so callers cannot tell whether an account exists.
const GENERIC_RESET_RESPONSE = {
  success: true,
  message: "If that email address is registered, a password reset has been initiated.",
};

// Build the reset link the end user clicks. Uses the configured reset-link base
// (RESET_LINK_BASE, falling back to FRONTEND_URL) so staging and production can
// never cross-link; the raw token is carried in the link for the provider to
// deliver, is never stored, and is never logged.
function buildResetLink(resetToken) {
  const base = env.resetLinkBase;
  return `${base}/reset-password?token=${encodeURIComponent(resetToken)}`;
}

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
        const provider = getEmailAdapter();
        await sendPasswordReset({
          to: email,
          resetToken,
          resetClientUrl: buildResetLink(resetToken),
        });
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

      res.json({ success: true, message: "Password has been reset. Please log in with your new password." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/register
// Bootstrap rule: if no users exist yet, registration is open (so you can
// create your first admin account). Once at least one user exists, creating
// another account requires a valid token from an existing admin — this
// prevents strangers from registering themselves as admin after launch.
router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userCount = await User.countDocuments();

      if (userCount > 0) {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        let requester = null;
        try {
          requester = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
        } catch {
          requester = null;
        }
        // Resolve the CURRENT role from the database, not the (possibly stale)
        // JWT role, so a demoted user cannot bootstrap new admin accounts.
        if (requester) {
          const dbUser = await User.findById(requester.id).select("role");
          requester = dbUser ? { ...requester, role: dbUser.role } : null;
        }
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Registration is closed. Ask an existing admin to create your account.",
          });
        }
      }

      const existing = await User.findOne({ email: req.body.email });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      // First-ever account is always an admin, regardless of what's sent.
      const role = userCount === 0 ? "admin" : req.body.role === "editor" ? "editor" : "admin";

      const user = await User.create({ ...req.body, role });
      res.status(201).json({
        success: true,
        token: signToken(user),
        user: publicUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      let user = await User.findOne({ email: req.body.email }).select("+password");

      if (!user) {
        const developmentAdmin = await ensureDevelopmentAdminUser();
        if (developmentAdmin && developmentAdmin.email === req.body.email.toLowerCase()) {
          user = developmentAdmin;
        }
      }

      if (!user || !(await user.comparePassword(req.body.password))) {
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
