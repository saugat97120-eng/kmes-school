import express from "express";
import PageContent from "../models/PageContent.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";
import { sanitizePageContent } from "../utils/cmsValidation.js";

const router = express.Router();

router.get("/admin/all", requireAuth, requirePermission(PERMISSIONS.PAGES_VIEW), async (req, res, next) => {
  try {
    const pages = await PageContent.find().sort({ slug: 1 });
    res.json({ success: true, count: pages.length, data: pages });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const slug = req.query.slug;
    if (slug) {
      const page = await PageContent.findOne({ slug, published: true }).lean();
      return res.json({ success: true, data: page || null });
    }

    const pages = await PageContent.find({ published: true }).sort({ updatedAt: -1 });
    res.json({ success: true, count: pages.length, data: pages });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.PAGES_EDIT), async (req, res, next) => {
  try {
    // Phase 18C: explicit allow-list + type/URL validation. A slug is required
    // on create; it is trimmed+lowercased so duplicates can't be sneaked in via
    // case or whitespace tricks.
    const result = sanitizePageContent(req.body, { requireSlug: true });
    if (!result.ok) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors: result.errors });
    }
    const payload = result.payload;

    const existing = await PageContent.findOne({ slug: payload.slug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A page with this slug already exists. Edit it instead.",
      });
    }

    const page = await PageContent.create(payload);
    await logActivity({
      req,
      action: "create",
      resource: "page-content",
      resourceId: page._id.toString(),
      resourceLabel: page.slug,
    });
    res.status(201).json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.PAGES_EDIT), async (req, res, next) => {
  try {
    const result = sanitizePageContent(req.body);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors: result.errors });
    }
    const payload = result.payload;

    if (payload.slug) {
      const conflicting = await PageContent.findOne({
        slug: payload.slug,
        _id: { $ne: req.params.id },
      });
      if (conflicting) {
        return res.status(409).json({
          success: false,
          message: "A page with this slug already exists.",
        });
      }
    }

    const page = await PageContent.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    await logActivity({
      req,
      action: "update",
      resource: "page-content",
      resourceId: page._id.toString(),
      resourceLabel: page.slug,
    });

    res.json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.PAGES_EDIT), async (req, res, next) => {
  try {
    const page = await PageContent.findByIdAndDelete(req.params.id);
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    await logActivity({
      req,
      action: "delete",
      resource: "page-content",
      resourceId: page._id.toString(),
      resourceLabel: page.slug,
    });

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
