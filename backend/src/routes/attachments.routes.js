import express from "express";
import cloudinary, { isCloudinaryConfigured, CLOUDINARY_FOLDERS } from "../config/cloudinary.js";
import { WORKFLOW_STATUS } from "../workflow/workflow.js";
import { resolveStatus } from "../workflow/workflowService.js";
import { destroyAsset, isPublicIdInUse } from "../utils/cloudinaryCleanup.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { attachmentUpload, validateAttachmentFile } from "../middleware/attachmentUpload.js";
import Notice from "../models/Notice.js";
import Event from "../models/Event.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

function getModel(resourceType) {
  const models = {
    notices: Notice,
    events: Event,
  };
  return models[resourceType];
}

// Any change to the files of non-draft content sends it back to draft so
// nothing can go live (or change while live) without re-review. Mirrors the
// edit rule enforced in crudFactory.update.
function resetToDraftIfLive(item) {
  if (resolveStatus(item) === WORKFLOW_STATUS.DRAFT) return false;
  item.status = WORKFLOW_STATUS.DRAFT;
  item.published = false;
  return true;
}

// Cloudinary public ids come from the filename: keep them to a safe charset so
// "../" or "/" in a name can never create unexpected folders.
function safePublicIdName(originalName) {
  const base = String(originalName || "file").replace(/\.[^.]*$/, "");
  const cleaned = base.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return cleaned || "file";
}

// POST /api/attachments/upload/:resource/:id
// Upload attachment to a specific notice/event
router.post(
  "/upload/:resource/:id",
  requireAuth,
  requirePermission(PERMISSIONS.ATTACHMENTS_UPLOAD),
  attachmentUpload.single("file"),
  validateAttachmentFile,
  async (req, res, next) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(400).json({
          success: false,
          message: "Cloudinary is not configured",
        });
      }

      const { resource, id } = req.params;
      const Model = getModel(resource);

      if (!Model) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource type",
        });
      }

      // Verify resource exists
      const item = await Model.findOne({ _id: id, deletedAt: null });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `${resource} item not found`,
        });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${CLOUDINARY_FOLDERS.attachments}/${resource}`,
            resource_type: req.fileMetadata.resourceType,
            public_id: `${Date.now()}_${safePublicIdName(req.file.originalname)}`,
            overwrite: false,
          },
          (error, uploaded) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(uploaded);
          }
        );

        stream.end(req.file.buffer);
      });

      // Create attachment object
      const attachment = {
        name: req.fileMetadata.name,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: req.fileMetadata.resourceType,
        format: result.format || req.fileMetadata.format,
        size: result.bytes || req.fileMetadata.size,
        mimeType: req.fileMetadata.mimeType,
        uploadedAt: new Date(),
        uploadedBy: req.user?.id,
      };

      // Add attachment to item
      if (!item.attachments) {
        item.attachments = [];
      }
      item.attachments.push(attachment);
      const resetToDraft = resetToDraftIfLive(item);
      try {
        await item.save();
      } catch (saveErr) {
        // Do not leave an orphan file in Cloudinary if the DB write failed.
        await destroyAsset(result.public_id, req.fileMetadata.resourceType);
        throw saveErr;
      }
      // The plain object above has no _id; read the real one from the saved subdocument.
      const saved = item.attachments[item.attachments.length - 1];

      // Log activity
      await logActivity({
        req,
        action: "create",
        resource: "attachment",
        resourceId: saved._id.toString(),
        resourceLabel: `${req.fileMetadata.name} (${resource}/${id})`,
      });

      res.status(201).json({
        success: true,
        resetToDraft,
        attachment: {
          _id: saved._id,
          name: saved.name,
          url: saved.url,
          size: saved.size,
          format: saved.format,
          mimeType: saved.mimeType,
          resourceType: saved.resourceType,
          uploadedAt: saved.uploadedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/attachments/:resource/:id/:attachmentId
// Remove attachment from resource
router.delete("/:resource/:id/:attachmentId", requireAuth, requirePermission(PERMISSIONS.ATTACHMENTS_DELETE), async (req, res, next) => {
  try {
    const { resource, id, attachmentId } = req.params;
    const Model = getModel(resource);

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource type",
      });
    }

    const item = await Model.findOne({ _id: id, deletedAt: null });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${resource} item not found`,
      });
    }

    // Find and remove attachment
    const attachmentIndex = item.attachments?.findIndex((a) => a._id?.toString() === attachmentId);
    if (attachmentIndex === undefined || attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const attachment = item.attachments[attachmentIndex];

    // Only delete the Cloudinary asset if no other notice/event still references it.
    if (attachment.publicId) {
      const shared = await isPublicIdInUse(attachment.publicId, item._id);
      if (!shared) await destroyAsset(attachment.publicId, attachment.resourceType);
    }

    // Remove from array
    item.attachments.splice(attachmentIndex, 1);
    const resetToDraft = resetToDraftIfLive(item);
    await item.save();

    // Log activity
    await logActivity({
      req,
      action: "delete",
      resource: "attachment",
      resourceId: attachmentId,
      resourceLabel: `${attachment.name} (${resource}/${id})`,
    });

    res.json({
      success: true,
      resetToDraft,
      message: "Attachment removed successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
