import mongoose from "mongoose";

// Phase 9 — Lightweight integration telemetry for the Facebook import pipeline.
// Stores sync/connection attempts + aggregated results ONLY. It never stores a
// token, secret, or raw API payload — just safe counts and a bounded error
// message. Kept apart from content models because it is operational metadata,
// not editable editorial content.
const facebookSyncSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["connection", "sync", "import", "publish"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "error", "skipped"],
      required: true,
    },
    // Safe, bounded human message. Never raw error objects / tokens.
    message: { type: String, default: "" },
    imported: { type: Number, default: 0 },
    skippedDuplicates: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    triggeredBy: { type: String, default: "System" },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

facebookSyncSchema.index({ kind: 1, createdAt: -1 });

export default mongoose.model("FacebookSync", facebookSyncSchema);