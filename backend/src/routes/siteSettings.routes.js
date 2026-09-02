import express from "express";
import SiteSettings from "../models/SiteSettings.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

async function getDefaultSettings() {
  const existing = await SiteSettings.findOne().sort({ createdAt: -1 });
  if (existing) return existing;

  const created = await SiteSettings.create({});
  return created;
}

router.get("/", async (req, res, next) => {
  try {
    const settings = await getDefaultSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/all", requireAuth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res, next) => {
  try {
    const items = await SiteSettings.find().sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res, next) => {
  try {
    const existing = await SiteSettings.findOne();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Site settings already exist. Edit the current record instead of creating a new one.",
      });
    }

    const item = await SiteSettings.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res, next) => {
  try {
    const item = await SiteSettings.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Site settings not found" });
    }

    await logActivity({ req, action: "settings_update", resource: "site-settings" });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res, next) => {
  try {
    const item = await SiteSettings.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Site settings not found" });
    }

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
