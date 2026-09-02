// Phase 7 — Reusable workflow service.
//
// Provides:
//   - applyTransition(Model, doc, action, { req, reason }) -> performs an
//     allowed workflow transition with full permission + state validation,
//     sets status/published + metadata, and returns the updated doc.
//   - migration helpers for legacy documents that lack a `status`.
//   - CRUD integration helpers used by crudFactory to prevent workflow-field
//     injection and to reset status on edit.
import {
  WORKFLOW_STATUS,
  VALID_STATUSES,
  TRANSITIONS,
  RESERVED_WORKFLOW_FIELDS,
} from "./workflow.js";
import { logActivity } from "../utils/logActivity.js";
import { roleHasPermission, PERMISSIONS } from "../permissions.js";

class WorkflowError extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
    this.name = "WorkflowError";
  }
}

// Resolve a document's current workflow status, tolerating legacy docs that
// predate the `status` field (backward compatibility). A doc with only
// `published` set is derived: published:true -> 'published', else 'draft'.
export function resolveStatus(doc) {
  if (doc.status && VALID_STATUSES.includes(doc.status)) {
    return doc.status;
  }
  return doc.published === true ? WORKFLOW_STATUS.PUBLISHED : WORKFLOW_STATUS.DRAFT;
}

// Derived `published` mirror for a status (keeps the two in sync).
export function publishedValueFor(status) {
  return status === WORKFLOW_STATUS.PUBLISHED;
}

// Strip any workflow field that a client is not allowed to write directly.
// Used by crudFactory create/update so a malicious `{ status: "published" }`
// or `{ published: true }` payload can never bypass the workflow.
export function stripWorkflowFields(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const safe = { ...payload };
  for (const key of RESERVED_WORKFLOW_FIELDS) {
    delete safe[key];
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Public migration / normalization
// ---------------------------------------------------------------------------
// Ensure a freshly-read document has an explicit `status` (legacy docs don't).
// Mutates the in-memory doc only (does NOT persist) so reads can rely on
// `status`, while legacy publication state is preserved on disk.
export function normalizeStatus(doc) {
  if (!doc) return doc;
  doc.status = resolveStatus(doc);
  doc.published = publishedValueFor(doc.status);
  return doc;
}

// Given the document that the model intends to save on create, stamp a safe
// initial workflow state. New content always starts as a DRAFT unless a legacy
// `published: true` was explicitly intended (we do NOT trust the client — see
// stripWorkflowFields). Editors/admins create as drafts; publication happens
// only through the workflow.
export function initialWorkflowState(body) {
  return {
    status: WORKFLOW_STATUS.DRAFT,
    published: false,
  };
}

// ---------------------------------------------------------------------------
// Transition orchestration
// ---------------------------------------------------------------------------
// meta describes the transition's *By/*At field pair for each action.
const TRANSITION_META = {
  submit: { at: "submittedAt", by: "submittedBy" },
  review: { at: "reviewedAt", by: "reviewedBy" },
  approve: { at: "approvedAt", by: "approvedBy" },
  reject: { at: "rejectedAt", by: "rejectedBy" },
  publish: { at: "publishedAt", by: "publishedBy" },
  unpublish: { at: "unpublishedAt", by: "unpublishedBy" },
};

// Perform `action` on the given document. Requires an authenticated user in
// `req.user` whose CURRENT role (already resolved by reusing the DB-backed
// requirePermission) holds the transition's permission.
export async function applyTransition(Model, doc, action, { req, reason, resource } = {}) {
  const fromStatus = resolveStatus(doc);
  const transition = TRANSITIONS.find((t) => t.action === action && t.fromStatus === fromStatus);

  if (!transition) {
    throw new WorkflowError(
      `Invalid workflow transition: ${action} is not allowed from "${fromStatus}".`,
      409
    );
  }

  // Re-check permission defensively (requirePermission should already have done
  // this, but belt-and-braces so a future refactor cannot bypass it).
  const role = req?.user?.role;
  if (!roleHasPermission(role, PERMISSIONS[transition.permissionKey])) {
    throw new WorkflowError("You do not have permission to perform this action.", 403);
  }

  if (transition.requireReason) {
    const trimmed = typeof reason === "string" ? reason.trim() : "";
    if (!trimmed) {
      throw new WorkflowError("A rejection reason is required.", 422);
    }
  }

  const now = new Date();
  const set = {
    status: transition.toStatus,
    published: publishedValueFor(transition.toStatus),
  };
  const meta = TRANSITION_META[action];
  if (meta) {
    set[meta.at] = now;
    set[meta.by] = req.user.id;
  }
  // An approval also reflects the review, so stamp reviewedAt/reviewedBy too.
  if (action === "approve") {
    set.reviewedAt = now;
    set.reviewedBy = req.user.id;
  }
  if (action === "reject") {
    set.rejectionReason = typeof reason === "string" ? reason.trim() : "";
  }

  const updated = await Model.findByIdAndUpdate(doc._id, set, { new: true, runValidators: true });

  const resourceLabel = doc.title || doc.name || doc._id.toString();
  await logActivity({
    req,
    action,
    resource: resource || doc.constructor?.modelName?.toLowerCase() || "content",
    resourceId: doc._id.toString(),
    resourceLabel,
    meta: { fromStatus, toStatus: transition.toStatus, reason },
  });

  return updated;
}

export { WorkflowError };

// Re-export for route wiring convenience.
export { WORKFLOW_STATUS, TRANSITIONS };