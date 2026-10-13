import express from "express";
import SiteSettings from "../models/SiteSettings.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";
import { sanitizeSiteSettings } from "../utils/cmsValidation.js";

const router = express.Router();

async function getOrCreateSettings() {
  const existing = await SiteSettings.findOne().sort({ createdAt: -1 });
  if (existing) return existing;
  return await SiteSettings.create({});
}

function formatLeadershipResponse(settings) {
  return {
    principal: {
      name: settings.principalName || "Principal",
      designation: settings.principalTitle || "Principal",
      message: settings.principalMessage || "",
      photoUrl: settings.principalPhoto || "",
      updatedAt: settings.updatedAt,
    },
    director: {
      name: settings.directorName || "Director",
      designation: settings.directorTitle || "Director",
      message: settings.directorMessage || "",
      photoUrl: settings.directorPhoto || "",
      updatedAt: settings.updatedAt,
    },
    updatedAt: settings.updatedAt,
  };
}

// GET /api/leadership - Public endpoint for leadership profiles
router.get("/", async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      success: true,
      data: formatLeadershipResponse(settings),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/leadership - Admin-only update for leadership profiles
router.put("/", requireAuth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    // Map nested leadership structure or flat structure to SiteSettings fields
    const payload = {};
    const body = req.body || {};

    if (body.principal) {
      if (body.principal.name !== undefined) payload.principalName = String(body.principal.name).trim();
      if (body.principal.designation !== undefined) payload.principalTitle = String(body.principal.designation).trim();
      if (body.principal.title !== undefined) payload.principalTitle = String(body.principal.title).trim();
      if (body.principal.message !== undefined) payload.principalMessage = String(body.principal.message).trim();
      if (body.principal.photoUrl !== undefined) payload.principalPhoto = String(body.principal.photoUrl).trim();
      if (body.principal.photo !== undefined) payload.principalPhoto = String(body.principal.photo).trim();
    }
    if (body.director) {
      if (body.director.name !== undefined) payload.directorName = String(body.director.name).trim();
      if (body.director.designation !== undefined) payload.directorTitle = String(body.director.designation).trim();
      if (body.director.title !== undefined) payload.directorTitle = String(body.director.title).trim();
      if (body.director.message !== undefined) payload.directorMessage = String(body.director.message).trim();
      if (body.director.photoUrl !== undefined) payload.directorPhoto = String(body.director.photoUrl).trim();
      if (body.director.photo !== undefined) payload.directorPhoto = String(body.director.photo).trim();
    }

    // Support flat fields as well
    const flatKeys = [
      "principalName",
      "principalTitle",
      "principalPhoto",
      "principalMessage",
      "directorName",
      "directorTitle",
      "directorPhoto",
      "directorMessage",
    ];
    for (const key of flatKeys) {
      if (body[key] !== undefined) {
        payload[key] = String(body[key]).trim();
      }
    }

    // Pass through sanitizer to ensure safe URLs and types
    const validation = sanitizeSiteSettings(payload);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors,
      });
    }

    const updated = await SiteSettings.findByIdAndUpdate(settings._id, validation.payload, {
      new: true,
      runValidators: true,
    });

    await logActivity({
      req,
      action: "settings_update",
      resource: "leadership",
      resourceId: updated._id.toString(),
      resourceLabel: "Leadership Profiles",
    });

    res.json({
      success: true,
      message: "Leadership profiles updated successfully.",
      data: formatLeadershipResponse(updated),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
