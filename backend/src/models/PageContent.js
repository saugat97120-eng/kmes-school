import mongoose from "mongoose";

const pageContentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, default: "" },
    eyebrow: { type: String, default: "" },
    description: { type: String, default: "" },
    heroImage: { type: String, default: "" },
    history: { type: String, default: "" },
    mission: { type: String, default: "" },
    vision: { type: String, default: "" },
    principalMessage: { type: String, default: "" },
    directorMessage: { type: String, default: "" },
    admissionsIntro: { type: String, default: "" },
    admissionsCtaText: { type: String, default: "Contact for Admission" },
    admissionsCtaLink: { type: String, default: "/contact" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("PageContent", pageContentSchema);
