// Generic CRUD controller factory used by public content models
// (notices, events, gallery, achievements, facilities, activities).
//
// Adds on top of plain CRUD:
//  - soft delete / trash / restore / permanent delete
//  - search (by searchFields) + status filter + pagination on admin listing
//  - activity logging for create/update/delete/restore/permanent-delete
//  - Phase 7: content workflow enforcement. Clients can never set `status`,
//    `published`, or workflow metadata through CRUD; new items start as drafts;
//    editing non-draft content resets it to draft; trash/restore never re-publish.
import { logActivity } from "./logActivity.js";
import { badRequest } from "./httpError.js";
import { escapeRegex } from "./escapeRegex.js";
import { cleanupAttachments } from "./cloudinaryCleanup.js";
import { safeUrl } from "../integrations/facebook/sanitize.js";
import {
  WORKFLOW_STATUS,
  VALID_STATUSES,
  publishedQuery,
} from "../workflow/workflow.js";
import {
  stripWorkflowFields,
  initialWorkflowState,
  resolveStatus,
  publishedValueFor,
  normalizeStatus,
} from "../workflow/workflowService.js";

const allowedAttachmentFields = new Set([
  "name",
  "url",
  "publicId",
  "resourceType",
  "format",
  "size",
  "mimeType",
  "uploadedAt",
  "uploadedBy",
]);

function sanitizeAttachment(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`Attachment ${index} is invalid.`);
  }

  const safe = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowedAttachmentFields.has(key)) {
      continue;
    }

    if (key === "name") {
      if (typeof rawValue !== "string" || !rawValue.trim()) {
        throw badRequest(`Attachment ${index} name is required.`);
      }
      safe.name = rawValue.trim();
      continue;
    }

    if (key === "url") {
      if (typeof rawValue !== "string" || !rawValue.trim()) {
        throw badRequest(`Attachment ${index} URL is required.`);
      }
      const checked = safeUrl(rawValue.trim());
      if (!checked) {
        throw badRequest(`Attachment ${index} URL must be a valid http(s) URL.`);
      }
      safe.url = checked;
      continue;
    }

    if (key === "size") {
      const size = Number(rawValue);
      if (!Number.isFinite(size) || size < 0) {
        throw badRequest(`Attachment ${index} size is invalid.`);
      }
      safe.size = size;
      continue;
    }

    if (key === "uploadedAt" && rawValue) {
      const when = new Date(rawValue);
      if (!Number.isNaN(when.getTime())) safe.uploadedAt = when;
      continue;
    }

    if (key === "publicId" || key === "resourceType" || key === "format" || key === "mimeType") {
      if (rawValue !== undefined && rawValue !== null && typeof rawValue !== "string") {
        throw badRequest(`Attachment ${index} field '${key}' is invalid.`);
      }
      if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
        safe[key] = rawValue;
      }
      continue;
    }

    if (rawValue !== undefined && rawValue !== null) {
      safe[key] = rawValue;
    }
  }

  if (!safe.name || !safe.url) {
    throw badRequest(`Attachment ${index} must include a valid name and URL.`);
  }

  return safe;
}

function sanitizeAttachments(payload) {
  if (payload === undefined || payload === null) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item, index) => sanitizeAttachment(item, index));
  }
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed ? trimmed : [];
  }
  throw badRequest("attachments must be an array of objects.");
}

// Submitted attachments that match an existing attachment by _id are replaced
// with the server's own record (so publicId/resourceType/url can never be lost
// or forged by a round-trip through the admin form); only the display name may
// change. Anything else is treated as a new, sanitized entry.
function mergeAttachments(payload, existingAttachments = []) {
  if (!Array.isArray(payload)) return sanitizeAttachments(payload);
  const byId = new Map((existingAttachments || []).map((a) => [String(a._id), a]));
  return payload.map((raw, index) => {
    const match = raw && typeof raw === "object" && raw._id ? byId.get(String(raw._id)) : null;
    if (!match) return sanitizeAttachment(raw, index);
    const record = typeof match.toObject === "function" ? match.toObject() : { ...match };
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : record.name;
    return { ...record, name };
  });
}

const URL_FIELDS = ["image", "src", "certificateUrl", "attachmentUrl"];
const PROTECTED_FIELDS = ["_id", "__v", "createdAt", "updatedAt", "deletedAt"];

// Normalise a client payload before it reaches Mongoose.
function prepareBody(body, existing = null) {
  const out = { ...body };
  for (const key of PROTECTED_FIELDS) delete out[key];

  if (Object.hasOwn(out, "attachments")) {
    out.attachments = mergeAttachments(out.attachments, existing?.attachments);
  }

  for (const field of URL_FIELDS) {
    if (!Object.hasOwn(out, field)) continue;
    const value = out[field];
    if (value === undefined || value === null || value === "") {
      out[field] = value === null ? undefined : value;
      if (out[field] === undefined) delete out[field];
      continue;
    }
    if (typeof value !== "string") throw badRequest(`${field} must be a string.`);
    const checked = safeUrl(value.trim());
    if (!checked) throw badRequest(`${field} must be a valid http(s) URL.`);
    out[field] = checked;
  }

  // A blank date must not overwrite the model default with null (which the
  // site would later render as 1 Jan 1970).
  if (Object.hasOwn(out, "date") && (out.date === "" || out.date === null)) {
    delete out.date;
  }
  return out;
}

// resourceName: string used in activity logs / URLs, e.g. "notices"
// options.searchFields: fields to text-search across, e.g. ["title", "description"]
// options.labelField: field used as the human-readable label in logs, default "title"
export function crudFactory(Model, resourceName, options = {}) {
  const searchFields = options.searchFields || ["title"];
  const labelField = options.labelField || "title";

  return {
    // Public: published, non-trashed items only (status = published)
    getAll: async (req, res, next) => {
      try {
        const filter = publishedQuery();
        if (typeof req.query.category === "string" && req.query.category) filter.category = req.query.category;
        const cap = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 500));
        const items = await Model.find(filter).sort({ createdAt: -1 }).limit(cap);
        res.json({ success: true, count: items.length, data: items });
      } catch (err) {
        next(err);
      }
    },

    // Admin: all non-trashed items, with search/filter/pagination
    getAllAdmin: async (req, res, next) => {
      try {
        const { q, status, page = 1, limit = 50 } = req.query;
        const filter = { deletedAt: null };

        // Admins filter by workflow status (not the legacy published boolean).
        // Unknown/invalid status values are ignored rather than silently
        // returning everything, so a bogus filter maps to "all" only via `""`.
        if (status === "" || status === undefined || status === null) {
          // no status filter
        } else if (VALID_STATUSES.includes(status)) {
          filter.status = status;
        }

        if (q) {
          filter.$or = searchFields.map((field) => ({
            [field]: { $regex: escapeRegex(q), $options: "i" },
          }));
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

        const [items, total] = await Promise.all([
          Model.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
          Model.countDocuments(filter),
        ]);

        res.json({
          success: true,
          count: items.length,
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          data: items.map(normalizeStatus),
        });
      } catch (err) {
        next(err);
      }
    },

    // Admin: trashed items only
    getTrash: async (req, res, next) => {
      try {
        const items = await Model.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
        res.json({ success: true, count: items.length, data: items.map(normalizeStatus) });
      } catch (err) {
        next(err);
      }
    },

    getOne: async (req, res, next) => {
      try {
        const item = await Model.findOne({
          _id: req.params.id,
          ...publishedQuery(),
        });
        if (!item) {
          return res.status(404).json({ success: false, message: "Not found" });
        }
        res.json({ success: true, data: item });
      } catch (err) {
        next(err);
      }
    },

    create: async (req, res, next) => {
      try {
       const body = prepareBody(req.body);

       // Strip any client-authored workflow fields (status/published/metadata)
       // and always create as a DRAFT. Publication only happens via the workflow.
       const safeBody = { ...stripWorkflowFields(body), ...initialWorkflowState(body) };

       const item = await Model.create(safeBody);
       await logActivity({
         req,
         action: "create",
         resource: resourceName,
         resourceId: item._id.toString(),
         resourceLabel: item[labelField],
       });
       res.status(201).json({ success: true, data: item });
     } catch (err) {
       next(err);
     }
    },

    update: async (req, res, next) => {
     try {
       const existing = await Model.findOne({ _id: req.params.id, deletedAt: null });
       if (!existing) {
         return res.status(404).json({ success: false, message: "Not found" });
       }
       const body = prepareBody(req.body, existing);

       // Phase 7 edit rule: a client may edit field content, but never the
       // workflow state. Strip all workflow fields from the payload.
       const safeBody = stripWorkflowFields(body);

       // Editing any non-draft content resets it to DRAFT so no change to
       // approved/published content can go live without re-review. Pending
       // review content is not editable through CRUD until it returns to draft.
       const set = { ...safeBody };
       if (resolveStatus(existing) !== WORKFLOW_STATUS.DRAFT) {
         set.status = WORKFLOW_STATUS.DRAFT;
         set.published = false;
       }

       const item = await Model.findOneAndUpdate(
         { _id: req.params.id, deletedAt: null },
         set,
         { new: true, runValidators: true }
       );
       if (!item) {
         return res.status(404).json({ success: false, message: "Not found" });
       }
       await logActivity({
         req,
         action: "update",
         resource: resourceName,
         resourceId: item._id.toString(),
         resourceLabel: item[labelField],
       });
       res.json({ success: true, data: item });
     } catch (err) {
       next(err);
     }
    },

    // Soft delete -> moves the item to trash instead of removing it
    remove: async (req, res, next) => {
      try {
        const item = await Model.findOneAndUpdate(
          { _id: req.params.id, deletedAt: null },
          { deletedAt: new Date() },
          { new: true }
        );
        if (!item) {
          return res.status(404).json({ success: false, message: "Not found" });
        }
        await logActivity({
          req,
          action: "delete",
          resource: resourceName,
          resourceId: item._id.toString(),
          resourceLabel: item[labelField],
        });
        res.json({ success: true, message: "Moved to trash" });
      } catch (err) {
        next(err);
      }
    },

    restore: async (req, res, next) => {
      try {
        // Restoring NEVER re-publishes: trashed content returns as a DRAFT so a
        // restore cannot become a publishing bypass. The user still has to go
        // through the full workflow (submit -> approve -> publish) again.
        const item = await Model.findOneAndUpdate(
          { _id: req.params.id, deletedAt: { $ne: null } },
          { deletedAt: null, status: WORKFLOW_STATUS.DRAFT, published: false },
          { new: true }
        );
        if (!item) {
          return res.status(404).json({ success: false, message: "Not found in trash" });
        }
        await logActivity({
          req,
          action: "restore",
          resource: resourceName,
          resourceId: item._id.toString(),
          resourceLabel: item[labelField],
        });
        res.json({ success: true, data: item });
      } catch (err) {
        next(err);
      }
    },

    permanentDelete: async (req, res, next) => {
      try {
        const item = await Model.findOneAndDelete({
          _id: req.params.id,
          deletedAt: { $ne: null },
        });
        if (!item) {
          return res.status(404).json({ success: false, message: "Not found in trash" });
        }
        await cleanupAttachments(item);
        await logActivity({
          req,
          action: "permanent_delete",
          resource: resourceName,
          resourceId: item._id.toString(),
          resourceLabel: item[labelField],
        });
        res.json({ success: true, message: "Permanently deleted" });
      } catch (err) {
        next(err);
      }
    },

    // Bulk operations for the admin table's bulk-select actions
    bulkTrash: async (req, res, next) => {
      try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || !ids.length) {
          return res.status(400).json({ success: false, message: "No ids provided" });
        }
        await Model.updateMany(
          { _id: { $in: ids }, deletedAt: null },
          { deletedAt: new Date() }
        );
        await logActivity({
          req,
          action: "delete",
          resource: resourceName,
          resourceLabel: `${ids.length} item(s)`,
          meta: { ids },
        });
        res.json({ success: true, message: `${ids.length} item(s) moved to trash` });
      } catch (err) {
        next(err);
      }
    },

    bulkPublish: async (req, res, next) => {
      try {
        const { ids, published } = req.body;
        if (!Array.isArray(ids) || !ids.length) {
          return res.status(400).json({ success: false, message: "No ids provided" });
        }

        // Phase 7: bulk publish must enforce the same workflow as single
        // publish. Only `published` items may be unpublished and only `approved`
        // items may be published; anything else is skipped (not silently toggled).
        const action = published ? WORKFLOW_STATUS.PUBLISHED : WORKFLOW_STATUS.DRAFT;
        const fromStatus = published ? WORKFLOW_STATUS.APPROVED : WORKFLOW_STATUS.PUBLISHED;

        const items = await Model.find({ _id: { $in: ids }, deletedAt: null });
        const now = new Date();
        const results = { published: [], unpublished: [], skipped: [], failed: [], unauthorized: [], invalidState: [] };
        const toUpdate = [];

        for (const item of items) {
          const current = resolveStatus(item);
          const label = item[labelField] || item._id.toString();
          if (current === fromStatus) {
            const set = {
              status: action,
              published: publishedValueFor(action),
            };
            if (published) {
              set.publishedAt = now;
              set.publishedBy = req.user.id;
            } else {
              set.unpublishedAt = now;
              set.unpublishedBy = req.user.id;
            }
            toUpdate.push({ id: item._id, set });
            results[published ? "published" : "unpublished"].push({ id: item._id, label });
          } else {
            results.invalidState.push({ id: item._id, label, current });
          }
        }

        if (toUpdate.length) {
          const bulk = toUpdate.map(({ id, set }) => ({
            updateOne: { filter: { _id: id }, update: { $set: set } },
          }));
          await Model.bulkWrite(bulk);
        }

        await logActivity({
          req,
          action: published ? "publish" : "unpublish",
          resource: resourceName,
          resourceLabel: `${toUpdate.length} item(s)`,
          meta: { ids, published: published ? "published" : "draft" },
        });

        res.json({
          success: true,
          message: `${toUpdate.length} item(s) updated`,
          results,
          count: toUpdate.length,
        });
      } catch (err) {
        next(err);
      }
    },
  };
}
