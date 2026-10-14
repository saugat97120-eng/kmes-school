// Phase 20 — integration tests: registration closure + auth/RBAC regression.
//
// Uses a disposable mongodb-memory-server + the real backend (mirrors
// phase-18c.integration.mjs). The database is seeded with users ALREADY, so
// public registration must be closed in every configuration:
//   - flag OFF (default) -> 403 generic even for the bootstrap email
//   - flag ON  but a user exists -> 403 generic even for the bootstrap email
//   - flag ON  but wrong email -> 403 generic
//   - flag ON  but database empty -> covered in the separate bootstrap harness
// Also: auth/RBAC regression (login, /me, users route admin-gated).
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createMongo } from "./helpers/mongo.mjs";

const BACKEND_DIR = path.resolve(import.meta.dirname, "..");
const require = createRequire(pathToFileURL(path.join(BACKEND_DIR, "package.json")).href);
const mongoose = require("mongoose");

const BASE = "http://localhost:5424";

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; failures.push(`${name} ${extra}`); console.log(`FAIL ${name} ${extra}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, p, { token, body } = {}) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  let fetchBody;
  if (body !== undefined) {
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
    try { const r = await fetch(`${BASE}/api/health`); if (r.status) return; } catch {}
    await sleep(250);
  }
  throw new Error("Server did not come up");
}


const mongoServer = await createMongo();
const uri = mongoServer.getUri();

process.env.MONGODB_URI = uri;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "phase20-test-secret";
process.env.PORT = "5424";
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
process.env.ALLOW_ADMIN_BOOTSTRAP = "true"; // flag ON but users exist -> must still be closed
process.env.ADMIN_BOOTSTRAP_EMAIL = "saugatb40@gmail.com";

await mongoose.connect(uri);
const User = (await import(pathToFileURL(path.join(BACKEND_DIR, "src/models/User.js")).href)).default;
await User.create({ name: "Admin", email: "admin@kmes.test", password: "AdminPass#1", role: "admin" });
await User.create({ name: "Editor", email: "editor@kmes.test", password: "EditorPass#1", role: "editor" });
await mongoose.disconnect();

await import(pathToFileURL(path.join(BACKEND_DIR, "src/server.js")).href);
await waitForServer();

const emailSvc = await import(pathToFileURL(path.join(BACKEND_DIR, "src/integrations/email/emailService.js")).href);
const emailMock = emailSvc.getMockEmailAdapter();

// ---------- A. REGISTRATION IS CLOSED (users present) -----------------------
console.log("\n=== REGISTRATION CLOSED (flag on, users exist) ===");
const bootEmail = "saugatb40@gmail.com";

const authEmail = await req("POST", "/api/auth/register", { body: { name: "Auth", email: bootEmail, password: "Strong#Pass1" } });
check("register: authorized email but users exist -> 403 generic", authEmail.status === 403 && /temporarily unavailable/i.test(authEmail.data.message || ""), `status=${authEmail.status}`);

const wrongEmail = await req("POST", "/api/auth/register", { body: { name: "X", email: "other@example.com", password: "Strong#Pass1" } });
check("register: wrong email -> 403 generic (same message)", wrongEmail.status === 403 && wrongEmail.data.message === authEmail.data.message, `status=${wrongEmail.status}`);

const caseEmail = await req("POST", "/api/auth/register", { body: { name: "X", email: "SaugatB40@GMAIL.COM", password: "Strong#Pass1" } });
check("register: case-variant authorized email still closed (users exist) -> 403", caseEmail.status === 403 && caseEmail.data.message === authEmail.data.message, `status=${caseEmail.status}`);

const invalidPayload = await req("POST", "/api/auth/register", { body: { name: "", email: "not-an-email", password: "123" } });
check("register: invalid payload -> 400 (validation), not 403 reveals nothing", invalidPayload.status === 400 && Array.isArray(invalidPayload.data.errors), `status=${invalidPayload.status}`);

const userCount = await User.countDocuments();
check("register: no new users created by blocked attempts", userCount === 2, `count=${userCount}`);

// Flag-OFF behavior would return the same generic 403; env is fixed here, but
// the unit test asserts the 403 is byte-identical for OFF and ON. Verify the
// message has no state-specific wording.
check("register: denial message carries no state hints", !/flag|email|admin|user|count/i.test(authEmail.data.message));

// ---------- B. AUTH / RBAC REGRESSION ----------------------------------------
console.log("\n=== AUTH / RBAC ===");
const login = await req("POST", "/api/auth/login", { body: { email: "admin@kmes.test", password: "AdminPass#1" } });
check("login admin -> 200 + token", login.status === 200 && login.data.token, `status=${login.status}`);
const adminToken = login.data.token;

const me = await req("GET", "/api/auth/me", { token: adminToken });
check("GET /me -> 200 + admin role", me.status === 200 && me.data.data.role === "admin", `status=${me.status}`);
check("/me permissions non-empty for admin", Array.isArray(me.data.data.permissions) && me.data.data.permissions.length > 0);

const noTokenMe = await req("GET", "/api/auth/me");
check("GET /me no token -> 401", noTokenMe.status === 401, `status=${noTokenMe.status}`);

const listUsers = await req("GET", "/api/users", { token: adminToken });
check("GET /api/users by admin -> 200", listUsers.status === 200, `status=${listUsers.status}`);

const noAuthUsers = await req("GET", "/api/users");
check("GET /api/users no token -> 401", noAuthUsers.status === 401, `status=${noAuthUsers.status}`);

const editorLogin = await req("POST", "/api/auth/login", { body: { email: "editor@kmes.test", password: "EditorPass#1" } });
const editorToken = editorLogin.data.token;
const editorUsers = await req("GET", "/api/users", { token: editorToken });
check("GET /api/users by editor -> 403 (RBAC)", editorUsers.status === 403, `status=${editorUsers.status}`);

// ---------- C. PASSWORD RESET + SECURITY NOTIFICATION (mock) ----------------
console.log("\n=== RESET + SECURITY NOTIFICATION ===");
emailMock.clear();
const fp = await req("POST", "/api/auth/forgot-password", { body: { email: "admin@kmes.test" } });
check("forgot: generic 200", fp.status === 200 && /registered/i.test(fp.data.message || ""), `status=${fp.status}`);
check("mock: 1 password-reset email", emailMock._count() === 1, `count=${emailMock._count()}`);
const resetTok = emailMock.deliveries[0].resetToken;

const reset = await req("POST", "/api/auth/reset-password", { body: { token: resetTok, password: "BrandNew#123" } });
check("reset: 200 success", reset.status === 200 && reset.data.success, `status=${reset.status}`);

const notifs = emailMock.securityNotifications || [];
check("security notification sent after reset (mock)", notifs.length === 1, `len=${notifs.length}`);
check("security notification to the reset account", notifs[0] && notifs[0].to === "admin@kmes.test");
check("security notification contains no token/password", notifs[0] && !/(token|NewPass|BrandNew)/i.test(JSON.stringify(notifs[0])));

const newLogin = await req("POST", "/api/auth/login", { body: { email: "admin@kmes.test", password: "BrandNew#123" } });
check("login with new password works", newLogin.status === 200 && newLogin.data.token, `status=${newLogin.status}`);

// ---------- RESTORE ----------
await mongoServer.stop();

console.log(`\n-------------`);
console.log(`PASS ${passed}`);
console.log(`FAIL ${failed}`);
if (failures.length) { console.log("Failures:"); failures.forEach((f) => console.log("  " + f)); }
process.exit(failed === 0 ? 0 : 1);
