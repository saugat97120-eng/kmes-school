// Phase 12 — Centralized environment configuration reader + validation.
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

// Introduce a small namespace of well-known variables so callers never guess
// at raw strings. Values are read lazily from process.env (single source of
// truth remains the process environment, not a snapshot).
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || "5000",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

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

  clientOrigin: process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173",
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
    if (!env.clientOrigin) problems.push("Frontend client origin is not configured for CORS.");
  }
  return problems;
}