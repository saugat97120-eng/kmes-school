import mongoose from "mongoose";
import { contentWorkflowFields } from "../workflow/workflow.js";

const galleryImageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    src: { type: String, required: true },
    category: {
      type: String,
      enum: ["Campus", "Events", "Sports", "Achievements"],
      default: "Campus",
    },
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);
galleryImageSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("GalleryImage", galleryImageSchema);
