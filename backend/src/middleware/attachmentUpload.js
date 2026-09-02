import multer from "multer";
import path from "path";

const ALLOWED_TYPES = {
  "application/pdf": { ext: ".pdf", type: "pdf", name: "PDF Document" },
  "application/msword": { ext: ".doc", type: "doc", name: "Word Document" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    type: "docx",
    name: "Word Document",
  },
  "application/vnd.ms-excel": { ext: ".xls", type: "xls", name: "Excel Spreadsheet" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: ".xlsx",
    type: "xlsx",
    name: "Excel Spreadsheet",
  },
  "application/vnd.ms-powerpoint": { ext: ".ppt", type: "ppt", name: "PowerPoint Presentation" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: ".pptx",
    type: "pptx",
    name: "PowerPoint Presentation",
  },
  "image/jpeg": { ext: ".jpg", type: "image", name: "JPEG Image" },
  "image/png": { ext: ".png", type: "image", name: "PNG Image" },
  "image/webp": { ext: ".webp", type: "image", name: "WebP Image" },
  "image/gif": { ext: ".gif", type: "image", name: "GIF Image" },
};

const DISALLOWED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".js",
  ".jar",
  ".vbs",
  ".scr",
  ".ps1",
  ".msi",
  ".dll",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  ".apk",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getSafeExtension(fileName) {
  if (!fileName) return "";
  return path.extname(fileName).toLowerCase();
}

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ALLOWED_TYPES[file.mimetype];
    const extension = getSafeExtension(file.originalname);

    if (DISALLOWED_EXTENSIONS.has(extension)) {
      const error = new Error("This file type is not allowed.");
      error.statusCode = 400;
      return cb(error);
    }

    if (!allowed || allowed.ext !== extension) {
      const error = new Error(
        `File type not allowed. Supported types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, WEBP, GIF`
      );
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

export function validateAttachmentFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file provided",
    });
  }

  const extension = getSafeExtension(req.file.originalname);
  if (DISALLOWED_EXTENSIONS.has(extension)) {
    return res.status(400).json({
      success: false,
      message: "This file type is not allowed.",
    });
  }

  const fileInfo = ALLOWED_TYPES[req.file.mimetype];
  if (!fileInfo || fileInfo.ext !== extension) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type",
    });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size: 10MB",
    });
  }

  req.fileMetadata = {
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    format: fileInfo.type,
    resourceType: fileInfo.type === "image" ? "image" : "raw",
  };

  next();
}
