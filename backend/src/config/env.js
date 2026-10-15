// Phase 12/20 — Centralized environment configuration reader + validation.
//
// This is the single place that documents and reads every environment variable
// the backend uses. It does NOT load dotenv itself (server.js already does),
// and it never writes secrets back to process.env. It exposes:
//   - accessors for well-known variables (all optional, read from process.env)
//   - isProduction() / isDevelopment() helpers
//   - validateProductionConfiguration() -> problems[] (safe messages, no secrets)
//
// Rationale: keeps every `process.env` reference discoverable, adds startup
// validation for missing critical config in production, and never returns/leaks
// secret values anywhere (validation messages are generic category labels,
// never the actual values).

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

// Parse a comma-separated allow-list of origins into a trimmed, de-duplicated,
// non-empty array. Never returns a wildcard "*" and never returns undefined.
// Used for CORS so development, staging, and production each permit only the
// explicit frontend origins they are supposed to talk to.
function parseOriginList(raw) {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

// Phase 20: strict boolean parsing for bootstrap gate. Only the literal
// string "true" enables bootstrap. Values like "1", "yes", "TRUE", or
// "false" all resolve to false. This prevents accidental bootstrap
// enablement in production via environment typo or legacy config.
function parseStrictBool(raw) {
  return raw === "true";
}

// Introduce a small namespace of well-known variables so callers never guess
// at raw strings. Values are read lazily from process.env (single source of
// truth remains the process environment, not a snapshot).
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || "5000",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // Reset-link authority (Phase 18C-3): the single source used to build the
  // password-reset URL. RESET_LINK_BASE is the approved live source so staging
  // and production can never cross-link; when unset it falls back to the
  // frontend origin for back-compatibility. Env-specific, never shared.
  resetLinkBase: process.env.RESET_LINK_BASE || process.env.FRONTEND_URL || "http://localhost:5173",

  // Trusted reverse-proxy hop count for Express `app.set("trust proxy", ...)`.
  // Defaults to 0 (off) so development/most local setups behave exactly as
  // before. Operators must set the correct count on the production PaaS which
  // fronts Express with a trusted proxy, so rate limiting and client-IP
  // detection (secure/protocol) use the real client IP rather than the proxy.
  trustProxy: process.env.TRUST_PROXY || "0",

  // Explicit CORS allow-list. Comma-separated origins (no wildcard allowed).
  // Falls back to the single legacy client origin for back-compatibility.
  allowedOrigins: parseOriginList(
    process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173"
  ),

  cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinarySecret: process.env.CLOUDINARY_API_SECRET || "",

  facebookAppId: process.env.FACEBOOK_APP_ID || "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || "",
  facebookPageId: process.env.FACEBOOK_PAGE_ID || "",
  facebookPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "",

  aiProvider: process.env.AI_PROVIDER || "",
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "",

  devAdminEmail: process.env.DEV_ADMIN_EMAIL || "",
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || "",

  // Phase 18B: email delivery. mock = in-memory only (no real send); none/blank
  // keeps a safe no-op adapter. smtp (Phase 18C-4) selects real production
  // delivery via Nodemailer using SMTP_* below.
  emailProvider: process.env.EMAIL_PROVIDER || "mock",

  // Phase 18C-4: production SMTP email delivery (used when EMAIL_PROVIDER=smtp).
  // Documented here for startup validation; the SMTP adapter re-reads them from
  // the live process environment at send time so an operator restart picks up
  // new values without code changes.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "587",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailFromName: process.env.EMAIL_FROM_NAME || "",

  // Phase 20: First-admin bootstrap configuration.
  // allowAdminBootstrap: strict "true" only; "1"/"yes"/"TRUE" must NOT enable.
  allowAdminBootstrap: parseStrictBool(process.env.ALLOW_ADMIN_BOOTSTRAP),

  // Phase 20: SMTP_PASSWORD is the primary credential env var; SMTP_PASS is a
  // back-compat fallback so existing test harnesses that set SMTP_PASS keep
  // working. The adapter and validation use this resolved value.
  smtpPassword: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "",

  // Phase 20: SMTP_SECURE — "true" selects implicit TLS (port 465 convention);
  // "false" (default) uses STARTTLS on port 587.
  smtpSecure: process.env.SMTP_SECURE === "true",

  // Phase 20: adminBootstrapEmail — the ONLY email allowed to create the first
  // admin via public registration. Stored as-is for comparison; the route
  // normalizes to lowercase before matching.
  adminBootstrapEmail: (process.env.ADMIN_BOOTSTRAP_EMAIL || "ivanbhattarai042@gmail.com").trim(),

  // Clerk authentication
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",

  // Cloudflare R2 Storage (S3-compatible)
  r2AccountId: process.env.R2_ACCOUNT_ID || "a4556a7dd2c35190a791424061384ece",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  r2BucketName: process.env.R2_BUCKET_NAME || "kmes-school-media",
  r2PublicUrl: process.env.R2_PUBLIC_URL || "https://media.kmes.com.np",
};

// Validate critical production configuration. Returns an array of generic
// problem descriptions (never secret values). Logged at startup as clear
// warnings so operators can fix missing config without the process crashing.
// Optional integrations (AI, Facebook, Cloudinary) are intentionally allowed to
// be unconfigured — the server must not crash merely because an integration is
// unused. Failure only surfaces as the existing safe per-request config error
// when an administrator attempts to use that integration.
export function validateProductionConfiguration() {
  const problems = [];
  if (isProduction()) {
    if (!env.mongoUri) problems.push("MONGODB_URI is not set. Database routes will fail.");
    if (!env.jwtSecret) problems.push("JWT_SECRET is not set. Authentication/signing will fail.");
    if (env.allowedOrigins.length === 0) {
      problems.push("No frontend origin is configured for CORS.");
    } else if (env.allowedOrigins.includes("*")) {
      problems.push("CORS allow-list must not contain a wildcard '*' origin.");
    }
    // Phase 20: production must never accidentally leave bootstrap enabled.
    if (env.allowAdminBootstrap) {
      problems.push("ALLOW_ADMIN_BOOTSTRAP is enabled in production. Disable after provisioning.");
    }
    // Phase 18C-4 / Phase 20: when a real SMTP provider is requested, warn
    // at boot that delivery will not work until SMTP_* is complete.
    // Generic category labels only — never values.
    if (env.emailProvider === "smtp") {
      const missing = [];
      if (!env.smtpHost) missing.push("SMTP_HOST");
      if (!env.smtpUser) missing.push("SMTP_USER");
      if (!env.smtpPassword) missing.push("SMTP_PASSWORD");
      if (missing.length) {
        problems.push(`EMAIL_PROVIDER is 'smtp' but ${missing.join(", ")} is not set. Password-reset email delivery will fail.`);
      }
    } else if (env.emailProvider && env.emailProvider !== "mock" && env.emailProvider !== "none") {
      problems.push(`Unsupported EMAIL_PROVIDER value. Supported: mock, smtp, none.`);
    }
  }
  return problems;
}

// Phase 18C-4: staging-only validation. Mirrors the production check for
// staging's critical values so a misconfigured staging boots with clear
// warnings (never secret values) instead of failing silently per-request.
// Staging is still a non-production environment: optional integrations (AI,
// Facebook, Cloudinary, email) may stay unconfigured without crashing.
export function validateStagingConfiguration() {
  const problems = [];
  if (env.nodeEnv === "staging") {
    if (!env.mongoUri) problems.push("MONGODB_URI is not set. Database routes will fail.");
    if (!env.jwtSecret) problems.push("JWT_SECRET is not set. Authentication/signing will fail.");
    if (env.allowedOrigins.length === 0) {
      problems.push("No staging frontend origin is configured for CORS.");
    } else if (env.allowedOrigins.includes("*")) {
      problems.push("CORS allow-list must not contain a wildcard '*' origin.");
    } else if (
      env.allowedOrigins.length === 1 &&
      env.allowedOrigins[0] === "http://localhost:5173" &&
      !process.env.ALLOWED_ORIGINS
    ) {
      // ALLOWED_ORIGINS was not supplied, so the allow-list fell back to the
      // development default. On staging that would silently permit a local
      // origin — a misconfiguration that must surface at boot.
      problems.push("ALLOWED_ORIGINS is not set; staging would fall back to localhost.");
    }
  }
  return problems;
}

// Exposed for focused configuration tests (Phase 18C-3). Never returns secret
// values — only the resolved non-secret configuration the rest of the app uses.
export function getPublicConfigSnapshot() {
  return {
    nodeEnv: env.nodeEnv,
    port: env.port,
    frontendUrl: env.frontendUrl,
    resetLinkBase: env.resetLinkBase,
    trustProxy: env.trustProxy,
    allowedOrigins: env.allowedOrigins,
    emailProvider: env.emailProvider,
  };
}
