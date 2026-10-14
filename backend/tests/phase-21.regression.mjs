// Phase 21 regression suite: one assertion group per remediated defect.
// Runs against MongoMemoryServer by default (CI) or any MongoDB-compatible
// server via TEST_MONGODB_URI. Uses forward-slash paths so it works on Linux/CI.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => pathToFileURL(path.join(here, "..", "src", p)).href;

let mongo = null;
let uri = process.env.TEST_MONGODB_URI;
if (!uri) {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
}

const PORT = 5600 + Math.floor(Math.random() * 300);
Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: String(PORT),
  MONGODB_URI: uri,
  JWT_SECRET: "phase21-test-secret-phase21-test-secret",
  ALLOWED_ORIGINS: "http://localhost:5173",
  ALLOW_ADMIN_BOOTSTRAP: "true",
  ADMIN_BOOTSTRAP_EMAIL: "owner@example.com",
  EMAIL_PROVIDER: "mock",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
});

await import(src("server.js"));
const B = `http://127.0.0.1:${PORT}`;
const Notice = (await import(src("models/Notice.js"))).default;
const SiteSettings = (await import(src("models/SiteSettings.js"))).default;
const ContactMessage = (await import(src("models/ContactMessage.js"))).default;
const { documentSignatureMatches } = await import(src("middleware/attachmentUpload.js"));
const { escapeRegex } = await import(src("utils/escapeRegex.js"));

let passed = 0;
let failed = 0;
const check = (name, ok, extra = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
};
const call = async (method, p, body, token, headers = {}) => {
  const r = await fetch(B + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await r.json(); } catch { /* non-json */ }
  return { s: r.status, d: data, h: r.headers };
};
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${B}/api/health`)).ok) break; } catch { /* wait */ }
  await new Promise((r) => setTimeout(r, 250));
}

// ---- auth / setup
let r = await call("POST", "/api/auth/register", { name: "Owner", email: "owner@example.com", password: "Passw0rd!" });
const admin = r.d.token;
check("first admin bootstrap works", r.s === 201 && !!admin);
r = await call("POST", "/api/auth/register", { name: "X", email: "x@example.com", password: "Passw0rd!" });
check("second public registration is blocked", r.s === 403);
r = await call("POST", "/api/auth/login", { email: "  OWNER@Example.com ", password: "Passw0rd!" });
check("login ignores email case and spaces", r.s === 200);
r = await call("POST", "/api/auth/login", { email: "owner@example.com", password: { $ne: "" } });
check("login rejects non-string password with 400", r.s === 400, String(r.s));

// ---- contact form
r = await call("POST", "/api/contact", { name: "A", email: "a@b.co", subject: "s", message: "m", read: true, archived: true });
const stored = await ContactMessage.findOne({ email: "a@b.co" });
check("contact: client cannot set read/archived", r.s === 201 && stored.read === false && stored.archived === false);
check("contact: response does not echo the stored document", r.d.data === undefined);
r = await call("POST", "/api/contact", { name: "A".repeat(500), email: "a@b.co", subject: "s", message: "m" });
check("contact: oversized name rejected with 400", r.s === 400);
let limited = 0;
for (let i = 0; i < 12; i++) if ((await call("POST", "/api/contact", { name: "n", email: "a@b.co", subject: "s", message: "m" })).s === 429) limited++;
check("contact: rate limiter returns 429", limited > 0, `429s=${limited}`);

// ---- workflow / bulk
r = await call("POST", "/api/notices", { title: "T", description: "D", date: "" }, admin);
const nid = r.d.data?._id;
check("create with blank date succeeds and keeps default date", r.s === 201 && !!r.d.data.date, JSON.stringify(r.d.data?.date));
for (const a of ["submit", "approve", "publish"]) await call("POST", `/api/notices/${nid}/${a}`, {}, admin);
r = await call("POST", "/api/notices/admin/bulk-publish", { ids: [nid], published: false }, admin);
check("bulk UNPUBLISH no longer crashes", r.s === 200 && r.d.results?.unpublished?.length === 1, `${r.s} ${r.d.message || ""}`);

// ---- validation and error mapping
r = await call("POST", "/api/notices", { description: "no title" }, admin);
check("schema validation error returns 400 (not 500)", r.s === 400, String(r.s));
r = await call("GET", "/api/notices/admin/all?q=(", null, admin);
check("search with regex characters does not crash", r.s === 200, String(r.s));
check("escapeRegex escapes metacharacters", escapeRegex("a(b[c.*") === "a\\(b\\[c\\.\\*");
r = await call("POST", "/api/notices", { title: "bad", description: "d", attachments: [{ name: "x", url: "javascript:alert(1)" }] }, admin);
check("attachment javascript: URL rejected with 400", r.s === 400, String(r.s));
r = await call("POST", "/api/events", { title: "e", description: "d", date: "2026-10-20", image: "javascript:alert(1)" }, admin);
check("event image javascript: URL rejected with 400", r.s === 400, String(r.s));
r = await call("POST", "/api/events", { title: "e", description: "d", date: "2026-10-20", image: "https://example.com/a.jpg" }, admin);
check("event with https image still works", r.s === 201, String(r.s));

// ---- attachments keep server-side identity on save
const n2 = await call("POST", "/api/notices", { title: "Att", description: "d" }, admin);
const doc = await Notice.findById(n2.d.data._id);
doc.attachments.push({ name: "a.pdf", url: "https://res.cloudinary.com/x/a.pdf", publicId: "kmes/a", resourceType: "raw" });
await doc.save();
const attId = String(doc.attachments[0]._id);
r = await call("PUT", `/api/notices/${doc._id}`, { attachments: [{ _id: attId, name: "renamed.pdf", url: "https://evil.example/x", publicId: "someone-elses" }] }, admin);
const after = await Notice.findById(doc._id);
check("attachment round-trip keeps publicId/url and _id", r.s === 200 && after.attachments[0].publicId === "kmes/a" && after.attachments[0].url === "https://res.cloudinary.com/x/a.pdf" && String(after.attachments[0]._id) === attId, JSON.stringify(after.attachments[0]));
check("attachment display name can still change", after.attachments[0].name === "renamed.pdf");

// ---- document signatures
check("pdf signature accepted", documentSignatureMatches(Buffer.from("%PDF-1.7\n...."), ".pdf"));
check("exe renamed to .pdf rejected", !documentSignatureMatches(Buffer.from("MZ\x90\x00\x03\x00\x00\x00padding"), ".pdf"));
check("docx zip signature accepted", documentSignatureMatches(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0]), ".docx"));
check("script renamed to .docx rejected", !documentSignatureMatches(Buffer.from("<script>alert(1)</script>"), ".docx"));

// ---- public GETs must not write
await SiteSettings.deleteMany({});
await call("GET", "/api/site-settings");
await call("GET", "/api/leadership");
check("public GET /site-settings and /leadership create no documents", (await SiteSettings.countDocuments()) === 0);
r = await call("GET", "/api/site-settings");
check("public settings still return usable defaults without a fake phone", r.s === 200 && r.d.data?.schoolName && r.d.data.phone === "", JSON.stringify(r.d.data?.phone));

// ---- users
r = await call("POST", "/api/users", { name: "Ed", email: "ed@example.com", password: "Passw0rd!", role: "editor" }, admin);
const uid = r.d.data?.id;
const edLogin = await call("POST", "/api/auth/login", { email: "ed@example.com", password: "Passw0rd!" });
r = await call("PUT", `/api/users/${uid}`, { password: "x" }, admin);
check("admin cannot set a too-short password", r.s === 400, String(r.s));
r = await call("PUT", `/api/users/${uid}`, { email: "not-an-email" }, admin);
check("invalid email on update rejected", r.s === 400, String(r.s));
r = await call("PUT", `/api/users/${uid}`, { email: "OWNER@example.com" }, admin);
check("duplicate email on update returns 409", r.s === 409, String(r.s));
r = await call("PUT", `/api/users/${uid}`, { password: "NewPassw0rd!" }, admin);
check("valid password change accepted", r.s === 200);
r = await call("GET", "/api/auth/me", null, edLogin.d.token);
check("old session ends after admin password change", r.s === 401, String(r.s));

// ---- CORS
r = await call("GET", "/api/health", null, null, { Origin: "https://kmes-school-abc123-team.vercel.app" });
check("vercel preview origin allowed by default", r.h.get("access-control-allow-origin") === "https://kmes-school-abc123-team.vercel.app");
r = await call("GET", "/api/health", null, null, { Origin: "https://kmes-school.evil.com" });
check("lookalike origin rejected", !r.h.get("access-control-allow-origin"));
process.env.ALLOW_VERCEL_PREVIEWS = "false";
r = await call("GET", "/api/health", null, null, { Origin: "https://kmes-school-abc123-team.vercel.app" });
check("ALLOW_VERCEL_PREVIEWS=false turns previews off", !r.h.get("access-control-allow-origin"));
r = await call("GET", "/api/health", null, null, { Origin: "http://localhost:5173" });
check("explicit ALLOWED_ORIGINS entry still allowed", r.h.get("access-control-allow-origin") === "http://localhost:5173");

console.log(`\nPASS ${passed}\nFAIL ${failed}`);
if (mongo) await mongo.stop();
process.exit(failed ? 1 : 0);
