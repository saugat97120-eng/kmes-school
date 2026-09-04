// Phase 18C — explicit CMS payload validation + allowed-field allowlists.
//
// Prior to this phase, site-settings and page-content persisted req.body almost
// verbatim (the only guard was the global sanitizeInput that strips Mongo
// operator keys and dotted paths). This module makes the accepted field set
// explicit, validates types/URLs/email, and drops — and reports — anything
// unexpected. Unexpected fields are never persisted.
import { safeUrl } from "../integrations/facebook/sanitize.js";

const SETTINGS_STRING_FIELDS = [
  "schoolName",
  "shortName",
  "logoUrl",
  "heroImage",
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "footerDescription",
  "address",
  "phone",
  "email",
  "facebookUrl",
  "principalName",
  "principalTitle",
  "principalPhoto",
  "principalMessage",
  "directorName",
  "directorTitle",
  "directorPhoto",
  "directorMessage",
];

const SETTINGS_URL_FIELDS = new Set([
  "logoUrl",
  "heroImage",
  "principalPhoto",
  "directorPhoto",
  "facebookUrl",
]);

export const SITE_SETTINGS_ALLOWLIST = new Set([...SETTINGS_STRING_FIELDS, "published"]);

const PAGE_STRING_FIELDS = [
  "slug",
  "title",
  "eyebrow",
  "description",
  "heroImage",
  "history",
  "mission",
  "vision",
  "principalMessage",
  "directorMessage",
  "admissionsIntro",
  "admissionsCtaText",
  "admissionsCtaLink",
];

const PAGE_URL_FIELDS = new Set(["heroImage"]);

export const PAGE_CONTENT_ALLOWLIST = new Set([...PAGE_STRING_FIELDS, "published"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Keep only allow-list fields. Defensively drops Mongo operator keys and dotted
// paths (the global sanitizeInput middleware already strips these upstream, but
// this util must be safe on its own too).
function pickAllowed(body, allowList) {
  const payload = {};
  const rejected = [];
  if (!isPlainObject(body)) return { payload, rejected };

  for (const key of Object.keys(body)) {
    if (key.startsWith("$") || key.includes(".")) {
      rejected.push(key);
      continue;
    }
    if (allowList.has(key)) payload[key] = body[key];
    else rejected.push(key);
  }
  return { payload, rejected };
}

function validateStringFields(payload, fields, errors) {
  for (const field of fields) {
    if (payload[field] !== undefined && typeof payload[field] !== "string") {
      errors.push(`${field} must be a string`);
    }
  }
}

// URL-valued fields must be http(s) when non-empty. Falls back to the shared
// safeUrl helper so javascript:/data:/vbscript: schemes are rejected.
function validateUrlFields(payload, fields, errors) {
  for (const field of fields) {
    const value = payload[field];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string") {
      errors.push(`${field} must be a string`);
      continue;
    }
    const normalized = safeUrl(value);
    if (!normalized) errors.push(`${field} must be a valid http(s) URL`);
    else payload[field] = normalized;
  }
}

function validateBooleanField(payload, field, errors) {
  if (payload[field] !== undefined && typeof payload[field] !== "boolean") {
    errors.push(`${field} must be a boolean`);
  }
}

// --- Site settings ----------------------------------------------------------

export function sanitizeSiteSettings(body) {
  const errors = [];
  const { payload, rejected } = pickAllowed(body, SITE_SETTINGS_ALLOWLIST);

  validateStringFields(payload, SETTINGS_STRING_FIELDS, errors);
  validateUrlFields(payload, [...SETTINGS_URL_FIELDS], errors);

  if (payload.email !== undefined && payload.email !== "") {
    if (!EMAIL_RE.test(payload.email)) errors.push("email must be a valid email address");
  }
  validateBooleanField(payload, "published", errors);

  return { ok: errors.length === 0, errors, payload, rejected };
}

// --- Page content -----------------------------------------------------------

export function sanitizePageContent(body, { requireSlug = false } = {}) {
  const errors = [];
  const { payload, rejected } = pickAllowed(body, PAGE_CONTENT_ALLOWLIST);

  validateStringFields(payload, PAGE_STRING_FIELDS, errors);

  if (payload.slug !== undefined && typeof payload.slug === "string") {
    payload.slug = payload.slug.trim().toLowerCase();
  }
  if (requireSlug && (!payload.slug || String(payload.slug).trim() === "")) {
    errors.push("slug is required");
  }

  validateUrlFields(payload, [...PAGE_URL_FIELDS], errors);
  validateBooleanField(payload, "published", errors);

  return { ok: errors.length === 0, errors, payload, rejected };
}