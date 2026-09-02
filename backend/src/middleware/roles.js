// Role-based access control middleware. Use after requireAuth, which attaches
// req.user (decoded JWT payload: { id, role, name }).
//
// The single source of truth for role -> permission resolution is the
// centralized permission module (../permissions.js). This file only wires
// permissions into Express middleware. Do NOT redefine role permissions here.

import {
  PERMISSIONS,
  roleHasPermission,
} from "../permissions.js";

// Loaded lazily to avoid any import-order coupling with the User model.
let UserModel = null;
async function getUserModel() {
  if (!UserModel) {
    const { default: model } = await import("../models/User.js");
    UserModel = model;
  }
  return UserModel;
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}

// Permission gate.
//
// Resolves the CURRENT role from the database rather than trusting the role
// embedded in the JWT. This guarantees that a role change (e.g. an admin
// demoted to editor) or a deleted user takes effect immediately — no stale
// token keeps elevated privileges until expiry. The JWT still authenticates
// the request; the database record authorizes it.
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const User = await getUserModel();
      const user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      if (!roleHasPermission(user.role, permission)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      // Reflect the current role for any downstream logic/logging.
      req.user.role = user.role;
      req.user.name = user.name;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Role-level gates (genuinely role-specific operations).
export const requireAdmin = requireRole("admin");
export const requireEditor = requireRole("admin", "editor");

// Permission-level gates (preferred). These map the granular permission set
// onto commonly used operations. New callers should prefer requirePermission
// with an explicit permission name over these convenience helpers.
export const requireContentManager = requirePermission(PERMISSIONS.CONTENT_EDIT);
export const requireContentCreator = requirePermission(PERMISSIONS.CONTENT_CREATE);
export const requireContentPublisher = requirePermission(PERMISSIONS.CONTENT_PUBLISH);
export const requireContentDeleter = requirePermission(PERMISSIONS.CONTENT_DELETE);
export const requireTrashViewer = requirePermission(PERMISSIONS.TRASH_VIEW);
export const requireTrashRestorer = requirePermission(PERMISSIONS.TRASH_RESTORE);
export const requireTrashDeleter = requirePermission(PERMISSIONS.TRASH_DELETE);
export const requireUserManager = requirePermission(PERMISSIONS.USERS_MANAGE);
export const requireMediaViewer = requirePermission(PERMISSIONS.MEDIA_VIEW);
export const requireMediaUploader = requirePermission(PERMISSIONS.MEDIA_UPLOAD);
export const requireMediaDeleter = requirePermission(PERMISSIONS.MEDIA_DELETE);
export const requireAttachmentManager = requirePermission(PERMISSIONS.ATTACHMENTS_UPLOAD);
export const requireAttachmentDeleter = requirePermission(PERMISSIONS.ATTACHMENTS_DELETE);

export { PERMISSIONS };
