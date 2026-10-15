import express from "express";
import multer from "multer";
import cloudinary, { isCloudinaryConfigured, CLOUDINARY_FOLDERS } from "../config/cloudinary.js";
import { isR2Configured, uploadToR2, deleteFromR2, R2_FOLDERS } from "../config/r2.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import { validateImageUpload, DEFAULT_IMAGE_MAX_BYTES } from "../utils/fileValidation.js";
import Media from "../models/Media.js";
import { logActivity } from "../utils/logActivity.js";
import { destroyAsset } from "../utils/cloudinaryCleanup.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DEFAULT_IMAGE_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    // Cheap early gate; the AUTHORITATIVE check runs on the buffered content in
    // the handler (validateImageUpload), so a spoofed mimetype still fails.
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed.");
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.MEDIA_UPLOAD), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file was provided." });
    }

    // Magic-byte validation (Stage 1) runs before any Cloudinary/R2 interaction so
    // spoofed/invalid content is rejected with a safe 4xx even when storage is not configured.
    const check = validateImageUpload({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      maxBytes: DEFAULT_IMAGE_MAX_BYTES,
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.reason });
    }

    if (!isR2Configured() && !isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: "Storage is not configured. Add Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) or Cloudinary credentials to backend environment variables.",
      });
    }

    let result;
    const isUsingR2 = isR2Configured();

    if (isUsingR2) {
      result = await uploadToR2({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        folder: R2_FOLDERS.media,
      });
    } else {
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: CLOUDINARY_FOLDERS.media, resource_type: "image" },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        stream.end(req.file.buffer);
      });
      result = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
      };
    }

    let media;
    try {
      media = await Media.create({
        url: result.url || result.secure_url,
        publicId: result.publicId || result.public_id,
        filename: req.file.originalname,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        uploadedBy: req.user?.id,
        uploadedByName: req.user?.name,
      });
    } catch (dbErr) {
      // Do not leave an untracked orphan if the DB write failed.
      if (isUsingR2) {
        await deleteFromR2(result.key);
      } else {
        await destroyAsset(result.publicId || result.public_id, "image");
      }
      throw dbErr;
    }

    await logActivity({
      req,
      action: "upload",
      resource: "media",
      resourceId: media._id.toString(),
      resourceLabel: media.filename,
    });

    res.status(201).json({
      success: true,
      data: {
        url: result.url || result.secure_url,
        publicId: result.publicId || result.public_id,
        mediaId: media._id,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
