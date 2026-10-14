import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

// User-management is an administrative concern (users.manage is admin-derived,
// so editors can never reach these handlers). We never trust request-body
// privilege fields: role is validated and honored only here, and a permissions
// array is never accepted from the client.
router.use(requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE));

// Guarantee the system is never left without at least one active administrator,
// preventing accidental lock-out.
const MIN_ADMIN_COUNT = 1;

async function ensureNotLastAdmin(targetUser) {
  if (targetUser.role === "admin") {
    const others = await User.countDocuments({ role: "admin", _id: { $ne: targetUser._id } });
    return others >= MIN_ADMIN_COUNT;
  }
  return true;
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// GET /api/users
router.get("/", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create a new admin/editor account
router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").optional().isIn(["admin", "editor"]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const existing = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      // Build the document from an explicit allow-list. No permissions array
      // is ever accepted from the client.
      const doc = {
        name: String(req.body.name).trim(),
        email: String(req.body.email).toLowerCase().trim(),
        password: req.body.password,
        role: req.body.role === "admin" ? "admin" : "editor",
      };

      const user = await User.create(doc);

      await logActivity({
        req,
        action: "user_create",
        resource: "users",
        resourceId: user._id.toString(),
        resourceLabel: `${user.name} (${user.role})`,
      });

      res.status(201).json({ success: true, data: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id — update name/email/role, or password if provided
router.put("/:id", async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    const update = {};

    // Only whitelisted fields. role is the only privilege field and is only
    // honored because this handler is admin-gated.
    if (name !== undefined && String(name).trim()) {
      if (String(name).trim().length > 100) {
        return res.status(400).json({ success: false, message: "Name must be 100 characters or fewer." });
      }
      update.name = String(name).trim();
    }
    if (email !== undefined && String(email).trim()) {
      const nextEmail = String(email).trim().toLowerCase();
      if (!isEmail(nextEmail)) {
        return res.status(400).json({ success: false, message: "A valid email is required." });
      }
      update.email = nextEmail;
    }
    if (password !== undefined && String(password).length) {
      // Same minimum as account creation and password reset.
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      }
      update.password = password;
    }

    if (role !== undefined) {
      const validRole = role === "admin" ? "admin" : "editor";
      if (req.params.id === req.user.id && validRole !== "admin") {
        return res.status(400).json({
          success: false,
          message: "You cannot remove your own admin role.",
        });
      }
      update.role = validRole;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Refuse to demote an admin if it would leave the system with no admin.
    if (update.role === "editor" && user.role === "admin") {
      const ok = await ensureNotLastAdmin(user);
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: "Cannot demote the last remaining administrator.",
        });
      }
    }

    if (update.email && update.email !== user.email) {
      const taken = await User.exists({ email: update.email, _id: { $ne: user._id } });
      if (taken) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
    }

    // A password or role change must end existing sessions of that user.
    const endSessions = Boolean(update.password) || (update.role && update.role !== user.role);

    Object.assign(user, update);
    if (endSessions) user.authVersion = (user.authVersion || 0) + 1;
    await user.save();

    await logActivity({
      req,
      action: "user_update",
      resource: "users",
      resourceId: user._id.toString(),
      resourceLabel: `${user.name} (${user.role})`,
    });

    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Never delete the last remaining administrator.
    const ok = await ensureNotLastAdmin(user);
    if (!ok) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the last remaining administrator.",
      });
    }

    await user.deleteOne();

    await logActivity({
      req,
      action: "user_delete",
      resource: "users",
      resourceId: user._id.toString(),
      resourceLabel: `${user.name} (${user.role})`,
    });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
