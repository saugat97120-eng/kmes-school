// Display helpers shared by public pages.

// "2026-10-13T10:39:32.095Z" -> "13 Oct 2026". Returns "" for missing/invalid dates
// (never "Invalid Date" or 1 Jan 1970).
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1990) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// True for empty values and obvious filler ("+977-XXXXXXXXXX", "To be confirmed"...),
// so the public site hides them instead of showing fake contact details.
const PLACEHOLDER_PATTERNS = [/x{4,}/i, /^\s*(tbc|tba|n\/a)\s*$/i, /to be (confirmed|announced)/i, /coming soon/i, /lorem ipsum/i];
export function isPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(text));
}

// Value for a CSS url(...) that cannot break out of the quotes.
export function cssUrl(value) {
  return `url("${String(value || "").replace(/["'()\\\s]/g, encodeURIComponent)}")`;
}

// Neutral inline placeholder used when an image is missing or fails to load.
export const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#e2e8f0"/><g fill="#94a3b8"><circle cx="300" cy="200" r="36"/><path d="M180 380l120-110 80 70 90-100 150 140z"/></g></svg>'
  );

// onError handler: swap in the fallback once (avoids an infinite error loop).
export function handleImageError(event) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "1";
  img.src = IMAGE_FALLBACK;
}
