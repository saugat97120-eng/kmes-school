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

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String },
    location: { type: String },
    image: { type: String },
    gallery: [{ type: String }],
    attachments: [attachmentSchema],
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);
eventSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("Event", eventSchema);
