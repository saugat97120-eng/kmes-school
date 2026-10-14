// READ-ONLY content audit. Reports placeholder text, duplicate settings, test
// accounts and missing images in the database configured by MONGODB_URI.
// It never writes. Usage:  node scripts/audit-content.mjs
import "../src/config/loadEnv.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const PLACEHOLDER = /x{4,}|to be (confirmed|announced)|coming soon|lorem ipsum|^\s*(tbc|tba)\s*$/i;
const TEST_EMAIL = /(^|[._+-])(test|demo|sample|phase\d*)([._+-]|@)/i;
const findings = [];
const add = (area, msg) => findings.push({ area, msg });

let all;
let connected = false;

const uri = process.env.MONGODB_URI;
if (uri && !process.argv.includes("--backup")) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    const db = mongoose.connection.db;
    all = async (name) => db.collection(name).find({}).sort({ createdAt: -1 }).toArray();
    console.log("Connected to MongoDB for audit.");
  } catch (err) {
    console.warn(`Could not connect to MongoDB (${err.message}). Falling back to local backup snapshot...`);
  }
}

if (!connected) {
  const backupRoot = path.resolve("..", "backup");
  let backupDir = null;
  if (fs.existsSync(backupRoot)) {
    const subdirs = fs.readdirSync(backupRoot)
      .filter((f) => fs.statSync(path.join(backupRoot, f)).isDirectory() && f.startsWith("backup-"))
      .sort()
      .reverse();
    if (subdirs.length) backupDir = path.join(backupRoot, subdirs[0]);
  }

  if (!backupDir || !fs.existsSync(backupDir)) {
    console.error("No MongoDB connection and no backup snapshot found in ../backup.");
    process.exit(1);
  }

  console.log(`Auditing offline snapshot from: ${backupDir}`);
  all = async (name) => {
    const p = path.join(backupDir, `${name}.json`);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
  };
}

const scan = (obj) => Object.entries(obj).filter(([, v]) => typeof v === "string" && PLACEHOLDER.test(v));

const settings = await all("sitesettings");
if (settings.length > 1) add("Site settings", `${settings.length} settings documents exist (expected 1). The newest one is used; delete the others.`);
for (const s of settings.slice(0, 1))
  for (const [k, v] of scan(s)) add("Site settings", `field "${k}" looks like placeholder text: ${JSON.stringify(v).slice(0, 80)}`);

for (const name of ["notices", "events", "facilities", "activities", "achievements", "galleryimages"]) {
  for (const d of await all(name)) {
    const live = d.deletedAt == null && (d.published === true || d.status === "published");
    const label = d.title || d.name || String(d._id);
    for (const [k, v] of scan(d)) add(name, `${live ? "PUBLISHED" : "unpublished"} "${label}": field "${k}" has placeholder text`);
    if (live && ["facilities", "events"].includes(name) && !d.image) add(name, `PUBLISHED "${label}" has no image`);
    if (live && /images\.unsplash\.com/.test(JSON.stringify(d))) add(name, `PUBLISHED "${label}" uses a stock Unsplash image`);
  }
}
for (const u of await all("users"))
  if (TEST_EMAIL.test(u.email || "")) add("Users", `${u.email} (${u.role}) looks like a test account; delete it if it is not needed`);
if (settings[0]?.heroImage && /unsplash/.test(settings[0].heroImage)) add("Site settings", "heroImage is a stock Unsplash photo");

if (!findings.length) console.log("No issues found.");
else {
  console.log(`${findings.length} item(s) need attention:\n`);
  for (const f of findings) console.log(`[${f.area}] ${f.msg}`);
}
if (connected) await mongoose.disconnect();
