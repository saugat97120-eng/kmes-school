import express from "express";
import { crudFactory } from "../utils/crudFactory.js";
import GalleryImage from "../models/GalleryImage.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { workflowActions } from "../workflow/workflowController.js";

const router = express.Router();
const c = crudFactory(GalleryImage, "gallery", { searchFields: ["title", "category"] });
const w = workflowActions(GalleryImage, "gallery");

// Public
router.get("/", c.getAll);

// Protected (permission-gated)
router.get("/admin/all", requireAuth, requirePermission(PERMISSIONS.CONTENT_VIEW), c.getAllAdmin);
router.get("/admin/trash", requireAuth, requirePermission(PERMISSIONS.TRASH_VIEW), c.getTrash);
router.post("/admin/bulk-trash", requireAuth, requirePermission(PERMISSIONS.CONTENT_DELETE), c.bulkTrash);
router.post("/admin/bulk-publish", requireAuth, requirePermission(PERMISSIONS.CONTENT_PUBLISH), c.bulkPublish);
router.put("/admin/trash/:id/restore", requireAuth, requirePermission(PERMISSIONS.TRASH_RESTORE), c.restore);
router.delete("/admin/trash/:id", requireAuth, requirePermission(PERMISSIONS.TRASH_DELETE), c.permanentDelete);

// Phase 7 workflow endpoints
router.post("/:id/submit", requireAuth, requirePermission(PERMISSIONS.CONTENT_SUBMIT), w.submit);
router.post("/:id/review", requireAuth, requirePermission(PERMISSIONS.CONTENT_REVIEW), w.review);
router.post("/:id/approve", requireAuth, requirePermission(PERMISSIONS.CONTENT_APPROVE), w.approve);
router.post("/:id/reject", requireAuth, requirePermission(PERMISSIONS.CONTENT_REJECT), w.reject);
router.post("/:id/publish", requireAuth, requirePermission(PERMISSIONS.CONTENT_PUBLISH), w.publish);
router.post("/:id/unpublish", requireAuth, requirePermission(PERMISSIONS.CONTENT_UNPUBLISH), w.unpublish);

router.get("/:id", c.getOne);
router.post("/", requireAuth, requirePermission(PERMISSIONS.CONTENT_CREATE), c.create);
router.put("/:id", requireAuth, requirePermission(PERMISSIONS.CONTENT_EDIT), c.update);
router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.CONTENT_DELETE), c.remove);

export default router;
