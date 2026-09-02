import multer from "multer";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "File too large. Maximum size: 10MB",
      LIMIT_PART_COUNT: "Too many parts in the upload request.",
      LIMIT_FILE_COUNT: "Too many files uploaded.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };

    return res.status(400).json({
      success: false,
      message: messages[err.code] || err.message || "Upload failed.",
    });
  }

  const status = err.statusCode || 500;
  // Never leak raw error details (filesystem paths, DB connection strings,
  // provider URLs) to API clients in production. Detailed diagnostics may
  // still be logged server-side (console.error above) in any environment.
  const message =
    process.env.NODE_ENV === "production"
      ? status >= 500
        ? "Internal server error"
        : err.publicMessage || err.message || "An error occurred"
      : err.message || "Internal server error";
  res.status(status).json({
    success: false,
    message,
  });
}
