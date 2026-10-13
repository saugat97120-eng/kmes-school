import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: "Kaseni Model Secondary English School" },
    shortName: { type: String, default: "KMES" },
    logoUrl: { type: String, default: "" },
    heroImage: {
      type: String,
      default: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80",
    },
    heroEyebrow: { type: String, default: "Est. 2059 B.S." },
    heroTitle: { type: String, default: "Kaseni Model Secondary English School" },
    heroDescription: {
      type: String,
      default:
        "Nurturing academic excellence, character, and confidence from Nursery to Grade 10 in a modern, English-medium learning environment.",
    },
    footerDescription: {
      type: String,
      default:
        "An academic institution committed to quality English-medium education from Nursery to Grade 10.",
    },
    address: { type: String, default: "Kaseni, Nepal" },
    phone: { type: String, default: "+977-XXXXXXXXXX" },
    email: { type: String, default: "info@kmes.edu.np" },
    facebookUrl: { type: String, default: "https://www.facebook.com/61554117025008" },
    principalName: { type: String, default: "Principal" },
    principalTitle: { type: String, default: "Principal" },
    principalPhoto: { type: String, default: "" },
    principalMessage: {
      type: String,
      default:
        "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development.",
    },
    directorName: { type: String, default: "Director" },
    directorTitle: { type: String, default: "Director" },
    directorPhoto: { type: String, default: "" },
    directorMessage: {
      type: String,
      default:
        "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future.",
    },
    establishedYear: { type: String, default: "2059 B.S." },
    workingHours: { type: String, default: "Sunday - Friday: 9:00 AM - 4:00 PM" },
    academicSession: { type: String, default: "2081/2082" },
    admissionsStatus: { type: String, default: "Open for Nursery to Grade 10" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("SiteSettings", siteSettingsSchema);
