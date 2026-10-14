import "./loadEnv.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

// Production folder namespace (Phase 18C-3). All uploads live under the
// `kmes-school` prefix so a production cloud stays isolated from other projects.
export const CLOUDINARY_FOLDERS = Object.freeze({
  media: "kmes-school",
  attachments: "kmes-school/attachments",
  facebook: "kmes-school/facebook",
});

export default cloudinary;
