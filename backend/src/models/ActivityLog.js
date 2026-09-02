import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "System" },
    action: {
      type: String,
      enum: [
        "login",
        "create",
        "update",
        "delete",
        "restore",
        "permanent_delete",
        "publish",
        "unpublish",
        "upload",
        "submit",
        "review",
        "approve",
        "reject",
        "user_create",
        "user_update",
        "user_delete",
        "settings_update",
        "facebook_connection_test",
        "facebook_sync",
        "facebook_import",
        "facebook_skipped",
        "facebook_publish",
        "facebook_publish_failed",
        "facebook_publish_skipped",
        "ai_request",
        "ai_suggestion",
        "ai_apply",
        "ai_request_failed",
      ],
      required: true,
    },
    resource: { type: String, required: true }, // e.g. "notices", "users", "site-settings"
    resourceId: { type: String },
    resourceLabel: { type: String }, // human-readable title/name for display
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Serving fast chronological retrieval of recent activity (e.g. the dashboard
// latest-activity feed).
activityLogSchema.index({ createdAt: -1 });
// Phase 16: composite indexes serving the content-inbox lookups that were
// previously COLLSCANs on the (potentially large) activity log collection:
//   - per-item author/history lookups ({resource, resourceId}, sorted oldest-first)
//   - inbox author-map batch lookups by create action across many resourceIds
activityLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, resourceId: 1 });

export default mongoose.model("ActivityLog", activityLogSchema);
