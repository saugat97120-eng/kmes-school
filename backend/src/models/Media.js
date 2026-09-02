import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    filename: { type: String, default: "" },
    format: { type: String, default: "" },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Media", mediaSchema);
