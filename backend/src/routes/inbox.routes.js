// Phase 8 — Content Inbox API.
//
// A centralized read view across all content resources. Reuses the existing
// workflow vocabulary (status/source), the existing ActivityLog for history
// and authorship, and the existing Phase 7 workflow endpoints for review
// actions (approve/reject). This file adds NO authority of its own: approve/
// reject still route through the per-resource workflow handlers that enforce
// content.approve / content.reject.
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import { WORKFLOW_STATUS, VALID_STATUSES } from "../workflow/workflow.js";
import {
  CONTENT_TYPES,
  buildInboxFilter,
  searchFieldsFor,
  toInboxItem,
  priorityOf,
  waitingSince,
} from "../utils/inbox.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/inbox/stats — cross-tab counts: per status x per resource.
// Gated: content.view (any authenticated content manager may see counters).
// ---------------------------------------------------------------------------
router.get("/stats", requireAuth, requirePermission(PERMISSIONS.CONTENT_VIEW), async (req, res, next) => {
  try {
    const statuses = VALID_STATUSES;
    const byType = {};
    const totals = Object.fromEntries(statuses.map((s) => [s, 0]));

    for (const { type, Model } of CONTENT_TYPES) {
      const row = Object.fromEntries(statuses.map((s) => [s, 0]));
      const jobs = statuses.map((s) =>
        Model.countDocuments({ deletedAt: null, status: s }).then((n) => (row[s] = n))
      );
      // Legacy published-only docs (status absent) fold into the published bucket.
      jobs.push(
        Model.countDocuments({ deletedAt: null, status: { $exists: false }, published: true }).then((n) => {
          row[WORKFLOW_STATUS.PUBLISHED] += n;
        })
      );
      await Promise.all(jobs);
      const trashed = await Model.countDocuments({ deletedAt: { $ne: null } }).then((n) => n);
      byType[type] = { ...row, trashed, total: statuses.reduce((a, s) => a + row[s], 0) };
      for (const s of statuses) totals[s] += row[s];
    }

    res.json({ success: true, data: { totals, byType } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/inbox — paginated cross-resource list with filters + priority sort.
// Query params: status, type, source, q, createdBy, before, after, page, limit.
// Gated: content.view.
// ---------------------------------------------------------------------------
router.get("/", requireAuth, requirePermission(PERMISSIONS.CONTENT_VIEW), async (req, res, next) => {
  try {
    const { status, type, source, q, createdBy, before, after } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    // Optional early @Query filter by resource type.
    const types = type ? CONTENT_TYPES.filter((t) => t.type === type) : CONTENT_TYPES;

    // "Created By" filter: resolve the creator list from ActivityLog create
    // events for the given user (matched by id or name), then restrict to items.
    let idRestriction = null;
    if (createdBy) {
      const user = await User.findOne({
        $or: [{ _id: /^[0-9a-f]{24}$/i.test(createdBy) ? createdBy : undefined }, { name: createdBy }].filter((v) => v !== undefined),
      }).select("_id name").lean();
      const createQuery = { action: "create" };
      if (user) createQuery.user = user._id;
      else createQuery.userName = createdBy;
      const creates = await ActivityLog.find(createQuery).select("resourceId").lean();
      idRestriction = new Set(creates.map((c) => c.resourceId));
    }

    // Fetch a bounded window from each resource, then merge and sort by priority.
    const perResourceCap = Math.min(limitNum * 3, 500);
    const all = [];
    for (const { type: t, Model } of types) {
      const filter = buildInboxFilter({ status, source, q, createdBy, before, after, searchFields: searchFieldsFor(t) });
      const docs = await Model.find(filter)
        .sort({ createdAt: -1 })
        .limit(perResourceCap)
        .lean();
      for (const doc of docs) {
        const item = toInboxItem(t, doc);
        if (idRestriction && !idRestriction.has(item._id)) continue;
        all.push(item);
      }
    }

    // Author map: single ActivityLog query for create events -> userId -> name.
    const ids = all.map((i) => i._id);
    const authorMap = {};
    if (ids.length) {
      const creates = await ActivityLog.find({
        action: "create",
        resourceId: { $in: ids },
      }).select("resourceId user userName").lean();
      for (const c of creates) {
        if (!authorMap[c.resourceId]) {
          authorMap[c.resourceId] = c.userName || "System";
        }
      }
    }

    for (const item of all) item.createdBy = item.createdBy || authorMap[item._id] || "System";

    // Priority sort: pending/rejected/draft/approved/published, oldest-first within priority.
    all.sort((a, b) => {
      const pa = priorityOf(a.status);
      const pb = priorityOf(b.status);
      if (pa !== pb) return pa - pb;
      return waitingSince(a) - waitingSince(b);
    });

    const total = all.length;
    const pageItems = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      count: pageItems.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      filters: { status, type, source, q, createdBy, before, after },
      data: pageItems,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/inbox/item/:type/:id — full document for the review workspace.
// Returns the raw doc (title, content, description, attachments, workflow
// metadata, author from ActivityLog). Gated: content.view.
// ---------------------------------------------------------------------------
router.get("/item/:type/:id", requireAuth, requirePermission(PERMISSIONS.CONTENT_VIEW), async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const entry = CONTENT_TYPES.find((t) => t.type === type);
    if (!entry) {
      return res.status(400).json({ success: false, message: "Unknown content type." });
    }
    const doc = await entry.Model.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const create = await ActivityLog.findOne({ resource: type, resourceId: id, action: "create" }).select("userName user").lean();
    res.json({
      success: true,
      data: {
        ...doc.toObject(),
        createdBy: create ? (create.userName || "System") : "System",
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/inbox/history/:type/:id — activity history for one content item.
// Reuses ActivityLog (no duplicate history system). Gated: content.view.
// ---------------------------------------------------------------------------
router.get("/history/:type/:id", requireAuth, requirePermission(PERMISSIONS.CONTENT_VIEW), async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const exists = CONTENT_TYPES.some((t) => t.type === type);
    if (!exists) {
      return res.status(400).json({ success: false, message: "Unknown content type." });
    }

    const entries = await ActivityLog.find({ resource: type, resourceId: id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    next(err);
  }
});

export default router;