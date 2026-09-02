// Phase 8 — Content Inbox: shared helpers to aggregate across the 6
// workflow-eligible content resources (Notices, Events, Gallery, Achievements,
// Facilities, Activities) without a heavy full-scan.
//
// Efficiency: we query each resource with a bounded, index-friendly filter
// (status enum index, source, createdAt, deletedAt) rather than loading every
// document. Counts are produced per-resource/per-status with countDocuments,
// which is as cheap as aggregation for the status.split dimension while
// returning a clean cross-tab the frontend can render directly.
import Notice from "../models/Notice.js";
import Event from "../models/Event.js";
import GalleryImage from "../models/GalleryImage.js";
import Achievement from "../models/Achievement.js";
import Facility from "../models/Facility.js";
import Activity from "../models/Activity.js";
import { WORKFLOW_STATUS, VALID_STATUSES } from "../workflow/workflow.js";

// Registry used by the inbox (and review workspace). Order controls the
// "Content Type" filter ordering in the UI.
export const CONTENT_TYPES = Object.freeze([
  { type: "notices", label: "Notices", Model: Notice },
  { type: "events", label: "Events", Model: Event },
  { type: "gallery", label: "Gallery", Model: GalleryImage },
  { type: "achievements", label: "Achievements", Model: Achievement },
  { type: "facilities", label: "Facilities", Model: Facility },
  { type: "activities", label: "Activities", Model: Activity },
]);

// Priority ordering for the inbox (used as the primary sort). Pending review
// floats to the top; within a priority we order oldest-first by submittedAt
// (falling back to createdAt) so reviewers see the longest-waiting item.
const PRIORITY = Object.freeze({
  [WORKFLOW_STATUS.PENDING_REVIEW]: 0,
  [WORKFLOW_STATUS.REJECTED]: 1,
  [WORKFLOW_STATUS.DRAFT]: 2,
  [WORKFLOW_STATUS.APPROVED]: 3,
  [WORKFLOW_STATUS.PUBLISHED]: 4,
});

export function priorityOf(status) {
  return PRIORITY[status] ?? 5;
}

const VALID_SOURCES = Object.freeze(["manual", "facebook_import", "ai_assisted"]);

// Build the MongoDB filter shared by every resource for the inbox list.
// `status`/`source` are validated against their enums so a bogus value does not
// silently return everything; `type` is handled by the caller (which resource
// to query). Legacy docs (no `status` but `published: true`) are normalized.
export function buildInboxFilter({ status, source, q, createdBy, before, after, searchFields }) {
  const filter = { deletedAt: null };

  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  } else if (status && status === WORKFLOW_STATUS.PUBLISHED) {
    // Legacy published docs carry published:true without status; treat them as
    // published for filtering too.
    filter.$or = [{ status: WORKFLOW_STATUS.PUBLISHED }, { status: { $exists: false }, published: true }];
  } else if (status) {
    // Unknown status: return nothing for this filter rather than everything.
    filter._id = { $in: [] };
  }

  if (source && VALID_SOURCES.includes(source)) {
    filter.source = source;
  } else if (source) {
    filter._id = { $in: [] };
  }

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$and = filter.$and || [];
    if (filter.$or) {
      // merge: keep top-level status $or and add a search $or
      const statusOr = filter.$or;
      delete filter.$or;
      filter.$and.push({ $or: statusOr });
    }
    filter.$and.push({ $or: searchFields.map((f) => ({ [f]: regex })) });
  }

  if (before || after) {
    filter.createdAt = {};
    if (before) filter.createdAt.$lte = new Date(before);
    if (after) filter.createdAt.$gte = new Date(after);
  }

  return filter;
}

// Searchable/label fields per resource, used for inbox search + deduplication.
const RESOURCE_SEARCH_FIELDS = {
  notices: ["title", "description", "content", "category"],
  events: ["title", "description", "location"],
  gallery: ["title"],
  achievements: ["title", "description", "year", "category"],
  facilities: ["title", "description"],
  activities: ["title", "description"],
};

export function searchFieldsFor(type) {
  return RESOURCE_SEARCH_FIELDS[type] || ["title"];
}

// Convert a raw mongoose document to a uniform inbox row.
export function toInboxItem(type, doc, labelField = "title") {
  return {
    _id: doc._id.toString(),
    type,
    title: doc.title || doc.name || doc._id.toString(),
    status: doc.status || (doc.published === true ? WORKFLOW_STATUS.PUBLISHED : WORKFLOW_STATUS.DRAFT),
    source: doc.source || "manual",
    // Phase 9: external import provenance (surfaced in the review workspace).
    externalSource: doc.externalSource || null,
    externalId: doc.externalId || null,
    permalink: doc.externalMetadata?.permalink || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    category: doc.category || "",
    date: doc.date || null,
    pinned: Boolean(doc.pinned),
    aiAssisted: Boolean(doc.aiMetadata?.aiAssisted),
    aiMetadata: doc.aiMetadata || null,
    facebookPublication: doc.facebookPublication || null,
    labelField,
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).getTime() : null,
  };
}

// Effective "waiting since" for priority ordering: submitted time for pending,
// otherwise createdAt.
export function waitingSince(item) {
  if (item.status === WORKFLOW_STATUS.PENDING_REVIEW && item.submittedAt) return item.submittedAt;
  return new Date(item.createdAt || 0).getTime();
}