import mongoose from "mongoose";
import { contentWorkflowFields } from "../workflow/workflow.js";

const achievementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    year: { type: String, required: true },
    category: {
      type: String,
      enum: ["Academic", "Sports", "Student", "School"],
      default: "School",
    },
    image: { type: String },
    certificateUrl: { type: String },
    published: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    ...contentWorkflowFields,
  },
  { timestamps: true }
);
achievementSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.model("Achievement", achievementSchema);
