import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import ContactMessage from "../models/ContactMessage.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

// Public form: keep spam cheap to reject. 8 messages per IP per 15 minutes.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent. Please try again later." },
});

router.post(
  "/",
  contactLimiter,
  [
    body("name").isString().trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer"),
    body("email").isString().trim().isEmail().withMessage("A valid email is required").isLength({ max: 254 }).withMessage("Email is too long"),
    body("phone").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }).withMessage("Phone must be 30 characters or fewer"),
    body("subject").isString().trim().notEmpty().withMessage("Subject is required").isLength({ max: 200 }).withMessage("Subject must be 200 characters or fewer"),
    body("message").isString().trim().notEmpty().withMessage("Message is required").isLength({ max: 5000 }).withMessage("Message must be 5000 characters or fewer"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      // Explicit allow-list: never pass req.body straight to the model, or a
      // visitor could set read/archived/_id/timestamps themselves.
      const { name, email, phone, subject, message } = req.body;
      await ContactMessage.create({ name, email, phone, subject, message });
      res.status(201).json({ success: true, message: "Message received" });
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

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(500);
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
