// Phase 20 — offline unit tests for auth hardening + SMTP.
//
// No database, no network, no .env access. Covers:
//   A. First-admin bootstrap: strict-flag parsing, email authorization,
//      normalization, generic-denied payload.
//   B. SMTP provider: assertEmailProviderConfiguration (smtp requirements,
//      unsupported-provider failure), selectEmailProvider, SMTP_SECURE, from-name
//      default, sendSecurityNotification on adapters.
//
// Env-sensitive modules snapshot process.env at import time, so desired env is
// set BEFORE dynamic imports below. We import adminBootstrap (pure) and
// emailService/smtpEmailAdapter with a clean env.
import assert from "node:assert";

process.env.NODE_ENV = "development";
process.env.EMAIL_PROVIDER = "mock";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_SECURE = "";
process.env.EMAIL_FROM = "";
process.env.RESET_LINK_BASE = "https://staging.schooldomain.com";
process.env.FRONTEND_URL = "http://localhost:5173";

const bootstrap = await import("../src/utils/adminBootstrap.js");
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

// --- A. First-admin bootstrap (pure helpers) --------------------------------
console.log("\n=== FIRST-ADMIN BOOTSTRAP ===");
process.env.ALLOW_ADMIN_BOOTSTRAP = "true";
process.env.ADMIN_BOOTSTRAP_EMAIL = "saugatb40@gmail.com";
await import("../src/config/env.js"); // not needed to re-run; helpers read env lazily

check("authorized email matches exact", () => {
  assert.strictEqual(bootstrap.isAuthorizedBootstrapEmail("saugatb40@gmail.com"), true);
});

check("authorized email is case-insensitive", () => {
  assert.strictEqual(bootstrap.isAuthorizedBootstrapEmail("SaugatB40@GMAIL.COM"), true);
  assert.strictEqual(bootstrap.isAuthorizedBootstrapEmail("  saugatb40@gmail.com  "), true);
});

check("unauthorized email rejected", () => {
  assert.strictEqual(bootstrap.isAuthorizedBootstrapEmail("other@example.com"), false);
  assert.strictEqual(bootstrap.isAuthorizedBootstrapEmail(""), false);
});

check("normalizeEmail lowercases and trims", () => {
  assert.strictEqual(bootstrap.normalizeEmail("  Foo@BAR.COM "), "foo@bar.com");
  assert.strictEqual(bootstrap.normalizeEmail(undefined), "");
});

check("generic denied response identical for all cases", () => {
  assert.strictEqual(bootstrap.GENERIC_REGISTRATION_DENIED.success, false);
  assert.match(bootstrap.GENERIC_REGISTRATION_DENIED.message, /temporarily unavailable/i);
  // Must not reveal email/flag/user-count state.
  assert.ok(!/email|flag|user|admin|author/i.test(bootstrap.GENERIC_REGISTRATION_DENIED.message));
});

// --- B. Strict flag parsing via env module ---------------------------------
console.log("\n=== STRICT BOOTSTRAP FLAG ===");
{
  // Verify env.parseStrictBool semantics by running a fresh subprocess because
  // env.js is cached. We instead assert via the exported env object in a fresh
  // dynamic import with the flag unset (default false).
  delete process.env.ALLOW_ADMIN_BOOTSTRAP;
  process.env.EMAIL_PROVIDER = "mock";
  const envMod = await import("../src/config/env.js?strict-default");
  check("ALLOW_ADMIN_BOOTSTRAP unset -> false", () => {
    assert.strictEqual(envMod.env.allowAdminBootstrap, false);
  });
}

// --- C. SMTP provider selection + config assert ----------------------------
console.log("\n=== SMTP PROVIDER ===");
check("selectEmailProvider: mock", () => {
  process.env.EMAIL_PROVIDER = "mock";
  assert.strictEqual(emailSvc.selectEmailProvider(), "mock");
});
check("selectEmailProvider: smtp", () => {
  process.env.EMAIL_PROVIDER = "smtp";
  assert.strictEqual(emailSvc.selectEmailProvider(), "smtp");
});
check("selectEmailProvider: none", () => {
  process.env.EMAIL_PROVIDER = "none";
  assert.strictEqual(emailSvc.selectEmailProvider(), "none");
});
check("selectEmailProvider: unknown is not blindly accepted", () => {
  process.env.EMAIL_PROVIDER = "resend";
  assert.notStrictEqual(emailSvc.selectEmailProvider(), "mock");
});

check("assertEmailProviderConfiguration throws on unknown provider", () => {
  process.env.EMAIL_PROVIDER = "resend";
  assert.throws(() => emailSvc.assertEmailProviderConfiguration(), /Unsupported EMAIL_PROVIDER/);
});

check("assertEmailProviderConfiguration accepts mock without SMTP vars", () => {
  process.env.EMAIL_PROVIDER = "mock";
  process.env.SMTP_HOST = "";
  assert.doesNotThrow(() => emailSvc.assertEmailProviderConfiguration());
});

check("assertEmailProviderConfiguration accepts none", () => {
  process.env.EMAIL_PROVIDER = "none";
  assert.doesNotThrow(() => emailSvc.assertEmailProviderConfiguration());
});

check("assertEmailProviderConfiguration smtp fails fast when fields missing", () => {
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  assert.throws(() => emailSvc.assertEmailProviderConfiguration(), (e) => e instanceof SMTPServiceError);
});

check("assertEmailProviderConfiguration smtp ok with host+user+password", () => {
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASSWORD = "p";
  assert.doesNotThrow(() => emailSvc.assertEmailProviderConfiguration());
});

check("assertEmailProviderConfiguration smtp accepts SMTP_PASS fallback", () => {
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "u";
  process.env.SMTP_PASSWORD = "";
  process.env.SMTP_PASS = "fallback-pass";
  assert.doesNotThrow(() => emailSvc.assertEmailProviderConfiguration());
});

// --- D. SMTP adapter: SMTP_SECURE + from-name default -----------------------
console.log("\n=== SMTP ADAPTER DETAILS ===");
check("SMTP_SECURE root env default is false", async () => {
  process.env.SMTP_SECURE = "";
  const envMod = await import("../src/config/env.js?secure-default");
  assert.strictEqual(envMod.env.smtpSecure, false);
});

check("from-name default is the school name (no SMTP_PASS env for unit)", async () => {
  process.env.EMAIL_FROM_NAME = "";
  const adapter = new SmtpEmailAdapter();
  assert.strictEqual(adapter.constructor.DEFAULT_FROM_NAME, "Kaseni Model Secondary English School");
});

check("sendSecurityNotification exists on adapters", async () => {
  const mockAdapter = emailSvc.getMockEmailAdapter();
  assert.strictEqual(typeof mockAdapter.sendSecurityNotification, "function");
  const r = await mockAdapter.sendSecurityNotification({ to: "a@b.test", subject: "s", text: "t" });
  assert.strictEqual(r.ok, true);
});

check("sendSecurityNotification recorded separately from password resets", async () => {
  const mockAdapter = emailSvc.getMockEmailAdapter();
  mockAdapter.clear();
  await mockAdapter.sendPasswordReset({ to: "a@b.test", resetToken: "t", resetClientUrl: "url" });
  await mockAdapter.sendSecurityNotification({ to: "a@b.test", subject: "security", text: "body" });
  assert.strictEqual(mockAdapter._count(), 1);
  const notifs = mockAdapter.securityNotifications || [];
  assert.strictEqual(notifs.length, 1);
  assert.strictEqual(notifs[0].subject, "security");
});

console.log(`\nPHASE_20_UNIT: ${totals.pass} PASS, ${totals.fail} FAIL`);
if (totals.fail > 0) process.exit(1);
