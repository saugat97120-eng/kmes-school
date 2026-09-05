import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { connectDB, registerGracefulShutdown } from "./config/database.js";
import { env, isProduction, validateProductionConfiguration, validateStagingConfiguration } from "./config/env.js";
import { assertEmailProviderConfiguration } from "./integrations/email/emailService.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/sanitizeInput.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import noticeRoutes from "./routes/notices.routes.js";
import eventRoutes from "./routes/events.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import achievementRoutes from "./routes/achievements.routes.js";
import facilityRoutes from "./routes/facilities.routes.js";
import activityRoutes from "./routes/activities.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import siteSettingsRoutes from "./routes/siteSettings.routes.js";
import pageContentRoutes from "./routes/pageContent.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import attachmentsRoutes from "./routes/attachments.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import usersRoutes from "./routes/users.routes.js";
import activityLogsRoutes from "./routes/activityLogs.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import inboxRoutes from "./routes/inbox.routes.js";
import facebookRoutes from "./integrations/facebook/facebook.routes.js";
import aiRoutes from "./integrations/ai/ai.routes.js";

dotenv.config();

const app = express();
const PORT = env.port;

await connectDB();

// Clear startup warnings when critical config is missing. We do NOT hard-crash:
// optional integrations stay disabled until configured, and an attempt to use
// them returns the existing safe per-request config error. The production check
// applies only to NODE_ENV=production; the staging check only to NODE_ENV=staging.
if (isProduction()) {
  for (const problem of validateProductionConfiguration()) {
    console.warn(`[config] ${problem}`);
  }
} else if (env.nodeEnv === "staging") {
  for (const problem of validateStagingConfiguration()) {
    console.warn(`[config][staging] ${problem}`);
  }
}

// Phase 20: fail predictably at boot if the email provider is invalid or an
// SMTP provider is requested without its mandatory configuration. This prevents
// a silent SMTP->mock fallback in production (which would appear to "work" while
// never delivering real email).
assertEmailProviderConfiguration();

app.use(helmet());
// CORS: explicit allow-list of frontend origins (no wildcard). Each environment
// (dev/staging/prod) supplies only the origins it is allowed to serve. When the
// list has exactly one origin it is equivalent to the previous single-origin
// configuration; credentials remain unchanged (safe with an explicit origin).
app.use(
  cors({
    origin(origin, callback) {
      const allowed = env.allowedOrigins;
      // Allow non-browser / same-origin / curl requests (no Origin header) and
      // any explicitly approved origin. For any other origin, deny by omitting
      // the Access-Control-Allow-Origin header so the browser blocks the
      // request (the request is NOT served with CORS headers).
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
// Trust proxy: when the app runs behind a trusted reverse proxy / PaaS edge on
// production, express-trust-proxy lets rate limiting and secure/protocol see the
// real client IP. Default is off (0) so development is unchanged; operators set
// the correct count via TRUST_PROXY to match the deployed proxy topology.
if (Number(env.trustProxy) > 0) {
  app.set("trust proxy", Number(env.trustProxy));
}
app.use(express.json());
app.use(sanitizeInput);
app.use(morgan("dev"));

// General API rate limit
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Stricter limit on auth endpoints to slow down brute-force login attempts
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." },
  })
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/page-content", pageContentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/attachments", attachmentsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/activity-logs", activityLogsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/integrations/facebook", facebookRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`KMES Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown wiring (closes MongoDB cleanly on SIGINT/SIGTERM).
registerGracefulShutdown();
