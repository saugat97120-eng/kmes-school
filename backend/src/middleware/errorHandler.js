import multer from "multer";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "File too large. Images may be up to 8MB and documents up to 10MB.",
      LIMIT_PART_COUNT: "Too many parts in the upload request.",
      LIMIT_FILE_COUNT: "Too many files uploaded.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };

    return res.status(400).json({
      success: false,
      message: messages[err.code] || err.message || "Upload failed.",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path || "resource ID"} format`,
    });
  }

  // Schema validation failures are the client's fault, not a server crash.
  if (err.name === "ValidationError" && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({
      path: e.path,
      msg: e.kind === "required" ? `${e.path} is required` : e.message,
    }));
    return res.status(400).json({
      success: false,
      message: errors.map((e) => e.msg).join("; ") || "Validation failed.",
      errors,
    });
  }

  // Unique index violation (e.g. duplicate user email).
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "value";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  const status = err.statusCode || err.status || 500;
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
