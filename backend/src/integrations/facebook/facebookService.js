// Phase 9 — Facebook import service.
//
// Implements the ONLY allowed import lifecycle:
//   Facebook -> adapter -> validate/sanitize -> deduplicate (source+externalId)
//   -> DRAFT -> Content Inbox -> human review -> Phase 7 workflow -> published.
//
// It is the authority that:
//   - prevents Facebook from ever auto-publishing (every record is a DRAFT)
//   - guarantees idempotency (same externalId is never imported twice)
//   - sanitizes untrusted Facebook text/media
//   - reuses the existing models (via the workflow field block), ActivityLog,
//     Cloudinary, and Phase 7 workflow.
//
// This file holds NO route logic and NO raw HTTP — all Facebook traffic goes
// through the injectable adapter so tests can run fully offline.
import { WORKFLOW_STATUS } from "../../workflow/workflow.js";
import { logActivity } from "../../utils/logActivity.js";
import { CONTENT_TYPES } from "../../utils/inbox.js";
import cloudinary, { isCloudinaryConfigured } from "../../config/cloudinary.js";
import { isR2Configured, uploadToR2 } from "../../config/r2.js";
import FacebookSync from "../../models/FacebookSync.js";
import {
  FacebookAdapter,
  isFacebookConfigured,
  FacebookError,
} from "./facebookAdapter.js";
import {
  sanitizePlainText,
  titleFromMessage,
  safeUrl,
  validateMedia,
} from "./sanitize.js";

// Module-level adapter, replaceable for tests (never via a client request).
let adapterInstance = null;
export function configureFacebookAdapter(adapter) {
  adapterInstance = adapter;
}
function adapter() {
  if (adapterInstance) return adapterInstance;
  adapterInstance = new FacebookAdapter();
  return adapterInstance;
}

export const FACEBOOK_SOURCE = "facebook_import";

// Default import target (used when the admin does not pick one). Safe default.
const DEFAULT_TARGET = "notices";

const TARGET_DEFAULTS = {
  events: (post, now) => ({
    date: safeDate(post?.createdTime) || now,
    time: null,
    location: "Imported from Facebook",
  }),
  achievements: (post, now) => ({
    year: String(new Date(now).getFullYear()),
    category: "School",
  }),
  gallery: () => ({ category: "Events" }), // src handled below (media required)
};

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function validateTarget(type) {
  if (!CONTENT_TYPES.some((t) => t.type === type)) {
    return { error: "Unknown content type for import target." , ok: false };
  }
  return { ok: true };
}

function targetModel(type) {
  return CONTENT_TYPES.find((t) => t.type === type).Model;
}

const FIRST_IMAGE = (post) => {
  if (!Array.isArray(post?.media)) return null;
  const image = post.media.find((m) => m.type === "image" && safeUrl(m.url));
  return image ? safeUrl(image.url) : null;
};

function buildDoc(post, targetType, now = new Date()) {
  const message = sanitizePlainText(post?.message);
  const title = titleFromMessage(message, post?.externalId);
  const permalink = safeUrl(post?.permalink);

  // Target-aware required field defaults so every content model gets a valid
  // document without inventing a parallel schema.
  const extra = (TARGET_DEFAULTS[targetType] || (() => ({})))(post, now);

  let src = null;
  if (targetType === "gallery") {
    src = FIRST_IMAGE(post);
    // Gallery images need a real media src; a gallery record without an image
    // is invalid, so callers reject it before creation (media mandatory here).
    if (!src && message) src = null;
  }

  return {
    title,
    description: message || `Imported from Facebook (${post?.externalId || "unknown"}).`,
    content: message || "",
    ...(targetType === "gallery" && src ? { src } : {}),
    ...extra,
    // Provenance — always stamped, never client-supplied.
    source: FACEBOOK_SOURCE,
    externalSource: "facebook",
    externalId: post?.externalId || null,
    externalMetadata: post
      ? {
          permalink,
          importedAt: now,
          originalMessage: message,
          createdTime: post?.createdTime ? safeDate(post.createdTime)?.toISOString() || null : null,
          updatedTime: post?.updatedTime ? safeDate(post.updatedTime)?.toISOString() || null : null,
        }
      : null,
    // Workflow: ALWAYS a fresh draft. A public Facebook post does not mean the
    // website content is approved.
    status: WORKFLOW_STATUS.DRAFT,
    published: false,
  };
}

// Ferguson: archive-style dedup — does this (source, externalId) already exist?
async function findExisting(targetType, externalId) {
  if (!externalId) return null;
  const Model = targetModel(targetType);
  return Model.findOne({ source: FACEBOOK_SOURCE, externalId }).lean();
}

// Best-effort media import. Text importing first, media failure is recorded but
// never discards the draft. Returns a safe status string for telemetry.
async function importMedia(post, Model, docId, now) {
  if (!isR2Configured() && !isCloudinaryConfigured()) {
    return { ok: false, skipped: true, reason: "Storage not configured; media skipped." };
  }
  if (!Array.isArray(post?.media) || post.media.length === 0) {
    return { ok: true, skipped: true, reason: "No media on this post." };
  }
  const image = post.media.find((m) => m.type === "image" && safeUrl(m.url));
  if (!image) {
    return { ok: true, skipped: true, reason: "No importable image attachment." };
  }

  try {
    const buffer = await fetchWithTimeout(safeUrl(image.url));
    if (!buffer || buffer.length === 0) {
      return { ok: false, reason: "Could not download media." };
    }
    const mime = guessMime(buffer);
    const check = validateMedia({ mimeType: mime, size: buffer.length });
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    let url;
    let publicId;
    let format = "jpg";
    let bytes = buffer.length;

    if (isR2Configured()) {
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const uploaded = await uploadToR2({
        buffer,
        originalname: `fb-${post.externalId || "post"}.${ext}`,
        mimetype: mime,
        folder: "facebook",
      });
      url = uploaded.url;
      publicId = uploaded.publicId;
      format = uploaded.format;
      bytes = uploaded.bytes;
    } else {
      const uploaded = await uploadToCloudinary(buffer, mime);
      url = uploaded.secure_url;
      publicId = uploaded.public_id;
      format = uploaded.format || "jpg";
      bytes = uploaded.bytes || buffer.length;
    }

    // Reuse Phase 5B: store as an attachment on the content doc.
    const doc = await Model.findById(docId);
    if (doc) {
      const attachments = Array.isArray(doc.attachments) ? doc.attachments : [];
      attachments.push({
        name: `facebook-${post.externalId || "post"}-${Date.now()}`,
        url,
        publicId,
        resourceType: "image",
        format: result.format || "jpg",
        size: result.bytes || buffer.length,
        mimeType: mime,
        uploadedAt: now,
      });
      doc.attachments = attachments;
      await doc.save();
    }

    return { ok: true, url, publicId };
  } catch (err) {
    return { ok: false, reason: "Media import failed." };
  }
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("download failed");
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } finally {
    clearTimeout(t);
  }
}

const magic = [
  { sig: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { sig: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { sig: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
  { sig: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },
];
function guessMime(buf) {
  for (const m of magic) {
    if (m.sig.every((b, i) => buf[i] === b)) return m.mime;
  }
  return "application/octet-stream";
}

async function uploadToCloudinary(buffer, mime) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kmes-school/facebook",
        resource_type: "image",
        overwrite: false,
      },
      (error, uploaded) => (error ? reject(error) : resolve(uploaded))
    );
    stream.end(buffer);
  });
}

// Persist operation telemetry (no secrets).
async function recordSync({ kind, status, message, counts, req }) {
  try {
    await FacebookSync.create({
      kind,
      status,
      message: String(message || "").slice(0, 500),
      imported: counts?.imported || 0,
      skippedDuplicates: counts?.skippedDuplicates || 0,
      failed: counts?.failed || 0,
      triggeredBy: req?.user?.name || "System",
      meta: counts,
    });
  } catch {
    /* telemetry must never break the request */
  }
}

async function log(req, action, meta) {
  try {
    await logActivity({ req, action, resource: "facebook-integration", resourceId: "facebook", resourceLabel: "Facebook", meta });
  } catch {
    /* logging must never break the request */
  }
}

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

export async function getStatus() {
  const configured = isFacebookConfigured();

  let lastConnection = await FacebookSync.findOne({ kind: "connection" }).sort({ createdAt: -1 }).lean().catch(() => null);
  let lastSync = await FacebookSync.findOne({ kind: "sync" }).sort({ createdAt: -1 }).lean().catch(() => null);
  let lastImport = await FacebookSync.findOne({ kind: "import" }).sort({ createdAt: -1 }).lean().catch(() => null);

  return {
    configured,
    // Never expose tokens/credentials.
    status: configured ? "configured" : "not_configured",
    pageId: process.env.FACEBOOK_PAGE_ID ? "configured" : null,
    lastConnectionTest: lastConnection
      ? { status: lastConnection.status, at: lastConnection.createdAt, message: lastConnection.message }
      : null,
    lastSync: lastSync
      ? {
          status: lastSync.status,
          at: lastSync.createdAt,
          imported: lastSync.imported,
          skippedDuplicates: lastSync.skippedDuplicates,
          failed: lastSync.failed,
        }
      : null,
    lastImport: lastImport
      ? {
          status: lastImport.status,
          at: lastImport.createdAt,
          imported: lastImport.imported,
          skippedDuplicates: lastImport.skippedDuplicates,
          failed: lastImport.failed,
        }
      : null,
    lastError: [lastConnection, lastSync, lastImport].find((r) => r?.status === "error")?.message || null,
  };
}

export async function testConnection(req) {
  const a = adapter();
  const result = await a.testConnection();

  if (result.connected) {
    await recordSync({ kind: "connection", status: "success", message: `Connected to page "${result.pageName}".`, req });
    await log(req, "facebook_connection_test", { result: "connected", pageId: result.pageId, pageName: result.pageName });
    return { connected: true, pageId: result.pageId, pageName: result.pageName };
  }

  await recordSync({ kind: "connection", status: "error", message: result.reason || "Connection failed", req });
  await log(req, "facebook_connection_test", { result: "error" });
  return { connected: false, reason: result.reason || "Connection failed" };
}

// Fresh fetch of recent posts for preview (NO writes).
export async function listPosts({ limit, req }) {
  const a = adapter();
  const { posts } = await a.getRecentPosts({ limit });
  return posts.map((p) => ({
    externalId: p.externalId,
    message: sanitizePlainText(p.message),
    permalink: safeUrl(p.permalink),
    createdTime: p.createdTime,
    updatedTime: p.updatedTime,
    hasMedia: Boolean(p.media && p.media.some((m) => m.type === "image")),
  }));
}

export async function getPostById(postId, req) {
  const a = adapter();
  const post = await a.getPost(postId);
  return {
    externalId: post.externalId,
    message: sanitizePlainText(post.message),
    permalink: safeUrl(post.permalink),
    createdTime: post.createdTime,
    updatedTime: post.updatedTime,
    media: (post.media || []).map((m) => ({ type: m.type, url: safeUrl(m.url) })).filter((m) => m.url),
  };
}

// Import a specific set of posts as DRAFTS. Idempotent. Returns counts.
export async function importSelectedPosts({ posts, targetType, req }) {
  const target = validateTarget(targetType || DEFAULT_TARGET);
  const effectiveTarget = target.ok ? targetType : DEFAULT_TARGET;
  const counts = { imported: 0, skippedDuplicates: 0, failed: 0 };
  const results = [];

  const now = new Date();
  for (const raw of posts) {
    try {
      const postId = raw?.externalId || raw?.id;
      const externalId = validateExternalId(postId);
      if (!externalId) {
        counts.failed++;
        results.push({ externalId: postId || null, status: "failed", reason: "Post is missing a valid external id." });
        continue;
      }
      const existing = await findExisting(effectiveTarget, externalId);
      if (existing) {
        counts.skippedDuplicates++;
        await log(req, "facebook_skipped", { externalId, result: "already_imported", contentId: existing._id });
        results.push({ externalId, status: "already_imported", contentId: existing._id.toString() });
        continue;
      }

      // Gallery records cannot exist without an image (required src field).
      if (effectiveTarget === "gallery" && !FIRST_IMAGE(raw)) {
        counts.failed++;
        await log(req, "facebook_import", { externalId, contentId: null, targetType: effectiveTarget, media: "failed", reason: "gallery needs media" });
        results.push({ externalId, status: "failed", reason: "Gallery import requires an image." });
        continue;
      }

      const Model = targetModel(effectiveTarget);
      const body = buildDoc(raw, effectiveTarget, now);
      const doc = await Model.create(body);

      // Media is best-effort: text/record import succeeded.
      const mediaResult = await importMedia(raw, Model, doc._id, now);
      if (mediaResult.ok === false) {
        counts.failed++;
      }
      counts.imported++;

      await log(req, "facebook_import", {
        externalId,
        contentId: doc._id.toString(),
        targetType: effectiveTarget,
        media: mediaResult.skipped ? "skipped" : mediaResult.ok ? "uploaded" : "failed",
      });
      results.push({ externalId, status: "imported", contentId: doc._id.toString() });
    } catch (err) {
      counts.failed++;
      results.push({ externalId: raw?.externalId || null, status: "failed", reason: "Import failed." });
    }
  }

  await recordSync({ kind: "import", status: counts.failed ? "error" : "success", message: `Imported ${counts.imported}, skipped ${counts.skippedDuplicates}, failed ${counts.failed}.`, counts, req });

  return { ...counts, results };
}

// Sync: fetch recent posts and import anything new (idempotent, bounded).
export async function sync({ limit, targetType, req }) {
  const a = adapter();
  const { posts } = await a.getRecentPosts({ limit });
  const result = await importSelectedPosts({ posts, targetType, req });
  await recordSync({ kind: "sync", status: result.failed ? "error" : "success", message: `Sync complete: ${result.imported} imported, ${result.skippedDuplicates} skipped, ${result.failed} failed.`, counts: result, req });
  return result;
}

// ---------------------------------------------------------------------------
// Phase 11 — publish content to Facebook (explicit human action only).
//
// Eligibility (all backend-enforced, none trusted from the frontend):
//   1. Request is authenticated (requireAuth at the route).
//   2. Caller holds SOCIAL_PUBLISH (requirePermission at the route).
//   3. Content exists and is not trashed.
//   4. Content is CMS-PUBLISHED (a human must have published it on the website
//      through the Phase 7 workflow BEFORE it can be pushed to Facebook).
//   5. Facebook is configured + connection valid.
//   6. Not already published to Facebook (duplicate protection) — unless the
//      caller passes allowRepublish=true after refetching.
//
// Provenance is preserved: original import provenance (externalSource/
// externalId/externalMetadata) is NEVER overwritten. The new social publication
// is stored in a SEPARATE `facebookPublication` field.
// ---------------------------------------------------------------------------
export async function publishContent({ contentType, contentId, caption, req, allowRepublish = false }) {
  const entry = CONTENT_TYPES.find((t) => t.type === contentType) || CONTENT_TYPES.find((t) => t.type === "notices");
  const Model = entry.Model;

  let doc;
  try {
    doc = await Model.findOne({ _id: contentId, deletedAt: null });
  } catch {
    return { error: "Invalid content id.", status: 400, code: "validation_error" };
  }
  if (!doc) return { error: "Content not found.", status: 404, code: "not_found" };

  // Workflow enforcement: only CMS-published content may be pushed to Facebook.
  const status = doc.status || (doc.published ? WORKFLOW_STATUS.PUBLISHED : WORKFLOW_STATUS.DRAFT);
  if (status !== WORKFLOW_STATUS.PUBLISHED) {
    return {
      error: `Content must be CMS-published before it can be published to Facebook (current status: ${status}).`,
      status: 409,
      code: "workflow",
    };
  }

  if (!isFacebookConfigured()) {
    return { error: "Facebook is not configured. Publishing is unavailable.", status: 409, code: "not_configured" };
  }

  // Duplicate protection — do not create duplicate social posts accidentally.
  const existing = doc.facebookPublication;
  const hasPublished = Boolean(existing && existing.publishedId);
  if (hasPublished && !allowRepublish) {
    return {
      error: "This content is already published to Facebook.",
      status: 409,
      code: "duplicate_publish",
      alreadyPublished: { publishedId: existing.publishedId, publishedAt: existing.publishedAt },
    };
  }

  // Build the caption. If the caller did not supply one, derive safely from the
  // authoritative content (never from any client-provided flags).
  const effectiveCaption = sanitizePlainText(
    typeof caption === "string" && caption.trim() ? caption.trim() : doc.title || "KMES update",
    5000
  );
  if (!effectiveCaption) {
    return { error: "A caption is required to publish to Facebook.", status: 400, code: "validation_error" };
  }

  // Media: reuse the content's own image (src/image) — do not re-upload, never
  // duplicate storage. Missing/invalid media is skipped safely.
  const imageUrls = [];
  const primary = safeUrl(doc.src) || safeUrl(doc.image);
  if (primary) imageUrls.push(primary);
  if (Array.isArray(doc.attachments)) {
    for (const a of doc.attachments.slice(0, 10)) {
      const u = safeUrl(a?.url);
      if (u) imageUrls.push(u);
    }
  }

  const a = adapter();
  let result;
  try {
    result = await a.publishPost({ message: effectiveCaption, imageUrls });
  } catch (err) {
    const safeCode = err instanceof FacebookError ? err.code : "api_error";
    const safeMsg = err instanceof FacebookError ? err.message : "Facebook publishing failed.";
    await recordSync({
      kind: "publish",
      status: "error",
      message: safeMsg,
      counts: { published: 0, failed: 1 },
      req,
    });
    await log(req, "facebook_publish_failed", { contentId, contentType, reason: safeCode });
    return { error: safeMsg, status: 400, code: safeCode };
  }

  // Provenance-safe persistence: store the social publication metadata in its
  // OWN field, leaving original import provenance untouched.
  const publishedId = result.publishedId;
  const now = new Date();
  const publication = {
    publishedId,
    publishedAt: now,
    publishedBy: req.user?.id || null,
    publishedByName: req.user?.name || "System",
    caption: effectiveCaption,
    media: imageUrls,
    pageId: process.env.FACEBOOK_PAGE_ID || null,
    republished: hasPublished,
    previousPublishedId: hasPublished ? existing.publishedId : null,
  };
  doc.facebookPublication = publication;
  await doc.save();

  await recordSync({
    kind: "publish",
    status: "success",
    message: `Published to Facebook (${publishedId}).`,
    counts: { published: 1, failed: 0 },
    req,
  });
  await log(req, "facebook_publish", { contentId, contentType, publishedId, republished: hasPublished });

  return {
    published: true,
    publishedId,
    publishedAt: now,
    republished: hasPublished,
    publication,
  };
}

function validateExternalId(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 128 || /[^\w_\-\.]/.test(v)) return null;
  return v;
}

export { FacebookError };