// Best-effort Cloudinary cleanup. Failures are logged, never thrown: a leftover
// orphan file is better than a failed delete for the admin.
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import Notice from "../models/Notice.js";
import Event from "../models/Event.js";

export async function isPublicIdInUse(publicId, excludeId = null) {
  if (!publicId) return false;
  const query = { "attachments.publicId": publicId };
  if (excludeId) query._id = { $ne: excludeId };
  const hits = await Promise.all([Notice.exists(query), Event.exists(query)]);
  return hits.some(Boolean);
}

export async function destroyAsset(publicId, resourceType = "raw") {
  if (!publicId || !isCloudinaryConfigured()) return false;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || "raw" });
    return true;
  } catch (err) {
    console.error("Cloudinary cleanup failed:", err.message);
    return false;
  }
}

// Remove every attachment asset of a document that is being permanently deleted
// (skipping assets another document still references).
export async function cleanupAttachments(doc) {
  const list = doc?.attachments || [];
  for (const a of list) {
    if (!a.publicId) continue;
    if (await isPublicIdInUse(a.publicId, doc._id)) continue;
    await destroyAsset(a.publicId, a.resourceType);
  }
}
