import express from "express";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { getPermissionsForRole } from "../permissions.js";

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
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

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
