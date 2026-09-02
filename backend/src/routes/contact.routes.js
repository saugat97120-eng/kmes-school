import express from "express";
import { body, validationResult } from "express-validator";
import ContactMessage from "../models/ContactMessage.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("subject").trim().notEmpty().withMessage("Subject is required"),
    body("message").trim().notEmpty().withMessage("Message is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const msg = await ContactMessage.create(req.body);
      res.status(201).json({ success: true, data: msg });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: list messages (?status=unread|read|archived)
router.get("/", requireAuth, requirePermission(PERMISSIONS.MESSAGES_VIEW), async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status === "unread") filter.read = false;
    if (status === "read") filter.read = true;
    if (status === "archived") filter.archived = true;
    if (!status || status === "active") filter.archived = { $ne: true };

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
});

// Admin: mark read/unread or archive/unarchive
router.put("/:id", requireAuth, requirePermission(PERMISSIONS.MESSAGES_MANAGE), async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.read === "boolean") update.read = req.body.read;
    if (typeof req.body.archived === "boolean") update.archived = req.body.archived;

    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!msg) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
});

// Admin only: permanently delete a message
router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.MESSAGES_MANAGE), async (req, res, next) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    await logActivity({
      req,
      action: "delete",
      resource: "messages",
      resourceId: msg._id.toString(),
      resourceLabel: msg.subject,
    });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
