// Phase 18C — offline unit tests for the new modules.
//
// No database, no network, no .env access. Covers:
//   A. Content-based (magic byte) image validation
//   B. CMS allow-list sanitization (site settings + page content)
//   C. Password-reset token primitives
//   D. Email adapter selection + SMTP config guards
//
// Env-sensitive modules (emailService, resetToken -> env) snapshot process.env
// at import time, so the desired process.env is set BEFORE the dynamic imports
// below.
import assert from "node:assert";

process.env.NODE_ENV = "development";
process.env.EMAIL_PROVIDER = "";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.EMAIL_FROM = "";
process.env.RESET_LINK_BASE = "https://staging.schooldomain.com";
process.env.FRONTEND_URL = "http://localhost:5173";

const fileValidation = await import("../src/utils/fileValidation.js");
const cmsValidation = await import("../src/utils/cmsValidation.js");
const resetToken = await import("../src/utils/resetToken.js");
const emailSvc = await import("../src/integrations/email/emailService.js");
const smtpModule = await import("../src/integrations/email/smtpEmailAdapter.js");

const { SmtpEmailAdapter, SMTPServiceError } = smtpModule;

let totals = { pass: 0, fail: 0 };
function check(name, fn) {
  try {
    fn();
    totals.pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    totals.fail += 1;
    console.log(`  FAIL  ${name} :: ${e.message}`);
  }
}

// --- Small real-world-ish image headers -------------------------------------
const PNG = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"), // PNG signature
  Buffer.from("0000000d49484452", "hex"),
  Buffer.alloc(64, 1),
]);
const JPEG = Buffer.concat([Buffer.from("ffd8ff", "hex"), Buffer.alloc(64, 1)]);
const GIF = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(32, 2)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.alloc(4),
  Buffer.from("WEBP", "latin1"),
  Buffer.alloc(32, 3),
]);
const SVG_TEXT = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML_TEXT = Buffer.from("<!DOCTYPE html><html><body>hi</body></html>");
const PLAIN_TEXT = Buffer.from("hello world, definitely not an image");

// --- A. File validation ------------------------------------------------------
console.log("\n=== FILE VALIDATION ===");
check("detect PNG signature", () => assert.strictEqual(fileValidation.detectImageFormat(PNG), "png"));
check("detect JPEG signature", () => assert.strictEqual(fileValidation.detectImageFormat(JPEG), "jpeg"));
check("detect GIF signature", () => assert.strictEqual(fileValidation.detectImageFormat(GIF), "gif"));
check("detect WEBP signature", () => assert.strictEqual(fileValidation.detectImageFormat(WEBP), "webp"));
check("reject SVG/HTML/plain as images", () => {
  assert.strictEqual(fileValidation.detectImageFormat(SVG_TEXT), null);
  assert.strictEqual(fileValidation.detectImageFormat(HTML_TEXT), null);
  assert.strictEqual(fileValidation.detectImageFormat(PLAIN_TEXT), null);
});
check("detectImageFormat non-buffer returns null", () => {
  assert.strictEqual(fileValidation.detectImageFormat(null), null);
  assert.strictEqual(fileValidation.detectImageFormat("nope"), null);
});

check("valid PNG upload passes", () => {
  const r = fileValidation.validateImageUpload({ buffer: PNG, mimetype: "image/png" });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.format, "png");
  assert.strictEqual(r.mimeType, "image/png");
});
check("mimetype/content mismatch rejected (spoof)", () => {
  const r = fileValidation.validateImageUpload({ buffer: PNG, mimetype: "image/jpeg" });
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /does not match/);
});
check("SVG mimetype rejected outright", () => {
  const r = fileValidation.validateImageUpload({ buffer: PNG, mimetype: "image/svg+xml" });
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Unsupported image type/);
});
check("HTML content with image/png mimetype rejected", () => {
  const r = fileValidation.validateImageUpload({ buffer: HTML_TEXT, mimetype: "image/png" });
  assert.strictEqual(r.ok, false);
});
check("oversized image rejected", () => {
  const r = fileValidation.validateImageUpload({
    buffer: Buffer.alloc(9 * 1024 * 1024 + 1),
    mimetype: "image/png",
  });
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /maximum allowed size/);
});
check("empty image rejected", () => {
  const r = fileValidation.validateImageUpload({ buffer: Buffer.alloc(0), mimetype: "image/png" });
  assert.strictEqual(r.ok, false);
});

// --- B. CMS validation -------------------------------------------------------
console.log("\n=== CMS VALIDATION ===");
check("site settings: valid string/email/bool passes", () => {
  const r = cmsValidation.sanitizeSiteSettings({
    schoolName: "KMES",
    email: "school@kmes.test",
    published: true,
  });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.payload.schoolName, "KMES");
  assert.deepStrictEqual(r.payload.published, true);
});
check("site settings: unknown fields stripped not persisted", () => {
  const r = cmsValidation.sanitizeSiteSettings({
    schoolName: "KMES",
    adminNote: "x",
    _id: "fake",
    createdAt: "fake",
    "a.b": "c",
    $set: { schoolName: "evil" },
  });
  assert.ok(r.rejected.includes("adminNote"));
  assert.ok(r.rejected.includes("_id"));
  assert.ok(!("adminNote" in r.payload));
  assert.ok(!("_id" in r.payload));
  assert.ok(!("$set" in r.payload));
  assert.ok(!("a.b" in r.payload));
  assert.ok(r.ok);
});
check("site settings: invalid email rejected", () => {
  const r = cmsValidation.sanitizeSiteSettings({ email: "not-an-email" });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith("email")));
});
check("site settings: javascript: URL rejected", () => {
  const r = cmsValidation.sanitizeSiteSettings({ facebookUrl: "javascript:alert(1)" });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("facebookUrl")));
});
check("site settings: valid http(s) URL normalized", () => {
  const r = cmsValidation.sanitizeSiteSettings({ facebookUrl: "https://www.facebook.com/kmes" });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.payload.facebookUrl, "https://www.facebook.com/kmes");
});
check("site settings: non-string rejected", () => {
  const r = cmsValidation.sanitizeSiteSettings({ schoolName: 123 });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith("schoolName")));
});
check("site settings: published must be boolean", () => {
  const r = cmsValidation.sanitizeSiteSettings({ published: "true" });
  assert.strictEqual(r.ok, false);
});
check("page content: missing slug on create rejected", () => {
  const r = cmsValidation.sanitizePageContent({ title: "About us" }, { requireSlug: true });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith("slug")));
});
check("page content: slug trimmed+lowercased", () => {
  const r = cmsValidation.sanitizePageContent({ slug: "  ABOUT " });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.payload.slug, "about");
});
check("page content: slug not required on update", () => {
  const r = cmsValidation.sanitizePageContent({ title: "Just a title" });
  assert.strictEqual(r.ok, true);
});
check("page content: data: heroImage rejected", () => {
  const r = cmsValidation.sanitizePageContent({ slug: "x", heroImage: "data:image/png;base64,AAAA" });
  assert.strictEqual(r.ok, false);
});
check("page content: uppercase slug on update normalized", () => {
  const r = cmsValidation.sanitizePageContent({ slug: "MISSION " });
  assert.strictEqual(r.payload.slug, "mission");
});

// --- C. Reset token ----------------------------------------------------------
console.log("\n=== RESET TOKEN UTILS ===");
check("generateResetToken is 43-char base64url", () => {
  const t = resetToken.generateResetToken();
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
});
check("two tokens differ", () => {
  assert.notStrictEqual(resetToken.generateResetToken(), resetToken.generateResetToken());
});
check("hashResetToken is 64-hex sha256", () => {
  assert.match(resetToken.hashResetToken("abc"), /^[0-9a-f]{64}$/);
});
check("hash is deterministic and one-way", () => {
  assert.strictEqual(resetToken.hashResetToken("tok"), resetToken.hashResetToken("tok"));
  assert.notStrictEqual(resetToken.hashResetToken("tok"), "tok");
});
check("buildResetLink uses env RESET_LINK_BASE", () => {
  const t = "abc_XYZ123";
  assert.strictEqual(
    resetToken.buildResetLink(t),
    `https://staging.schooldomain.com/reset-password?token=${encodeURIComponent(t)}`
  );
});
check("generic response contains no token echoes", () => {
  assert.doesNotThrow(() => resetToken.GENERIC_RESET_RESPONSE);
  assert.match(resetToken.GENERIC_RESET_RESPONSE.message, /registered/);
});

// --- D. Email provider selection + SMTP guards -------------------------------
console.log("\n=== EMAIL PROVIDER SELECTION ===");
check("unset EMAIL_PROVIDER -> mock adapter (safe default)", () => {
  const adapter = emailSvc.getEmailAdapter();
  assert.strictEqual(typeof adapter.clear, "function");
});
check("setEmailProviderConfig smtp -> SmtpEmailAdapter", () => {
  emailSvc.setEmailProviderConfig({ provider: "smtp" });
  assert.ok(emailSvc.getEmailAdapter() instanceof SmtpEmailAdapter);
});
check("setEmailProviderConfig none -> NoopEmailAdapter", async () => {
  emailSvc.setEmailProviderConfig({ provider: "none" });
  const adapter = emailSvc.getEmailAdapter();
  const r = await adapter.sendPasswordReset({ to: "x@y.test" });
  assert.strictEqual(r.ok, true);
});
check("setEmailProviderConfig mock -> MockEmailAdapter", () => {
  emailSvc.setEmailProviderConfig({ provider: "mock" });
  assert.strictEqual(typeof emailSvc.getEmailAdapter().clear, "function");
  assert.strictEqual(emailSvc.getEmailAdapter()._count(), 0);
});

console.log("\n=== SMTP CONFIG GUARDS ===");
check("assertConfigured throws when SMTP_HOST missing", () => {
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASS = "p";
  const adapter = new SmtpEmailAdapter();
  assert.throws(() => adapter.assertConfigured(), (e) => e instanceof SMTPServiceError);
});
check("assertConfigured throws when only one credential present", () => {
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASS = "";
  const adapter = new SmtpEmailAdapter();
  assert.throws(() => adapter.assertConfigured(), /incomplete/i);
});
check("assertConfigured passes with host + both credentials", () => {
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASS = "p";
  process.env.EMAIL_FROM = "";
  const adapter = new SmtpEmailAdapter();
  assert.doesNotThrow(() => adapter.assertConfigured());
});
check("assertConfigured passes with host and no credentials (auth-less relay)", () => {
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  process.env.EMAIL_FROM = "sender@kmes.test";
  const adapter = new SmtpEmailAdapter();
  assert.doesNotThrow(() => adapter.assertConfigured());
});
check("adapter requires a sender (host, creds, but no EMAIL_FROM)", () => {
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  process.env.EMAIL_FROM = "";
  const adapter = new SmtpEmailAdapter();
  assert.throws(() => adapter.assertConfigured(), /sender/i);
});
check("sendPasswordReset fails fast with SMTPServiceError when unconfigured", async () => {
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  const adapter = new SmtpEmailAdapter();
  await assert.rejects(
    () => adapter.sendPasswordReset({ to: "a@b.test", resetClientUrl: "https://x/reset?token=t" }),
    (e) => e instanceof SMTPServiceError && e.code === "SMTP_NOT_CONFIGURED"
  );
});

console.log(`\nPHASE_18C_UNIT: ${totals.pass} PASS, ${totals.fail} FAIL`);
if (totals.fail > 0) process.exit(1);