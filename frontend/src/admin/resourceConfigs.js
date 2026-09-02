// Field/column definitions for each admin-managed resource.
// ResourceManager.jsx reads this to render the right form + table for each type.

export const resourceConfigs = {
  notices: {
    title: "Notices",
    resource: "notices",
    columns: ["title", "date", "pinned", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Short Description", type: "textarea", required: true },
      { name: "content", label: "Full Content", type: "textarea" },
      { name: "date", label: "Date", type: "date" },
      { name: "category", label: "Category", type: "text" },
      { name: "pinned", label: "Pinned", type: "checkbox" },
      { name: "attachmentUrl", label: "Attachment URL (Legacy)", type: "text" },
      { name: "attachments", label: "Attachments", type: "attachmentList" },
    ],
  },
  events: {
    title: "Events",
    resource: "events",
    columns: ["title", "date", "location", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "time", label: "Time", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "image", label: "Image URL", type: "imageUpload" },
      { name: "attachments", label: "Attachments", type: "attachmentList" },
    ],
  },
  gallery: {
    title: "Gallery",
    resource: "gallery",
    columns: ["title", "category", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "src", label: "Image URL", type: "imageUpload", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["Campus", "Events", "Sports", "Achievements"],
      },
    ],
  },
  achievements: {
    title: "Achievements",
    resource: "achievements",
    columns: ["title", "year", "category", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "year", label: "Year", type: "text", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["Academic", "Sports", "Student", "School"],
      },
      { name: "image", label: "Image URL", type: "imageUpload" },
      { name: "certificateUrl", label: "Certificate URL", type: "text" },
    ],
  },
  facilities: {
    title: "Facilities",
    resource: "facilities",
    columns: ["title", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "image", label: "Image URL", type: "imageUpload" },
    ],
  },
  activities: {
    title: "Activities",
    resource: "activities",
    columns: ["title", "status"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
    ],
  },
};
