// Run with: node src/seed.js
// Populates the database with the same demo content used in the frontend,
// so the CMS has something to show immediately after MongoDB is connected.
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";
import { assertSeedAllowed } from "./config/seedGuard.js";

import Notice from "./models/Notice.js";
import Event from "./models/Event.js";
import GalleryImage from "./models/GalleryImage.js";
import Achievement from "./models/Achievement.js";
import Facility from "./models/Facility.js";
import Activity from "./models/Activity.js";
import SiteSettings from "./models/SiteSettings.js";

dotenv.config();

// Phase 18C-3 — Production seed protection. Blocks production and requires an
// explicit --allow-destructive flag in other environments BEFORE connecting, so
// a blocked run never touches the database.
async function seed() {
  const guard = assertSeedAllowed();
  if (!guard.allowed) {
    process.exit(1);
  }
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
    title: "Admissions Open for Academic Session 2081/2082",
    description: "Enrollment is now open for Nursery through Grade 10 at Kaseni Model Secondary English School.",
    content: "Kaseni Model Secondary English School welcomes applications for Nursery to Grade 10. Forms and prospectus are available at the school administration office in Belbari-05, Kaseni, Morang, or via our online admissions inquiry form on this portal.",
    pinned: true,
  });

  await Event.create({
    title: "Annual Sports & Athletic Meet",
    description: "Annual inter-house athletic competitions including track events, football, volleyball, and fun activities for junior classes.",
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    location: "KMES School Ground, Belbari-5",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
  });

  await GalleryImage.create({
    title: "Campus View",
    src: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
    category: "Campus",
  });

  await Achievement.create({
    title: "Outstanding SEE Academic Performance",
    description: "KMES students achieved excellent GPA scores in the Secondary Education Examination (SEE) with top divisional honors.",
    year: "2080 B.S.",
    category: "Academic",
  });

  await Facility.insertMany([
    {
      title: "Spacious Classrooms",
      description: "Well-ventilated, naturally lit classrooms equipped with modern teaching aids and ergonomic student furniture.",
    },
    {
      title: "Library & Reading Hall",
      description: "Rich collection of academic textbooks, reference materials, Nepali and English literature, and periodicals.",
    },
    {
      title: "Computer Laboratory",
      description: "Modern computer lab with high-speed internet providing practical digital literacy and coding education.",
    },
    {
      title: "Science Laboratory",
      description: "Fully equipped laboratory for hands-on experiments in Physics, Chemistry, and Biology.",
    },
    {
      title: "Playground & Sports Field",
      description: "Spacious playground accommodating football, volleyball, badminton, and daily physical exercises.",
    },
  ]);

  await Activity.insertMany([
    { title: "Sports & Athletics", description: "Regular physical training, inter-house football, volleyball tournaments, and track-and-field athletics." },
    { title: "Cultural & Arts Programs", description: "Annual concerts, traditional dance performances, music, drama, and fine arts exhibitions." },
    { title: "Debate, Quiz & Public Speaking", description: "Weekly literary competitions, elocution, quiz contests, and spelling bees building student confidence." },
    { title: "Scouts & Social Service", description: "Community outreach, cleanliness campaigns, and student leadership development programs." },
  ]);

  console.log("Seed data inserted.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
