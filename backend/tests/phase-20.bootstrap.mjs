// Phase 20 — bootstrap integration harness (EMPTY database).
//
// A separate process from phase-20.integration.mjs because env.js is cached at
// import time: to prove real bootstrap success the DB must be EMPTY and
// ALLOW_ADMIN_BOOTSTRAP=true before the server boots. After the first admin is
// created, a second bootstrap attempt (even with the flag still on and the
// authorized email) must return the generic 403.
//
// Also verifies concurrency: N simultaneous bootstrap requests result in EXACTLY
// ONE created admin, and every other request gets the generic 403.
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const BACKEND_DIR = "C:\\Users\\Dell\\Downloads\\kmes-school-website-updated (2)\\kmes-school\\backend";
const require = createRequire(pathToFileURL(path.join(BACKEND_DIR, "package.json")).href);
const mongoose = require("mongoose");

const BASE = "http://localhost:5425";

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; failures.push(`${name} ${extra}`); console.log(`FAIL ${name} ${extra}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, p, { body } = {}) {
  const h = {};
  let fetchBody;
  if (body !== undefined) { h["Content-Type"] = "application/json"; fetchBody = JSON.stringify(body); }
  const res = await fetch(`${BASE}${p}`, { method, headers: h, body: fetchBody });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.status) return; } catch {}
    await sleep(250);
  }
  throw new Error("Server did not come up");
}

const envPath = path.join(BACKEND_DIR, ".env");
const envOff = envPath + ".phase20b";
let envHidden = false;
if (fs.existsSync(envPath)) { fs.renameSync(envPath, envOff); envHidden = true; }

const mongoServer = await MongoMemoryServer.create();
const uri = mongoServer.getUri();

process.env.MONGODB_URI = uri;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "phase20-bootstrap-secret";
process.env.PORT = "5425";
process.env.AI_PROVIDER = "mock";
process.env.AI_MODEL = "mock-model";
process.env.FACEBOOK_APP_ID = "";
process.env.FACEBOOK_PAGE_ID = "mock_page";
process.env.FACEBOOK_PAGE_ACCESS_TOKEN = "SKIP-MOCK";
process.env.EMAIL_PROVIDER = "mock";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.RESET_LINK_BASE = "http://localhost:5173";
process.env.ALLOW_ADMIN_BOOTSTRAP = "true";
process.env.ADMIN_BOOTSTRAP_EMAIL = "saugatb40@gmail.com";

// Confirm EMPTY database before server boots.
await mongoose.connect(uri);
const User = (await import(pathToFileURL(path.join(BACKEND_DIR, "src\\models\\User.js")).href)).default;
const startCount = await User.countDocuments();
await mongoose.disconnect();
check("harness: database starts EMPTY", startCount === 0, `count=${startCount}`);

await import(pathToFileURL(path.join(BACKEND_DIR, "src\\server.js")).href);
await waitForServer();

// ---------- A. CONCURRENCY: N simultaneous bootstraps = exactly one admin ----------
console.log("\n=== CONCURRENCY-BOUNDED BOOTSTRAP ===");
const N = 6;
const results = await Promise.all(
  Array.from({ length: N }, () =>
    req("POST", "/api/auth/register", {
      body: { name: `Boot ${Math.random()}`, email: "saugatb40@gmail.com", password: "BootPass#1" },
    })
  )
);
const created = results.filter((r) => r.status === 201);
const denied = results.filter((r) => r.status === 403);
check("exactly one bootstrap request returned 201", created.length === 1, `created=${created.length}`);
check("all others returned generic 403", denied.length === N - 1, `denied=${denied.length}`);
check("201 response returned an admin token + user", Boolean(created[0] && created[0].data.token && created[0].data.user));

const countAfter = await User.countDocuments();
check("exactly one user was created", countAfter === 1, `count=${countAfter}`);
const bootUser = await User.findOne({ email: "saugatb40@gmail.com" });
check("created user has role admin (ignored client role)", bootUser && bootUser.role === "admin", `role=${bootUser && bootUser.role}`);
check("created email is stored lowercase", bootUser && bootUser.email === "saugatb40@gmail.com");

// ---------- B. CLOSURE AFTER FIRST ADMIN ----------
console.log("\n=== CLOSURE AFTER FIRST ADMIN ===");
const second = await req("POST", "/api/auth/register", { body: { name: "Second", email: "saugatb40@gmail.com", password: "BootPass#2" } });
check("second bootstrap (flag still on, auth email) -> 403 generic", second.status === 403 && /temporarily unavailable/i.test(second.data.message || ""), `status=${second.status}`);

const third = await req("POST", "/api/auth/register", { body: { name: "Third", email: "someone@example.com", password: "BootPass#3" } });
check("non-auth email after admin -> 403 generic", third.status === 403 && third.data.message === second.data.message, `status=${third.status}`);

const finalCount = await User.countDocuments();
check("no additional users created", finalCount === 1, `count=${finalCount}`);

// ---------- C. LOGIN AS PROVISIONED ADMIN ----------
console.log("\n=== LOGIN AS PROVISIONED ADMIN ===");
const login = await req("POST", "/api/auth/login", { body: { email: "saugatb40@gmail.com", password: "BootPass#1" } });
check("login as bootstrap admin -> 200 + token", login.status === 200 && login.data.token, `status=${login.status}`);
check("login exposes admin role", login.data.user && login.data.user.role === "admin");

// ---------- RESTORE ----------
await mongoServer.stop();
if (envHidden) fs.renameSync(envOff, envPath);

console.log(`\n-------------`);
console.log(`PASS ${passed}`);
console.log(`FAIL ${failed}`);
if (failures.length) { console.log("Failures:"); failures.forEach((f) => console.log("  " + f)); }
process.exit(failed === 0 ? 0 : 1);
