import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// Production health/readiness check.
//
// Liveness: the process is up and this handler responds.
// Readiness: MongoDB is reachable via a lightweight ping.
//
// The response contains ONLY safe operational information. It never exposes the
// MongoDB URI, credentials, JWT secret, Cloudinary/Facebook/AI configuration, or
// stack traces. Returns 200 when ready, 503 when the required dependency
// (MongoDB) is unavailable, matching deployment-platform readiness checks.
function safeHealth(payload) {
  return {
    status: payload.status,
    checks: payload.checks,
    uptime: payload.uptime,
    timestamp: payload.timestamp,
  };
}

router.get("/", async (_req, res) => {
  const uptime = process.uptime();
  const now = new Date().toISOString();

  let dbStatus = "ok";
  let dbOk = true;
  let dbState = "disconnected";

  try {
    const connectionState = mongoose.connection.readyState;
    dbState = ["disconnected", "connected", "connecting", "disconnecting"][connectionState] || "unknown";
    if (connectionState !== 1) {
      dbOk = false;
      dbStatus = "unavailable";
    } else {
      // Lightweight DB ping. On Atlas this is a cheap admin command; no data is
      // returned and no secrets are involved.
      await mongoose.connection.db.admin().ping();
      dbOk = true;
      dbStatus = "ok";
    }
  } catch {
    dbOk = false;
    dbStatus = "unavailable";
  }

  const ready = dbOk;
  const payload = safeHealth({
    status: ready ? "ok" : "error",
    checks: {
      liveness: "ok",
      database: dbStatus,
      mongoReadyState: dbState,
    },
    uptime,
    timestamp: now,
  });

  if (!ready) {
    return res.status(503).json(payload);
  }
  res.status(200).json(payload);
});

export default router;
