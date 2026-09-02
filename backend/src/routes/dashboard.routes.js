import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { roleHasPermission } from "../permissions.js";
import Notice from "../models/Notice.js";
import Event from "../models/Event.js";
import GalleryImage from "../models/GalleryImage.js";
import Achievement from "../models/Achievement.js";
import Facility from "../models/Facility.js";
import Activity from "../models/Activity.js";
import ContactMessage from "../models/ContactMessage.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";

const router = express.Router();

const contentModels = {
  notices: Notice,
  events: Event,
  gallery: GalleryImage,
  achievements: Achievement,
  facilities: Facility,
  activities: Activity,
};

async function contentStats(Model) {
  const [published, draft, trashed] = await Promise.all([
    Model.countDocuments({ published: true, deletedAt: null }),
    Model.countDocuments({ published: false, deletedAt: null }),
    Model.countDocuments({ deletedAt: { $ne: null } }),
  ]);
  return { published, draft, trashed, total: published + draft };
}

// GET /api/dashboard/stats
router.get("/stats", requireAuth, requirePermission(PERMISSIONS.DASHBOARD_VIEW), async (req, res, next) => {
  try {
    const entries = Object.entries(contentModels);
    const statsList = await Promise.all(entries.map(([, Model]) => contentStats(Model)));
    const content = Object.fromEntries(entries.map(([key], i) => [key, statsList[i]]));

    const [unreadMessages, totalMessages, upcomingEvents, userCount] = await Promise.all([
      ContactMessage.countDocuments({ read: false, archived: { $ne: true } }),
      ContactMessage.countDocuments({ archived: { $ne: true } }),
      Event.countDocuments({ date: { $gte: new Date() }, deletedAt: null, published: true }),
      User.countDocuments(),
    ]);

    const recentMessages = await ContactMessage.find({ archived: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name subject read createdAt");

    const upcomingEventsList = await Event.find({
      date: { $gte: new Date() },
      deletedAt: null,
      published: true,
    })
      .sort({ date: 1 })
      .limit(5)
      .select("title date location");

    // Admin-only telemetry. Editors may view the dashboard but must not read
    // user counts or the full activity log (activity logs are admin-only).
    const isAdmin = roleHasPermission(req.user.role, PERMISSIONS.USERS_MANAGE);
    const recentActivity = isAdmin ? await ActivityLog.find().sort({ createdAt: -1 }).limit(10) : null;

    res.json({
      success: true,
      data: {
        content,
        messages: { unread: unreadMessages, total: totalMessages },
        upcomingEventsCount: upcomingEvents,
        ...(isAdmin ? { userCount } : {}),
        recentMessages,
        upcomingEvents: upcomingEventsList,
        ...(isAdmin ? { recentActivity } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
