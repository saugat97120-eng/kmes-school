import mongoose from "mongoose";
import { contentWorkflowFields } from "../workflow/workflow.js";

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    resourceType: { type: String, default: "raw" },
    format: { type: String },
    size: { type: Number },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    content: { type: String },
    date: { type: Date, default: Date.now },
    category: { type: String, default: "General" },
    pinned: { type: Boolean, default: false },
    attachmentUrl: { type: String },
    attachments: [attachmentSchema],
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    // Phase 22: User audit tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByName: { type: String },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedByName: { type: String },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);

// Phase 16: composite index serving the hot public/admin read paths that filter
// on workflow status + soft-delete state and sort by descending createdAt
// (publishedQuery(), getAllAdmin, getTrash, inbox counting/listing).
noticeSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("Notice", noticeSchema);
