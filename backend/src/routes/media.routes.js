import express from "express";
import Media from "../models/Media.js";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { isR2Configured, deleteFromR2 } from "../config/r2.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const router = express.Router();

// GET /api/media?q=search
router.get("/", requireAuth, requirePermission(PERMISSIONS.MEDIA_VIEW), async (req, res, next) => {
  try {
    const { q, page = 1, limit = 40 } = req.query;
    const filter = {};
    if (q) filter.filename = { $regex: escapeRegex(q), $options: "i" };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Media.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: items,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/media/:id — admin only, removes from Cloudinary and the library
router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.MEDIA_DELETE), async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (media.publicId) {
      if (media.publicId.startsWith("media/") || isR2Configured()) {
        try {
          await deleteFromR2(media.publicId);
        } catch (err) {
          console.error("R2 delete failed:", err.message);
        }
      }
      if (isCloudinaryConfigured()) {
        try {
          await cloudinary.uploader.destroy(media.publicId, { resource_type: "image" });
        } catch (err) {
          console.error("Cloudinary delete failed:", err.message);
        }
      }
    }

    await media.deleteOne();

    await logActivity({
      req,
      action: "delete",
      resource: "media",
      resourceId: media._id.toString(),
      resourceLabel: media.filename,
    });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
