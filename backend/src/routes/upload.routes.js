import express from "express";
import multer from "multer";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, PERMISSIONS } from "../middleware/roles.js";
import Media from "../models/Media.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.MEDIA_UPLOAD), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file was provided." });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, API key and secret to the backend .env file.",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "kmes-school", resource_type: "image" },
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

    const media = await Media.create({
      url: result.secure_url,
      publicId: result.public_id,
      filename: req.file.originalname,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      uploadedBy: req.user?.id,
      uploadedByName: req.user?.name,
    });

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
        url: result.secure_url,
        publicId: result.public_id,
        mediaId: media._id,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
