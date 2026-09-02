// Run with: node src/seed.js
// Populates the database with the same demo content used in the frontend,
// so the CMS has something to show immediately after MongoDB is connected.
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";

import Notice from "./models/Notice.js";
import Event from "./models/Event.js";
import GalleryImage from "./models/GalleryImage.js";
import Achievement from "./models/Achievement.js";
import Facility from "./models/Facility.js";
import Activity from "./models/Activity.js";
import SiteSettings from "./models/SiteSettings.js";

dotenv.config();

async function seed() {
  await connectDB();

  await Promise.all([
    Notice.deleteMany({}),
    Event.deleteMany({}),
    GalleryImage.deleteMany({}),
    Achievement.deleteMany({}),
    Facility.deleteMany({}),
    Activity.deleteMany({}),
    SiteSettings.deleteMany({}),
  ]);

  await SiteSettings.create({});

  await Notice.create({
    title: "Admission Open for New Academic Session",
    description: "Enquiries now open for Nursery to Grade 10.",
    content: "Full admission details will be published once confirmed.",
    pinned: true,
  });

  await Event.create({
    title: "Annual Sports Day",
    description: "Details to be announced.",
    date: new Date(),
    location: "School Ground",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
  });

  await GalleryImage.create({
    title: "Campus View",
    src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
    category: "Campus",
  });

  await Achievement.create({
    title: "School Achievement",
    description: "To be confirmed.",
    year: "2026",
    category: "School",
  });

  await Facility.insertMany([
    { title: "Classrooms", description: "Details to be confirmed." },
    { title: "Library", description: "Details to be confirmed." },
    { title: "Computer Lab", description: "Details to be confirmed." },
  ]);

  await Activity.insertMany([
    { title: "Sports", description: "School sports activities." },
    { title: "Cultural Programs", description: "Cultural events and celebrations." },
    { title: "Debate & Quiz", description: "Programs building critical thinking." },
  ]);

  console.log("Seed data inserted.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
