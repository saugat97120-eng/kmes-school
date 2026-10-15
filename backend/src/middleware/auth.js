import jwt from "jsonwebtoken";
import { getAuth } from "@clerk/express";

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
  // 1. Check if authenticated via Clerk session token
  try {
    const clerkAuth = typeof req.auth === "function" ? req.auth() : (req.auth || (process.env.CLERK_SECRET_KEY ? getAuth(req) : null));
    if (clerkAuth && clerkAuth.userId) {
      const User = await getUserModel();
      let dbUser = await User.findOne({ clerkUserId: clerkAuth.userId });
      if (!dbUser && clerkAuth.sessionClaims?.email) {
        dbUser = await User.findOne({ email: String(clerkAuth.sessionClaims.email).toLowerCase() });
      }

      req.user = {
        id: dbUser ? dbUser._id : clerkAuth.userId,
        role: dbUser ? dbUser.role : (clerkAuth.sessionClaims?.role || "admin"),
        name: dbUser ? dbUser.name : (clerkAuth.sessionClaims?.name || "Clerk Admin"),
        email: dbUser ? dbUser.email : clerkAuth.sessionClaims?.email,
        clerkUserId: clerkAuth.userId,
      };
      return next();
    }
  } catch {
    // If Clerk check fails or is unconfigured, fall through to JWT
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

  // Phase 18B: session-version check. Tickets carry an `authVersion`; the
  // current value lives on the user record. Before password reset the version
  // is 0 (and legacy tokens without the claim are treated as version 0), so
  // existing JWTs keep working. After a successful reset the version is bumped,
  // which invalidates every previously issued JWT for that user. This happens
  // even if the token is otherwise unexpired.
  try {
    const User = await getUserModel();
    const dbUser = await User.findById(payload.id).select("authVersion");
    if (!dbUser) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    const tokenVersion = payload.authVersion ?? 0;
    if (tokenVersion !== (dbUser.authVersion || 0)) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  } catch {
    return res.status(500).json({ success: false, message: "Authentication unavailable" });
  }

  req.user = payload;
  next();
}
