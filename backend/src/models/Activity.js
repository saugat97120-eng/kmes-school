import mongoose from "mongoose";
import { contentWorkflowFields } from "../workflow/workflow.js";

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);
activitySchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
