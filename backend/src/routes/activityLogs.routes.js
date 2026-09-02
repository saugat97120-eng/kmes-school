import express from "express";
import ActivityLog from "../models/ActivityLog.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";

const router = express.Router();

// GET /api/activity-logs?page=1&limit=50&resource=notices&action=delete
router.get("/", requireAuth, requirePermission(PERMISSIONS.ACTIVITY_LOGS_VIEW), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, resource, action } = req.query;
    const filter = {};
    if (resource) filter.resource = resource;
    if (action) filter.action = action;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      ActivityLog.countDocuments(filter),
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

export default router;
