import mongoose from "mongoose";
import { contentWorkflowFields } from "../workflow/workflow.js";

const facilitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);
facilitySchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("Facility", facilitySchema);
