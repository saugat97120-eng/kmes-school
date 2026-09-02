import express from "express";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
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

async function isPublicIdSharedAcrossResources(resourceType, resourceId, publicId) {
  if (!publicId) return false;

  const models = [Notice, Event];
  const checks = await Promise.all(
    models.map(async (Model) => {
      const query = { _id: { $ne: resourceId }, "attachments.publicId": publicId };
      return Model.exists(query);
    })
  );

  return checks.some(Boolean);
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
      const item = await Model.findById(id);
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
            folder: `kmes-school/attachments/${resource}`,
            resource_type: req.fileMetadata.resourceType,
            public_id: `${Date.now()}_${req.file.originalname.split(".")[0]}`,
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
      await item.save();

      // Log activity
      await logActivity({
        req,
        action: "create",
        resource: "attachment",
        resourceId: attachment._id?.toString() || "new",
        resourceLabel: `${req.fileMetadata.name} (${resource}/${id})`,
      });

      res.status(201).json({
        success: true,
        attachment: {
          _id: attachment._id,
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          format: attachment.format,
          uploadedAt: attachment.uploadedAt,
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

    const item = await Model.findById(id);
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
    if (isCloudinaryConfigured() && attachment.publicId) {
      try {
        const shared = await isPublicIdSharedAcrossResources(resource, id, attachment.publicId);
        if (!shared) {
          await cloudinary.uploader.destroy(attachment.publicId, {
            resource_type: attachment.resourceType || "raw",
          });
        }
      } catch (err) {
        console.error("Error deleting from Cloudinary:", err.message);
      }
    }

    // Remove from array
    item.attachments.splice(attachmentIndex, 1);
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
      message: "Attachment removed successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
