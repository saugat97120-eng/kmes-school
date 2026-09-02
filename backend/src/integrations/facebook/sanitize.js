// Phase 9 — Sanitization for UNTRUSTED Facebook text and URLs.
//
// Facebook messages are external input and must never be rendered as HTML by
// the CMS. We reduce everything to plain text:
//   - remove script/style/iframes and any HTML tags
//   - decode entities to plain text
//   - strip control characters
//   - enforce a hard length cap
// URLs are validated to http/https only (no javascript:, no data:).

const MAX_MESSAGE_LENGTH = 8000; // generous but bounded
const MAX_TITLE_LENGTH = 160;

export function sanitizePlainText(input) {
  if (typeof input !== "string") return "";
  let text = input;
  // Script/style/iframe blocks removed wholesale.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, " ");
  // Any other tag -> single space (plain text output, no hostile markup).
  text = text.replace(/<[^>]*>/g, " ");
  // Decode common entities.
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
  // Strip control characters (except newlines/tabs which are meaningful).
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Collapse excessive whitespace.
  text = text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return text.trim().slice(0, MAX_MESSAGE_LENGTH);
}

// Derive a stable, readable title from a Facebook message (first meaningful
// line, truncated). Falls back to a descriptive excerpt.
export function titleFromMessage(message, externalId) {
  const text = sanitizePlainText(message);
  const line = text.split("\n").find((l) => l.trim().length > 0) || "";
  const clean = line.trim().slice(0, MAX_TITLE_LENGTH);
  if (clean) return clean;
  return externalId ? `Facebook post ${externalId}` : "Imported Facebook post";
}

// Validate a URL coming from Facebook. Only http(s) is acceptable; dangerous
// schemes (javascript:, data:, vbscript:) are rejected so the preview card and
// any link rendering cannot execute client-side or abuse the scheme.
export function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* not a valid URL */
  }
  return null;
}

// Validate content type/size for a media download before it reaches Cloudinary.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB, matching a sensible upload cap

export function validateMedia({ mimeType, size }) {
  if (mimeType && !ALLOWED_CONTENT_TYPES.has(mimeType)) {
    return { ok: false, reason: "Unsupported media type." };
  }
  if (size && size > MAX_MEDIA_BYTES) {
    return { ok: false, reason: "Media exceeds the 5 MB size limit." };
  }
  return { ok: true };
}

export const MEDIA_LIMITS = {
  maxBytes: MAX_MEDIA_BYTES,
  allowedTypes: [...ALLOWED_CONTENT_TYPES],
};