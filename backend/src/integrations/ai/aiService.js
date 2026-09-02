// Phase 10 — AI content preparation service.
//
//   Request
//    → Load authoritative content (backend, never client-supplied fields)
//    → Prepare minimal, delimited AI input
//    → AI provider (injectable)
//    → Validate output
//    → Return suggestion to human (ephemeral — never auto-persisted)
//   Human "Apply"
//    → backend re-auth + re-permission + workflow check
//    → validate requested change
//    → apply ONLY allowed editable fields via existing content edit logic
//
// AI NEVER:
//   - writes workflow state (status/published/*By)
//   - touches provenance (externalSource/externalId/externalMetadata)
//   - touches publication metadata (facebookPublication)
//   - approves/publishes/deletes/restores content
//   - auto-writes suggestions (ephemeral unless a human applies)
//
// Editor/Reviewer must explicitly apply a suggestion before it affects content.
import { CONTENT_TYPES } from "../../utils/inbox.js";
import { logActivity } from "../../utils/logActivity.js";
import { WORKFLOW_STATUS, RESERVED_WORKFLOW_FIELDS } from "../../workflow/workflow.js";
import { stripWorkflowFields } from "../../workflow/workflowService.js";
import { AIAdapter, AIServiceError, isAIConfigured, aiConfigStatus } from "./aiAdapter.js";
import { buildPrompt, SUPPORTED_AI_ACTIONS } from "./prompts.js";
import {
  parseAIJSON,
  validateSuggestion,
  sanitizePlainText,
  AI_EDITABLE_FIELDS,
} from "./sanitize.js";

// Module-level adapter, replaceable for tests (never via a client request).
let adapterInstance = null;
export function configureAIAdapter(adapter) {
  adapterInstance = adapter;
}
function adapter() {
  if (adapterInstance) return adapterInstance;
  adapterInstance = new AIAdapter();
  return adapterInstance;
}

// Safe minimum subset of a content doc to send the provider. No secrets, no
// internal ids, no provenance metadata beyond the safe content the human sees.
function minimalContentFields(type, doc) {
  const pick = ["title", "description", "content", "category", "date", "time", "location"];
  const out = {};
  const obj = typeof doc === "object" && doc ? doc.toObject ? doc.toObject() : doc : {};
  for (const key of pick) {
    if (Object.hasOwn(obj, key) && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      let val = obj[key];
      if (key === "date" && doc[key] instanceof Date) val = doc[key].toISOString().slice(0, 10);
      out[key] = String(val);
    }
  }
  return out;
}

// Validate a requested action + content type up front.
function validateRequest(contentType, action) {
  const entry = CONTENT_TYPES.find((t) => t.type === contentType);
  if (!entry) return { error: "Unsupported content type.", status: 400 };
  if (!SUPPORTED_AI_ACTIONS.includes(action)) return { error: "Unsupported AI action.", status: 400 };
  return { entry };
}

async function safeLog(req, action, meta) {
  try {
    await logActivity({ req, action, resource: "ai-integration", resourceId: meta?.contentId || "ai", resourceLabel: "AI", meta });
  } catch {
    /* logging must never break the request */
  }
}

export function getStatus() {
  const { configured, provider, model } = aiConfigStatus();
  return { configured, provider, model, enabled: isAIConfigured() };
}

// ---------------------------------------------------------------------------
// Suggest — ephemeral only.
// ---------------------------------------------------------------------------
export async function suggest({ contentType, contentId, action, req }) {
  const check = validateRequest(contentType, action);
  if (check.error) return { error: check.error, status: check.status };
  const { entry } = check;

  let doc;
  try {
    doc = await entry.Model.findOne({ _id: contentId, deletedAt: null });
  } catch {
    return { error: "Invalid content id.", status: 400 };
  }
  if (!doc) return { error: "Content not found.", status: 404 };

  const fields = minimalContentFields(contentType, doc);

  let prompt;
  try {
    prompt = buildPrompt({ contentType, action, contentFields: fields });
  } catch (err) {
    return { error: err.message, status: 400 };
  }

  let rawText;
  try {
    const result = await adapter().generate({
      system: prompt.system,
      user: prompt.user,
      contentType,
      action,
    });
    rawText = result.text;
  } catch (err) {
    if (err instanceof AIServiceError) {
      await safeLog(req, "ai_request_failed", {
        contentId,
        contentType,
        action,
        reason: err.code,
        provider: aiConfigStatus().provider || null,
      });
      return { error: err.message, code: err.code, status: 503 };
    }
    await safeLog(req, "ai_request_failed", { contentId, contentType, action, reason: "unknown" });
    return { error: "AI provider failed.", code: "api_error", status: 503 };
  }

  // Parse + validate — malformed output is a SAFE error, never applied.
  let parsed;
  let validated;
  try {
    parsed = parseAIJSON(rawText);
    validated = validateSuggestion({ contentType, action, raw: parsed });
  } catch (err) {
    await safeLog(req, "ai_request_failed", {
      contentId,
      contentType,
      action,
      reason: "invalid_response",
      provider: aiConfigStatus().provider || null,
    });
    return { error: "AI returned an invalid or malformed suggestion.", code: "invalid_response", status: 503 };
  }

  await safeLog(req, "ai_suggestion", {
    contentId,
    contentType,
    action,
    provider: aiConfigStatus().provider || null,
  });

  // Return an EMPHERAL suggestion. Nothing is written to the DB here.
  return {
    suggestion: {
      action: validated.action,
      summary: validated.summary || `AI suggestion: ${validated.action}`,
      value: validated.value,
      tagValues: validated.tagValues || null,
      warnings: validated.warnings || [],
      model: aiConfigStatus().model || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Apply — explicit human action only.
// ---------------------------------------------------------------------------
// Rules:
//   - Must hold CONTENT_EDIT (so an editor can apply to their own draft).
//   - Content must be a DRAFT (or rejected -> follows revision: reset to draft).
//   - Never applies to pending_review/approved/published authoritative version.
//   - Workflow/provenance/publication fields are NEVER applied.
export async function applySuggestion({ contentType, contentId, action, value, req, userHasEdit }) {
  const check = validateRequest(contentType, action);
  if (check.error) return { error: check.error, status: check.status };
  const { entry } = check;

  if (!userHasEdit) return { error: "You do not have permission to edit content.", status: 403 };

  let doc;
  try {
    doc = await entry.Model.findOne({ _id: contentId, deletedAt: null });
  } catch {
    return { error: "Invalid content id.", status: 400 };
  }
  if (!doc) return { error: "Content not found.", status: 404 };

  const status = doc.status || WORKFLOW_STATUS.DRAFT;
  // AI may only apply to a draft, or to rejected content (which the existing
  // edit behavior returns to draft). It must NEVER silently mutate an
  // approved/published authoritative version.
  if (status && status !== WORKFLOW_STATUS.DRAFT && status !== WORKFLOW_STATUS.REJECTED) {
    return {
      error:
        status === WORKFLOW_STATUS.PUBLISHED
          ? "Published content cannot be modified by AI. Edit it manually to open a new draft, then re-review."
          : "This content is not in a draft state. AI suggestions can only be applied to drafts.",
      status: 409,
    };
  }

  // Build the patch from the validated suggestion value ONLY (never workflow,
  // provenance, publication, or reserved fields). `value` from the frontend is
  // NOT trusted as authoritative — we reconstruct it from the validated shape.
  const patch = buildApplyPatch(contentType, action, value);
  if (!patch) return { error: "The suggestion could not be applied to this content type.", status: 400 };

  const safePatch = stripWorkflowFields(patch); // belt-and-braces: never workflow fields

  // Apply only the allowed editable fields. If the content is non-draft
  // (REJECTED), the existing edit rule resets it to a draft for re-review.
  const set = { ...safePatch };
  if (status !== WORKFLOW_STATUS.DRAFT) {
    set.status = WORKFLOW_STATUS.DRAFT;
    set.published = false;
  }

  // Stamp AI usage metadata SEPARATELY from provenance (never overwrites
  // externalSource/externalId/externalMetadata).
  set.aiMetadata = {
    aiAssisted: true,
    lastAiAction: action,
    lastAiAt: new Date(),
    aiProvider: aiConfigStatus().provider || null,
    aiModel: aiConfigStatus().model || null,
  };

  const updated = await entry.Model.findByIdAndUpdate(doc._id, set, { new: true, runValidators: true });

  await safeLog(req, "ai_apply", {
    contentId: doc._id.toString(),
    contentType,
    action,
    provider: aiConfigStatus().provider || null,
  });

  return { content: updated };
}

// Rebuild an authoritative patch from a previously validated suggestion `value`
// so a client cannot smuggle arbitrary fields. Only known editable fields and
// only if the provided value coerces to valid content.
function buildApplyPatch(contentType, action, value) {
  const fields = AI_EDITABLE_FIELDS[contentType];
  if (!fields || !value || typeof value !== "object") return null;

  // Which field(s) this action may touch for this content type.
  const allowedTargets = actionTargetFields(action);
  if (!allowedTargets || allowedTargets.length === 0) return null;

  const patch = {};
  for (const field of allowedTargets) {
    if (!Object.hasOwn(value, field)) continue;
    const raw = value[field];
    const clean = sanitizePlainText(raw);
    if (!clean) continue;
    // category fields are enums on several models; only assign when the string
    // is a plain safe token; schema enum validation will reject invalid ones.
    if (field === "category") {
      // Category is an enum on gallery/achievements; keep only simple tokens.
      const token = sanitizePlainText(raw, 40);
      if (token) patch.category = token;
      continue;
    }
    patch[field] = clean;
  }

  // Event extraction maps to existing event fields only.
  if (action === "extract_event_details") {
    return {
      ...(typeof value?.title === "string" && sanitizePlainText(value.title) ? { title: sanitizePlainText(value.title) } : {}),
      ...(typeof value?.description === "string" && sanitizePlainText(value.description) ? { description: sanitizePlainText(value.description) } : {}),
      ...(typeof value?.time === "string" && sanitizePlainText(value.time, 100) ? { time: sanitizePlainText(value.time, 100) } : {}),
      ...(typeof value?.location === "string" && sanitizePlainText(value.location, 200) ? { location: sanitizePlainText(value.location, 200) } : {}),
      ...(typeof value?.date === "string" && !isNaN(new Date(value.date).getTime()) ? { date: new Date(value.date) } : {}),
    };
  }

  return patch;
}

// The editable field(s) an action is allowed to write per content type.
function actionTargetFields(action) {
  switch (action) {
    case "suggest_title":
      return ["title"];
    case "improve_description":
    case "summarize":
    case "generate_short_description":
    case "rewrite_notice":
      return ["description"];
    case "suggest_tags":
      return ["category"];
    case "generate_caption":
      // Captions are a publication aid. The schema has no "caption" field;
      // a caption is applied as a normal content edit to the description so it
      // stays human-editable and reviewable, OR returned for the FB publish UI.
      return ["description"];
    case "extract_event_details":
      return ["title", "date", "time", "location", "description"];
    default:
      return [];
  }
}

export { AIServiceError, RESERVED_WORKFLOW_FIELDS };