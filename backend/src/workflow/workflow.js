// Phase 7 — Content Workflow for Editorial Content (Notices, Events, Gallery,
// Achievements, Facilities, Activities).
//
// Central definition of:
//   - the workflow STATUS vocabulary
//   - the allowed state-transition map (state machine)
//   - the permission required for each transition
//   - the document field block used by every workflow-eligible model
//   - helpers to sanitize client input and keep `status`/`published` in sync.
//
// `status` is the source of truth. `published` is a DERIVED mirror that the
// backend always computes from `status` so legacy public queries that filter on
// `published: true` keep working and can never contradict `status`.
//
// The security rule: a client can NEVER write `status`, `published`, or any of
// the *By/*At metadata through normal CRUD. Only the dedicated workflow actions
// below may change workflow state.
import mongoose from "mongoose";

export const WORKFLOW_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  PUBLISHED: "published",
  REJECTED: "rejected",
});

export const VALID_STATUSES = Object.values(WORKFLOW_STATUS);

// Which workflow statuses are publicly visible.
export const PUBLIC_STATUSES = Object.freeze([WORKFLOW_STATUS.PUBLISHED]);

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
// transition = { fromStatus, toStatus, action, permissionKey, requireReason }
// `action` is the verb logged to ActivityLog; `permissionKey` is the PERMISSIONS
// constant required to perform it.
export const TRANSITIONS = Object.freeze([
  { action: "submit", fromStatus: WORKFLOW_STATUS.DRAFT, toStatus: WORKFLOW_STATUS.PENDING_REVIEW, permissionKey: "CONTENT_SUBMIT" },
  { action: "review", fromStatus: WORKFLOW_STATUS.PENDING_REVIEW, toStatus: WORKFLOW_STATUS.APPROVED, permissionKey: "CONTENT_APPROVE" },
  { action: "approve", fromStatus: WORKFLOW_STATUS.PENDING_REVIEW, toStatus: WORKFLOW_STATUS.APPROVED, permissionKey: "CONTENT_APPROVE" },
  { action: "reject", fromStatus: WORKFLOW_STATUS.PENDING_REVIEW, toStatus: WORKFLOW_STATUS.REJECTED, permissionKey: "CONTENT_REJECT", requireReason: true },
  { action: "publish", fromStatus: WORKFLOW_STATUS.APPROVED, toStatus: WORKFLOW_STATUS.PUBLISHED, permissionKey: "CONTENT_PUBLISH" },
  { action: "unpublish", fromStatus: WORKFLOW_STATUS.PUBLISHED, toStatus: WORKFLOW_STATUS.DRAFT, permissionKey: "CONTENT_UNPUBLISH" },
]);

// Returns the transition that leads from `from` to `to` (or null).
export function getTransition(from, to) {
  return TRANSITIONS.find((t) => t.fromStatus === from && t.toStatus === to) || null;
}

// Whether `to` is an allowed direct successor of `from` under the given action.
export function canTransition(from, action) {
  return TRANSITIONS.some((t) => t.fromStatus === from && t.action === action);
}

// ---------------------------------------------------------------------------
// Document fields (shared by every workflow-eligible model)
// ---------------------------------------------------------------------------
// `status` defaults are computed lazily below (cannot reference `this.published`
// inside the schema object literal cleanly, so we use a function default).
export function workflowStatusField() {
  return {
    type: String,
    enum: VALID_STATUSES,
    default: WORKFLOW_STATUS.DRAFT,
    index: true,
  };
}

// MongoDB query used by PUBLIC endpoints to expose only published, non-trashed
// content (secure against draft/pending/approved/rejected leakage).
//
// Matches modern docs (status == 'published') AND legacy docs that predate the
// status field (published == true, status not set) so no existing public
// content disappears during the transition. Mongo's $or handles both.
export function publishedQuery() {
  return {
    deletedAt: null,
    $or: [
      { status: WORKFLOW_STATUS.PUBLISHED },
      { status: { $exists: false }, published: true },
    ],
  };
}

// The set of workflow fields that must NEVER be accepted from a client on
// create/update. Stripped by crudFactory before persistence.
export const RESERVED_WORKFLOW_FIELDS = Object.freeze([
  "status",
  "published",
  "submittedBy",
  "submittedAt",
  "reviewedBy",
  "reviewedAt",
  "approvedBy",
  "approvedAt",
  "publishedBy",
  "publishedAt",
  "rejectedBy",
  "rejectedAt",
  "unpublishedAt",
  "unpublishedBy",
  "rejectionReason",
  // Phase 9: external-import provenance. Only the Facebook import service may
  // write these; a client must never be able to stamp fake import provenance
  // (or use it to bypass the workflow). Stripped by crudFactory like the rest.
  "externalSource",
  "externalId",
  "externalMetadata",
  // Phase 10: AI assistance metadata. Backend-written only, never client- or
  // frontend-supplied; a client must never forge "aiAssisted"/AI provenance.
  "aiMetadata",
  // Phase 11: Facebook publication metadata. Backend-written only by the
  // publishing service (distinct from import provenance in externalMetadata).
  // A client must never forge a published FB post id or fake a publication.
  "facebookPublication",
]);

// Mongoose field definitions (shared by every workflow-eligible model). Keep
// `published` as a real field for backward compatibility, but it is now
// strictly derived from `status` by the backend and never client-authoritative.
export const contentWorkflowFields = {
  status: workflowStatusField(),
  submittedAt: { type: Date },
  submittedBy: { type: String, ref: "User" },
  reviewedAt: { type: Date },
  reviewedBy: { type: String, ref: "User" },
  approvedAt: { type: Date },
  approvedBy: { type: String, ref: "User" },
  publishedAt: { type: Date },
  publishedBy: { type: String, ref: "User" },
  rejectedAt: { type: Date },
  rejectedBy: { type: String, ref: "User" },
  unpublishedAt: { type: Date },
  unpublishedBy: { type: String, ref: "User" },
  rejectionReason: { type: String },
  // source tracking foundation (Phase 8/9 readiness), default manual.
  source: { type: String, enum: ["manual", "facebook_import", "ai_assisted"], default: "manual" },
  // Phase 9: external-import provenance. These are NULL for normal content and
  // only populated by the Facebook import service. `externalId` is sparse-indexed
  // so duplicate-detection queries (source + externalId) stay fast without
  // bloating the index with the overwhelming majority of non-imported records.
  externalSource: { type: String, default: null },
  externalId: { type: String, default: null, index: { sparse: true } },
  externalMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
  // Phase 10: minimal AI assistance metadata. Never stores prompts/responses or
  // secrets — only a marker + the last (safe) action + provider/model name.
  // Kept separate from externalMetadata so AI usage can never overwrite
  // Facebook import provenance.
  aiMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Phase 11: metadata about a human-triggered Facebook publication of this
  // content. Distinct field so publishing NEVER overwrites the original import
  // provenance (externalSource/externalId/externalMetadata).
  facebookPublication: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
};