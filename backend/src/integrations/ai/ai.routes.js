// Phase 10 — AI content preparation routes.
//
// Backend-authoritative RBAC. Frontend permission checks are UX only.
//
//   GET  /status                       -> ai.view
//   POST /suggest                      -> ai.use (returns an EMPHERAL suggestion; nothing is written)
//   POST /apply                        -> ai.use AND the apply handler re-checks
//                                         content.edit for the target content
//
// The backend loads the authoritative content itself; it never trusts
// frontend-supplied authoritative fields. AI apply is explicit and workflow-safe.
//
// A dedicated, stricter per-IP rate limit protects the potentially expensive AI
// endpoints against accidental flooding.
import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../../middleware/roles.js";
import { roleHasPermission } from "../../permissions.js";
import { getStatus, suggest, applySuggestion } from "./aiService.js";

const router = express.Router();

// Lightweight AI rate limit (in addition to the global API limit). Reuses the
// existing express-rate-limit dependency — no new library.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // per IP per minute across AI endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please try again shortly." },
});

router.use(aiLimiter);

// Resolve the caller's CURRENT role from the DB and confirm they may edit the
// content being suggested upon. The JWT authenticates; the DB authorizes.
async function userCanEditContent(req) {
  try {
    const { default: User } = await import("../../models/User.js");
    const user = await User.findById(req.user.id);
    return Boolean(user && roleHasPermission(user.role, PERMISSIONS.CONTENT_EDIT));
  } catch {
    return false;
  }
}

// GET /api/ai/status — safe operational view (configured/provider/model only).
// Never returns API keys. Gated: ai.view.
router.get("/status", requireAuth, requirePermission(PERMISSIONS.AI_VIEW), async (req, res, next) => {
  try {
    res.json({ success: true, data: getStatus() });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/suggest
// body: { contentType, contentId, action }. Returns an ephemeral suggestion.
// Gated: ai.use. Does NOT write to the database.
router.post("/suggest", requireAuth, requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const { contentType, contentId, action } = req.body || {};
    const result = await suggest({ contentType, contentId, action, req });
    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error, code: result.code });
    }
    res.json({ success: true, data: result.suggestion });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/apply
// body: { contentType, contentId, action, value }.
// Explicit human apply. Gated: ai.use; also re-checks content.edit (DB-backed).
router.post("/apply", requireAuth, requirePermission(PERMISSIONS.AI_USE), async (req, res, next) => {
  try {
    const { contentType, contentId, action, value } = req.body || {};
    const hasEdit = await userCanEditContent(req);
    const result = await applySuggestion({ contentType, contentId, action, value, req, userHasEdit: hasEdit });
    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.content });
  } catch (err) {
    next(err);
  }
});

export default router;