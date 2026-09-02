// Phase 9 — Facebook integration routes (IMPORT ONLY).
//
// All protected endpoints use requireAuth + requirePermission with the existing
// SOCIAL_* granular permissions. Facebook is exclusively an import source —
// there is no publishing/auto-publish endpoint here, and nothing can set
// content to a non-draft state.
//
// Backend authorization is authoritative; the frontend permission checks are UX
// only.
import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../../middleware/roles.js";
import {
  isFacebookConfigured,
} from "./facebookAdapter.js";
import {
  getStatus,
  testConnection,
  listPosts,
  getPostById,
  importSelectedPosts,
  sync,
  publishContent,
  FacebookError,
} from "./facebookService.js";

const router = express.Router();

function handleError(res, next, err, safeMessage) {
  if (err instanceof FacebookError) {
    return res.status(400).json({ success: false, message: err.message, code: err.code });
  }
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  next(err);
}

// POST /api/integrations/facebook/test-connection
// Performs a live read-only validation of the configured Page (id + name).
// Returns ONLY a safe verdict — credentials are never echoed. Gated: social.manage.
router.post("/test-connection", requireAuth, requirePermission(PERMISSIONS.SOCIAL_MANAGE), async (req, res, next) => {
  try {
    const result = await testConnection(req);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, next, err, "Could not test the Facebook connection.");
  }
});

// GET /api/integrations/facebook/status
// Safe operational view — never returns tokens. Gated: social.view.
router.get("/status", requireAuth, requirePermission(PERMISSIONS.SOCIAL_VIEW), async (req, res, next) => {
  try {
    const data = await getStatus();
    res.json({ success: true, data, configured: isFacebookConfigured() });
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/facebook/posts?limit=10
// Fresh fetch-from-Meta for PREVIEW. Read-only (no writes, no publication).
// Gated: social.view.
router.get("/posts", requireAuth, requirePermission(PERMISSIONS.SOCIAL_VIEW), async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const posts = await listPosts({ limit, req });
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    handleError(res, next, err, "Could not load Facebook posts.");
  }
});

// GET /api/integrations/facebook/posts/:postId
// Preview a single post (before import). Read-only.
router.get("/posts/:postId", requireAuth, requirePermission(PERMISSIONS.SOCIAL_VIEW), async (req, res, next) => {
  try {
    const post = await getPostById(req.params.postId, req);
    res.json({ success: true, data: post });
  } catch (err) {
    handleError(res, next, err, "Could not load that Facebook post.");
  }
});

// POST /api/integrations/facebook/import
// Import selected posts as DRAFTS (body.targetType, body.posts[]).
// Gated: social.import. Idempotent; nothing publishes.
router.post("/import", requireAuth, requirePermission(PERMISSIONS.SOCIAL_IMPORT), async (req, res, next) => {
  try {
    const { posts, targetType } = req.body || {};
    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ success: false, message: "posts[] is required." });
    }
    const capped = posts.slice(0, 50);
    const result = await importSelectedPosts({ posts: capped, targetType, req });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, next, err, "Could not import Facebook posts.");
  }
});

// POST /api/integrations/facebook/sync
// Fetch recent posts and import all new ones as drafts (idempotent, bounded).
// Gated: social.import.
router.post("/sync", requireAuth, requirePermission(PERMISSIONS.SOCIAL_IMPORT), async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.body?.limit, 10) || 10));
    const targetType = req.body?.targetType;
    const result = await sync({ limit, targetType, req });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, next, err, "Could not sync Facebook posts.");
  }
});

// POST /api/integrations/facebook/publish
// Phase 11 — publish a CMS-published content item to the Facebook Page.
// body: { contentType, contentId, caption?, allowRepublish? }.
// Gated: social.publish. Enforces workflow state (must be CMS-published),
// duplicate protection and connection validity backend-side. Never shares
// credentials. AI can never call this.
router.post("/publish", requireAuth, requirePermission(PERMISSIONS.SOCIAL_PUBLISH), async (req, res, next) => {
  try {
    const { contentType, contentId, caption, allowRepublish } = req.body || {};
    if (!contentType || !contentId) {
      return res.status(400).json({ success: false, message: "contentType and contentId are required." });
    }
    const result = await publishContent({
      contentType,
      contentId,
      caption: typeof caption === "string" ? caption : "",
      req,
      allowRepublish: Boolean(allowRepublish),
    });
    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
        code: result.code,
        alreadyPublished: result.alreadyPublished,
      });
    }
    res.json({ success: true, data: { published: result.published, publishedId: result.publishedId, publishedAt: result.publishedAt, republished: result.republished, publication: result.publication } });
  } catch (err) {
    handleError(res, next, err, "Could not publish to Facebook.");
  }
});

export default router;