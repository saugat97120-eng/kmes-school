import ActivityLog from "../models/ActivityLog.js";

// Fire-and-forget activity logging. Never throws — a logging failure should
// never break the underlying request.
export async function logActivity({ req, action, resource, resourceId, resourceLabel, meta }) {
  try {
    await ActivityLog.create({
      user: req?.user?.id,
      userName: req?.user?.name || "System",
      action,
      resource,
      resourceId,
      resourceLabel,
      meta,
    });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}
