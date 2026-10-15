import "./loadEnv.js";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = (process.env.R2_ACCOUNT_ID || "a4556a7dd2c35190a791424061384ece").trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const bucketName = (process.env.R2_BUCKET_NAME || "kmes-school-media").trim();
const publicDomain = (process.env.R2_PUBLIC_URL || "https://media.kmes.com.np").trim().replace(/\/+$/, "");

export const isR2Configured = () => Boolean(accessKeyId && secretAccessKey);

let r2Client = null;

export function getR2Client() {
  if (!r2Client && isR2Configured()) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

export const R2_FOLDERS = Object.freeze({
  media: "media",
  attachments: "attachments",
  gallery: "gallery",
});

function safeKeyName(originalName) {
  const base = String(originalName || "file").replace(/\.[^.]*$/, "");
  const cleaned = base.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return cleaned || "file";
}

/**
 * Upload a file buffer to Cloudflare R2
 */
export async function uploadToR2({ buffer, originalname, mimetype, folder = "media" }) {
  const client = getR2Client();
  if (!client) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const ext = originalname && originalname.includes(".") ? originalname.split(".").pop().toLowerCase() : "bin";
  const safeName = safeKeyName(originalname);
  const key = `${folder}/${Date.now()}_${safeName}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimetype || "application/octet-stream",
  });

  await client.send(command);

  return {
    url: `${publicDomain}/${key}`,
    publicId: key,
    key,
    bytes: buffer.length,
    format: ext,
  };
}

/**
 * Delete an object from Cloudflare R2 by key
 */
export async function deleteFromR2(key) {
  const client = getR2Client();
  if (!client || !key) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error("Cloudflare R2 deletion error:", err.message);
    return false;
  }
}
