// Phase 10 — AI output validation + sanitization.
//
// Raw model output is UNTRUSTED. Every suggestion must pass strict validation
// before it is returned to the reviewer or applied. We validate: field
// existence, types, max lengths, enums, array sizes, URL safety, and plain-text
// safety. Malformed output becomes a safe error — never a crash, never applied.
//
// No secrets are ever part of an AI output or validation path.

// Cap the number of suggestions/tags AI may return in one call.
const MAX_SUGGESTION_LENGTH = 4000;
const MAX_TITLE_LENGTH = 160;
const MAX_TAG_COUNT = 12;
const MAX_TAG_LENGTH = 40;
const MAX_CAPTION_LENGTH = 4000;
const MAX_SUMMARY_LENGTH = 600;

// Strip HTML/script/style/iframe + control chars and decode basic entities.
// Reused philosophy of the Phase 9 sanitizer so there is no second conflicting
// sanitization system for untrusted free text.
export function sanitizePlainText(value, max = MAX_SUGGESTION_LENGTH) {
  if (typeof value !== "string") return null;
  let s = value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s{3,}/g, "  ")
    .trim();
  if (s.length > max) s = s.slice(0, max).trim();
  return s || null;
}

// http/https only; reject javascript:/data:/etc.
export function safeUrl(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Validate a single suggested title.
function validateTitle(v) {
  if (typeof v !== "string") return null;
  const t = sanitizePlainText(v, MAX_TITLE_LENGTH);
  if (!t) return null;
  return t;
}

// Validate a list of tags. Each tag must be a short non-empty string; output is
// capped and deduplicated.
function validateTags(v) {
  if (!Array.isArray(v)) return null;
  const out = [];
  const seen = new Set();
  for (const raw of v) {
    if (typeof raw !== "string") continue;
    const t = sanitizePlainText(raw, MAX_TAG_LENGTH);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= MAX_TAG_COUNT) break;
  }
  return out.length ? out : null;
}

// Maps a reduced set of "safe editable fields" per content type. These are the
// ONLY fields an AI suggestion may target (no workflow, no provenance, no
// publication metadata).
export const AI_EDITABLE_FIELDS = Object.freeze({
  notices: {
    Title: ["title"],
    "Short Description": ["description"],
    "Full Content": ["content"],
    Tags: ["category"], // surfaced as tags but maps to the existing category string
  },
  events: {
    Title: ["title"],
    Description: ["description"],
    Summary: ["description"], // summarize -> description (schema has no separate summary)
    Tags: ["category"],
  },
  gallery: {
    Title: ["title"],
    Category: ["category"],
  },
  achievements: {
    Title: ["title"],
    Description: ["description"],
    Tags: ["category"],
  },
  facilities: {
    Title: ["title"],
    Description: ["description"],
  },
  activities: {
    Title: ["title"],
    Description: ["description"],
  },
});

// Validate a provider-tagged suggestion payload. Returns { action, targetField,
// value, summary, warnings } or throws an AIServiceError (via the caller).
//
// Each AI action maps to an allowed editable field for the current content
// type. Workflow/provenance/publication fields are never in this set.
export function validateSuggestion({ contentType, action, raw }) {
  // raw is the parsed provider JSON object (may contain anything).
  if (!isPlainObject(raw)) {
    throw new Error("AI returned a non-object suggestion.");
  }

  // The provider must declare the action it claims to have performed.
  const declaredAction = typeof raw.action === "string" ? raw.action : action;

  const fields = AI_EDITABLE_FIELDS[contentType];
  if (!fields) throw new Error("Unsupported content type.");

  const suggestion = isPlainObject(raw.suggestion) ? raw.suggestion : {};
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.slice(0, 10).filter((w) => typeof w === "string") : [];
  const summary = sanitizePlainText(raw.summary, MAX_SUGGESTION_LENGTH);

  switch (declaredAction) {
    case "suggest_title":
      // value carries an object with the title. We map to the title field.
      {
        const title = validateTitle(suggestion.title ?? raw.title);
        if (!title) throw new Error("AI produced no valid title.");
        return { action: declaredAction, targetField: "title", value: { title }, summary, warnings };
      }
    case "improve_description":
    case "rewrite_notice":
    case "summarize":
    case "generate_short_description":
      {
        const text = sanitizePlainText(suggestion.text ?? suggestion.description ?? raw.text, MAX_SUGGESTION_LENGTH);
        if (!text) throw new Error("AI produced no valid text.");
        // For summarize/generate_short_description clamp to summary length.
        const limited = declaredAction === "summary" ? text.slice(0, MAX_SUMMARY_LENGTH).trim() : text;
        return { action: declaredAction, targetField: "description", value: { description: limited }, summary, warnings };
      }
    case "suggest_tags": {
      const tags = validateTags(suggestion.tags ?? raw.tags);
      if (!tags) throw new Error("AI produced no valid tags.");
      return { action: declaredAction, targetField: "category", value: { category: tags[0] }, summary, warnings, tagValues: tags };
    }
    case "generate_caption": {
      const caption = sanitizePlainText(suggestion.caption ?? raw.caption, MAX_CAPTION_LENGTH);
      if (!caption) throw new Error("AI produced no valid caption.");
      return { action: declaredAction, targetField: "caption", value: { caption }, summary, warnings };
    }
    case "extract_event_details": {
      return validateEventDetails(suggestion, summary, warnings);
    }
    default:
      throw new Error("AI returned an unsupported action.");
  }
}

// Event extraction must never invent missing data. Each field is either a valid
// value or null/"not found" — never guessed.
function validateEventDetails(suggestion, summary, warnings) {
  const title = validateTitle(suggestion.title ?? null);
  const location = sanitizePlainText(suggestion.location, 200);
  const time = sanitizePlainText(suggestion.time, 100);
  const description = sanitizePlainText(suggestion.description, MAX_SUGGESTION_LENGTH);

  let date = null;
  const rawDate = suggestion.date;
  if (typeof rawDate === "string" && rawDate.trim()) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) date = d.toISOString();
    // If it doesn't parse, keep null (do NOT guess).
  }

  return {
    action: "extract_event_details",
    targetField: "event",
    value: {
      title,
      date,
      time,
      location,
      description,
    },
    summary,
    warnings,
  };
}

// Whether a parsed provider response body looks like valid JSON. Returns the
// parsed object, or throws on malformed input.
export function parseAIJSON(text) {
  if (typeof text !== "string") throw new Error("AI produced no text to parse.");
  const t = text.trim();
  // Tolerate code-fence wrapping some providers return.
  const cleaned = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (!isPlainObject(parsed)) throw new Error("AI output is not an object.");
    return parsed;
  } catch {
    throw new Error("AI returned malformed JSON.");
  }
}