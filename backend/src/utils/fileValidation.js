// Phase 18C-3 — Content-based image upload validation (magic bytes).
//
// The naive mimetype check trusts a client-supplied value. This module verifies
// the actual file signature so spoofed uploads (an executable renamed to .jpg,
// a hostile SVG/HTML/JS/PHP payload sent with an image mimetype, unknown
// binaries) are rejected before they reach Cloudinary. Recognition is restricted
// to a small safe set of raster image formats; everything else fails because its
// magic bytes do not match.
//
// Detection is prefix-based and never needs a full decode.

export const SUPPORTED_IMAGE_FORMATS = {
  jpeg: { mimeType: "image/jpeg", label: "JPEG" },
  png: { mimeType: "image/png", label: "PNG" },
  webp: { mimeType: "image/webp", label: "WebP" },
  gif: { mimeType: "image/gif", label: "GIF" },
};

const MIME_TO_FORMAT = new Map(
  Object.entries(SUPPORTED_IMAGE_FORMATS).map(([format, meta]) => [meta.mimeType, format])
);

// Default cap matches the existing Multer limit for the general image upload.
export const DEFAULT_IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isGif(buffer) {
  return buffer.length >= 4 && buffer.toString("latin1", 0, 4) === "GIF8";
}

function isWebp(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  );
}

// Identify a supported raster image from its header signature, or null.
export function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (isPng(buffer)) return "png";
  if (isJpeg(buffer)) return "jpeg";
  if (isGif(buffer)) return "gif";
  if (isWebp(buffer)) return "webp";
  return null;
}

// Validate an uploaded image by its actual content:
//   - non-empty buffer
//   - within the size limit (belt-and-braces on top of Multer's own cap)
//   - declared mimetype is a supported raster image mime (when provided)
//   - actual magic bytes match the declared mimetype (spoiling is rejected)
export function validateImageUpload({ buffer, mimetype, maxBytes = DEFAULT_IMAGE_MAX_BYTES }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, reason: "No image content was provided." };
  }
  if (buffer.length > maxBytes) {
    return { ok: false, reason: "Image exceeds the maximum allowed size." };
  }

  const declaredFormat = mimetype ? MIME_TO_FORMAT.get(mimetype) : null;
  if (mimetype && !declaredFormat) {
    return { ok: false, reason: "Unsupported image type." };
  }

  const actualFormat = detectImageFormat(buffer);
  if (!actualFormat) {
    return {
      ok: false,
      reason: "File content is not a supported image (JPEG, PNG, WebP, or GIF).",
    };
  }

  if (mimetype && declaredFormat !== actualFormat) {
    return { ok: false, reason: "Image content does not match the declared file type." };
  }

  return { ok: true, format: actualFormat, mimeType: SUPPORTED_IMAGE_FORMATS[actualFormat].mimeType };
}