// Phase 7 — Reusable workflow controller/handler factory.
//
// Wires the workflow service into Express routes for any editorial resource
// (notices, events, gallery, achievements, facilities, activities).
//
// Each returned handler:
//   - requires the caller to hold the transition's permission
//     (requirePermission(PERMISSIONS.X) is applied at the route level in the
//     resource routes, but applyTransition re-checks defensively)
//   - loads the document, validates it is not trashed,
//   - applies the allowed transition via workflowService.applyTransition,
//   - returns the updated document.
import {
  WORKFLOW_STATUS,
  getTransition,
  canTransition,
  VALID_STATUSES,
} from "./workflow.js";
import { applyTransition, WorkflowError } from "./workflowService.js";

function makeActionHandler(Model, resourceName, action) {
  return async (req, res, next) => {
    try {
      const doc = await Model.findOne({ _id: req.params.id, deletedAt: null });
      if (!doc) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      const reason = action === "reject" ? req.body?.reason : undefined;
      const updated = await applyTransition(Model, doc, action, { req, reason, resource: resourceName });

      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof WorkflowError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  };
}

// Build the set of workflow route handlers for a resource.
export function workflowActions(Model, resourceName) {
  return {
    submit: makeActionHandler(Model, resourceName, "submit"),
    review: makeActionHandler(Model, resourceName, "review"),
    approve: makeActionHandler(Model, resourceName, "approve"),
    reject: makeActionHandler(Model, resourceName, "reject"),
    publish: makeActionHandler(Model, resourceName, "publish"),
    unpublish: makeActionHandler(Model, resourceName, "unpublish"),
  };
}

// Re-export workflow vocabulary so routes can reference statuses/transitions.
export { WORKFLOW_STATUS, canTransition, VALID_STATUSES };