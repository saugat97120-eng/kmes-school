// Phase 18C-3/18C-4 — integration tests.
// Disposable mongodb-memory-server + the real backend, mirroring the Phase 18B
// harness pattern (share the mongoose singleton, hide backend/.env, boot server).
//
// Covers:
//   A. Health + CORS preflight
//   B. Upload security (magic-byte rejection; Cloudinary-unconfigured 4xx)
//   C. Media delete without crash when Cloudinary unconfigured
//   D. CMS validation end-to-end (site settings + page content allowlists)
//   E. Password reset e2e (regression for the refactored auth route)
//   F. SMTP failure => still generic response (no leak)
//
// The harness never prints .env values; backend/.env is renamed aside first.
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const BACKEND_DIR = "C:\\Users\\Dell\\Downloads\\kmes-school-website-updated (2)\\kmes-school\\backend";
const require = createRequire(pathToFileURL(path.join(BACKEND_DIR, "package.json")).href);
const mongoose = require("mongoose");

const BASE = "http://localhost:5423";

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; failures.push(`${name} ${extra}`); console.log(`FAIL ${name} ${extra}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, p, { token, body, form } = {}) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  let fetchBody;
  if (form) {
    fetchBody = form;
  } else if (body !== undefined) {
    h["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${p}`, { method, headers: h, body: fetchBody });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.status) return;
    } catch {}
    await sleep(250);
  }
  throw new Error("Server did not come up");
}

// Hide real backend/.env so Cloudinary dotenv override cannot pollute.
const envPath = path.join(BACKEND_DIR, ".env");
const envOff = envPath + ".phase18c";
let envHidden = false;
if (fs.existsSync(envPath)) { fs.renameSync(envPath, envOff); envHidden = true; }

const mongoServer = await MongoMemoryServer.create();
const uri = mongoServer.getUri();

process.env.MONGODB_URI = uri;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "phase18c-test-secret";
process.env.PORT = "5423";
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

await mongoose.connect(uri);
const User = (await import(pathToFileURL(path.join(BACKEND_DIR, "src\\models\\User.js")).href)).default;
await User.create({ name: "Admin", email: "admin@kmes.test", password: "AdminPass#1", role: "admin" });
await User.create({ name: "Editor", email: "editor@kmes.test", password: "EditorPass#1", role: "editor" });
await mongoose.disconnect();

await import(pathToFileURL(path.join(BACKEND_DIR, "src\\server.js")).href);
await waitForServer();

const emailSvc = await import(pathToFileURL(path.join(BACKEND_DIR, "src\\integrations\\email\\emailService.js")).href);
const emailMock = emailSvc.getMockEmailAdapter();
emailMock.clear();

const PNG = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.from("0000000d49484452", "hex"),
  Buffer.alloc(128, 1),
]);
const PLAIN_TEXT = Buffer.from("this is not an image no matter what the filename says");

function imageForm(buffer, filename, type) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), filename);
  return form;
}

// ---------- A. HEALTH + CORS ----------
console.log("\n=== HEALTH + CORS ===");
const health = await req("GET", "/api/health");
check("health: 200 when DB up", health.status === 200, `status=${health.status}`);
check("health: no creds leaked", !/(mongodb:\/\/|password|secret)/i.test(JSON.stringify(health.data)));

// CORS semantics: global middleware, consistent across routes, correct on
// preflight AND on error responses, denying only non-listed origins.
const ALLOWED_ORIGIN = "http://localhost:5173"; // FRONTEND_URL in this harness
const DISALLOWED_ORIGIN = "https://evil.example";

async function corsGet(path, origin) {
  const res = await fetch(`${BASE}${path}`, { method: "GET", headers: { Origin: origin } });
  return { status: res.status, acao: res.headers.get("access-control-allow-origin") };
}

async function corsOptions(path, origin) {
  const res = await fetch(`${BASE}${path}`, {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
  });
  return { status: res.status, acao: res.headers.get("access-control-allow-origin"), acm: res.headers.get("access-control-allow-methods") };
}

const allowedGet = await corsGet("/api/site-settings", ALLOWED_ORIGIN);
check("CORS simple GET allowed origin -> ACAO echoes origin", allowedGet.status === 200 && allowedGet.acao === ALLOWED_ORIGIN, `acao=${allowedGet.acao}`);

const deniedGet = await corsGet("/api/site-settings", DISALLOWED_ORIGIN);
check("CORS GET disallowed origin -> no ACAO", deniedGet.acao === null, `acao=${deniedGet.acao}`);

const preflight = await corsOptions("/api/site-settings", ALLOWED_ORIGIN);
check("CORS preflight allowed origin -> 204 + ACAO + methods", preflight.status === 204 && preflight.acao === ALLOWED_ORIGIN && /GET/.test(preflight.acm || ""), `status=${preflight.status} acao=${preflight.acao} acm=${preflight.acm}`);

const errorPath = await corsGet("/api/does-not-exist", ALLOWED_ORIGIN);
check("CORS error response (404) still carries ACAO", errorPath.status === 404 && errorPath.acao === ALLOWED_ORIGIN, `status=${errorPath.status} acao=${errorPath.acao}`);

const publicSettings = await req("GET", "/api/site-settings");
check("site-settings GET is public (200)", publicSettings.status === 200, `status=${publicSettings.status}`);

const adminLogin = await req("POST", "/api/auth/login", { body: { email: "admin@kmes.test", password: "AdminPass#1" } });
check("admin login", adminLogin.status === 200 && adminLogin.data.token, `status=${adminLogin.status}`);
const adminToken = adminLogin.data.token;
const editorLogin = await req("POST", "/api/auth/login", { body: { email: "editor@kmes.test", password: "EditorPass#1" } });
const editorToken = editorLogin.data.token;

// ---------- B. UPLOAD SECURITY ----------
console.log("\n=== UPLOAD SECURITY ===");
const goodPng = await req("POST", "/api/upload", { token: adminToken, form: imageForm(PNG, "logo.png", "image/png") });
check("upload valid PNG: 400 Cloudinary not configured (safe, no crash)", goodPng.status === 400 && /Cloudinary/.test(goodPng.data.message || ""), `status=${goodPng.status} msg=${goodPng.data.message}`);

const spoofed = await req("POST", "/api/upload", { token: adminToken, form: imageForm(PLAIN_TEXT, "photo.png", "image/png") });
check("upload spoofed text-as-png: 400 magic-byte rejection", spoofed.status === 400 && /not a supported image/.test(spoofed.data.message || ""), `status=${spoofed.status} msg=${spoofed.data.message}`);

const svgAsPng = await req("POST", "/api/upload", { token: adminToken, form: imageForm(Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\">x</svg>"), "x.png", "image/png") });
check("upload SVG-as-png: 400 magic-byte rejection", svgAsPng.status === 400, `status=${svgAsPng.status}`);

const svgMime = await req("POST", "/api/upload", { token: adminToken, form: imageForm(PNG, "x.svg", "image/svg+xml") });
check("upload image/svg+mime: 400 unsupported type", svgMime.status === 400 && /Unsupported image type/.test(svgMime.data.message || ""), `status=${svgMime.status}`);

const mismatch = await req("POST", "/api/upload", { token: adminToken, form: imageForm(PNG, "x.jpg", "image/jpeg") });
check("upload png-as-jpeg: 400 declared mismatch", mismatch.status === 400 && /does not match/.test(mismatch.data.message || ""), `status=${mismatch.status}`);

const noFile = await req("POST", "/api/upload", { token: adminToken });
check("upload without file: 400", noFile.status === 400, `status=${noFile.status}`);

// ---------- C. MEDIA DELETE (Cloudinary unconfigured) ----------
console.log("\n=== MEDIA (unconfigured Cloudinary) ===");
const Media = (await import(pathToFileURL(path.join(BACKEND_DIR, "src\\models\\Media.js")).href)).default;
const mediaDoc = await Media.create({ url: "https://res.cloudinary.com/x/testing", publicId: "kmes-school/testing" });
const del = await req("DELETE", `/api/media/${mediaDoc._id.toString()}`, { token: adminToken });
check("media delete: 200 without Cloudinary crash", del.status === 200, `status=${del.status} body=${JSON.stringify(del.data)}`);
check("media doc removed from DB", !(await Media.findById(mediaDoc._id)));

// ---------- D. CMS VALIDATION E2E ----------
console.log("\n=== CMS VALIDATION ===");
const adminAll = await req("GET", "/api/site-settings/admin/all", { token: adminToken });
const settingsId = adminAll.data.data[0]._id;

const badEmail = await req("PUT", `/api/site-settings/${settingsId}`, { token: adminToken, body: { email: "not-an-email" } });
check("site-settings invalid email -> 400 with errors[]", badEmail.status === 400 && Array.isArray(badEmail.data.errors) && badEmail.data.errors.length > 0, `status=${badEmail.status}`);

const withUnknown = await req("PUT", `/api/site-settings/${settingsId}`, { token: adminToken, body: { schoolName: "KMES", email: "school@kmes.test", adminNote: "strip me", $set: { published: true } } });
check("site-settings unknown field stripped -> 200", withUnknown.status === 200, `status=${withUnknown.status}`);
const reloadedSettings = (await req("GET", "/api/site-settings/admin/all", { token: adminToken })).data.data.find((s) => s._id === settingsId);
check("site-settings unknown field NOT persisted", reloadedSettings && reloadedSettings.adminNote === undefined && reloadedSettings.schoolName === "KMES");

const noSlug = await req("POST", "/api/page-content", { token: adminToken, body: { title: "No slug" } });
check("page-content create without slug -> 400", noSlug.status === 400 && /slug/.test(JSON.stringify(noSlug.data)), `status=${noSlug.status}`);

const createAbout = await req("POST", "/api/page-content", { token: adminToken, body: { slug: "  ABOUT ", title: "About" } });
check("page-content create lowercase slug -> 201", createAbout.status === 201 && createAbout.data.data.slug === "about", `status=${createAbout.status}`);
const aboutId = createAbout.data.data._id;

const dupSlug = await req("POST", "/api/page-content", { token: adminToken, body: { slug: "ABOUT", title: "About again" } });
check("page-content duplicate slug -> 409", dupSlug.status === 409, `status=${dupSlug.status}`);

const createMission = await req("POST", "/api/page-content", { token: adminToken, body: { slug: "mission", title: "Mission" } });
const missionId = createMission.data.data._id;

const conflictPut = await req("PUT", `/api/page-content/${missionId}`, { token: adminToken, body: { slug: "about" } });
check("page-content PUT conflicting slug -> 409", conflictPut.status === 409, `status=${conflictPut.status}`);

const validPut = await req("PUT", `/api/page-content/${aboutId}`, { token: adminToken, body: { title: "About KMES", _id: "evil", heroImage: "https://res.cloudinary.com/x/a.png" } });
check("page-content PUT strips unknown fields -> 200", validPut.status === 200 && validPut.data.data.heroImage === "https://res.cloudinary.com/x/a.png", `status=${validPut.status}`);

const pubGet = await req("GET", "/api/page-content?slug=about");
check("page-content public GET returns published page", pubGet.status === 200, `status=${pubGet.status}`);

// ---------- E. PASSWORD RESET E2E (regression) ----------
console.log("\n=== PASSWORD RESET (mock adapter) ===");
const EXISTING = "admin@kmes.test";
const fp = await req("POST", "/api/auth/forgot-password", { body: { email: EXISTING } });
check("forgot: existing -> generic 200", fp.status === 200 && /registered/i.test(fp.data.message || ""), `status=${fp.status}`);
check("forgot: no raw token in response", !JSON.stringify(fp.data).toLowerCase().includes("token"), JSON.stringify(fp.data).slice(0, 80));
check("mock: 1 delivery", emailMock._count() === 1, `count=${emailMock._count()}`);
const resetTok = emailMock.deliveries[0].resetToken;

const weak = await req("POST", "/api/auth/reset-password", { body: { token: resetTok, password: "123" } });
check("reset: weak password 400", weak.status === 400, `status=${weak.status}`);

const okReset = await req("POST", "/api/auth/reset-password", { body: { token: resetTok, password: "NewPass#456" } });
check("reset: success 200", okReset.status === 200 && okReset.data.success === true, `status=${okReset.status}`);

const reuse = await req("POST", "/api/auth/reset-password", { body: { token: resetTok, password: "Another#789" } });
check("reset: token single-use (400)", reuse.status === 400, `status=${reuse.status}`);

const newLogin = await req("POST", "/api/auth/login", { body: { email: EXISTING, password: "NewPass#456" } });
check("login with new password works", newLogin.status === 200 && newLogin.data.token, `status=${newLogin.status}`);

const oldTokenMe = await req("GET", "/api/auth/me", { token: adminToken });
check("old JWT invalidated after reset (401)", oldTokenMe.status === 401, `status=${oldTokenMe.status}`);

const storedAdmin = await User.findOne({ email: EXISTING }).select("+password");
check("DB: reset hash cleared after use", storedAdmin.passwordResetTokenHash === null);
check("DB: authVersion advanced", Number(storedAdmin.authVersion) >= 1, `v=${storedAdmin.authVersion}`);

// ---------- F. SMTP FAILURE => GENERIC (no leak) ----------
console.log("\n=== SMTP FAILURE MASKING ===");
emailSvc.setEmailProviderConfig({ provider: "smtp" });
const before = emailMock._count();
const fpEd = await req("POST", "/api/auth/forgot-password", { body: { email: "editor@kmes.test" } });
check("smtp-failure: still generic 200", fpEd.status === 200 && /registered/i.test(fpEd.data.message || ""), `status=${fpEd.status}`);
check("smtp-failure: no delivery attempted via mock", emailMock._count() === before, `count=${emailMock._count()} before=${before}`);
const editorDoc = await User.findOne({ email: "editor@kmes.test" });
check("smtp-failure: reset record still created (stored hash)", typeof editorDoc.passwordResetTokenHash === "string" && /^[0-9a-f]{64}$/.test(editorDoc.passwordResetTokenHash));
emailSvc.setEmailProviderConfig({ provider: "mock" });

// ---------- RESTORE ----------
await mongoServer.stop();
if (envHidden) fs.renameSync(envOff, envPath);

console.log(`\n-------------`);
console.log(`PASS ${passed}`);
console.log(`FAIL ${failed}`);
if (failures.length) { console.log("Failures:"); failures.forEach((f) => console.log("  " + f)); }
process.exit(failed === 0 ? 0 : 1);