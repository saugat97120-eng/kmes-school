import ActivityLog from "../models/ActivityLog.js";

// Fire-and-forget activity logging. Never throws — a logging failure should
// never break the underlying request.
export async function logActivity({ req, action, resource, resourceId, resourceLabel, meta }) {
  try {
    const rawIp = req?.ip || req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || null;
    const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : null;
    const userAgent =
      typeof req?.headers?.["user-agent"] === "string"
        ? req.headers["user-agent"].substring(0, 300)
        : null;

    await ActivityLog.create({
      user: req?.user?.id,
      userName: req?.user?.name || (req?.user?.email ? req.user.email.split("@")[0] : "System"),
      userEmail: req?.user?.email || null,
      userRole: req?.user?.role || null,
      ip,
      userAgent,
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
