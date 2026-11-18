import jwt from "jsonwebtoken";

// Loaded lazily to avoid import-order coupling with the User model.
let UserModel = null;
async function getUserModel() {
  if (!UserModel) {
    const { default: model } = await import("../models/User.js");
    UserModel = model;
  }
  return UserModel;
}

export async function requireAuth(req, res, next) {
  // Clerk sessions are verified by clerkMiddleware. A verified identity must
  // still map to an explicitly provisioned KMES user; Clerk claims never grant
  // an application role by themselves.
  if (typeof req.auth === "function") {
    let clerkAuth;
    try {
      clerkAuth = req.auth();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired session" });
    }

    if (clerkAuth?.userId) {
      try {
        const User = await getUserModel();
        const dbUser = await User.findOne({ clerkUserId: clerkAuth.userId });
        if (!dbUser) {
          return res.status(403).json({ success: false, message: "This account is not authorized for the KMES administration system" });
        }
        req.user = {
          id: dbUser._id,
          role: dbUser.role,
          name: dbUser.name,
          email: dbUser.email,
          clerkUserId: clerkAuth.userId,
        };
        return next();
      } catch {
        return res.status(500).json({ success: false, message: "Authentication unavailable" });
      }
    }
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  // Reject stale sessions after password reset or account changes.
  try {
    const User = await getUserModel();
    const dbUser = await User.findById(payload.id).select("authVersion role name email");
    if (!dbUser) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    const tokenVersion = payload.authVersion ?? 0;
    if (tokenVersion !== (dbUser.authVersion || 0)) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    // The database remains authoritative if a staff role was changed after
    // this JWT was issued.
    req.user = {
      ...payload,
      id: dbUser._id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
    };
  } catch {
    return res.status(500).json({ success: false, message: "Authentication unavailable" });
  }

  return next();
}
