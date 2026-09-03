// Phase 18C-3 — Deployment foundation tests.
//
// Focused, offline verification (no database, no network) of:
//   A. Environment/config resolution (resetLinkBase, allowedOrigins, trustProxy)
//   B. Production config validation (wildcard CORS, empty origin, missing DB/JWT)
//   C. getPublicConfigSnapshot never returns secret values
//   D. Seed guard: production blocked, flag required elsewhere, dev/staging allowed
//   E. Reset-link base never cross-links environments
//
// env.js resolves `env` at import time, so each scenario runs in a fresh
// subprocess with the desired process.env and is asserted on its JSON output.
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_MJS = "file:///" + path.resolve(__dirname, "../src/config/env.js").replaceAll("\\", "/");
const SEED_GUARD_MJS = "file:///" + path.resolve(__dirname, "../src/config/seedGuard.js").replaceAll("\\", "/");

const PROBE = `
  import { env, validateProductionConfiguration, validateStagingConfiguration, getPublicConfigSnapshot } from ${JSON.stringify(ENV_MJS)};
  process.stdout.write(JSON.stringify({
    snap: getPublicConfigSnapshot(),
    problems: validateProductionConfiguration(),
    stagingProblems: validateStagingConfiguration(),
    hasWildcardOrigin: env.allowedOrigins.includes("*"),
  }));
`;

function probe(extraVars) {
  const res = spawnSync("node", ["--input-type=module", "-e", PROBE], {
    env: { ...process.env, ...extraVars },
  });
  const out = Buffer.from(res.stdout).toString();
  return { status: res.status, parsed: JSON.parse(out.trim().split("\n").pop()) };
}

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

// --- D. Seed guard (pure module import) ---
{
  const seedGuard = await import(SEED_GUARD_MJS);
  const origEnv = process.env.NODE_ENV;
  const origArgv = process.argv;

  process.env.NODE_ENV = "production";
  process.argv = ["node", "src/seed.js"];
  check("seed blocked in production", () => {
    const r = seedGuard.assertSeedAllowed();
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.reason, "production");
  });

  process.env.NODE_ENV = "development";
  process.argv = ["node", "src/seed.js"];
  check("seed requires --allow-destructive in development", () => {
    const r = seedGuard.assertSeedAllowed();
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.reason, "flag-required");
  });
  process.argv = ["node", "src/seed.js", "--allow-destructive"];
  check("seed allowed with --allow-destructive in development", () => {
    assert.strictEqual(seedGuard.assertSeedAllowed().allowed, true);
  });

  process.env.NODE_ENV = "staging";
  process.argv = ["node", "src/seed.js"];
  check("seed requires --allow-destructive in staging", () => {
    assert.strictEqual(seedGuard.assertSeedAllowed().allowed, false);
  });
  process.argv = ["node", "src/seed.js", "--allow-destructive"];
  check("seed allowed with --allow-destructive in staging", () => {
    assert.strictEqual(seedGuard.assertSeedAllowed().allowed, true);
  });

  process.env.NODE_ENV = origEnv;
  process.argv = origArgv;
}

// --- A/B/C/E. Config scenarios via subprocess ---
check("dev defaults resolve correctly", () => {
  const r = probe({ NODE_ENV: "development" });
  assert.deepStrictEqual(r.parsed.snap.allowedOrigins, ["http://localhost:5173"]);
  assert.strictEqual(r.parsed.snap.resetLinkBase, "http://localhost:5173");
  assert.strictEqual(r.parsed.snap.trustProxy, "0");
  assert.deepStrictEqual(r.parsed.problems, []);
  assert.strictEqual(r.parsed.hasWildcardOrigin, false);
});

check("RESET_LINK_BASE wins over FRONTEND_URL", () => {
  const r = probe({
    NODE_ENV: "development",
    RESET_LINK_BASE: "https://staging.schooldomain.com",
    FRONTEND_URL: "http://localhost:5173",
  });
  assert.strictEqual(r.parsed.snap.resetLinkBase, "https://staging.schooldomain.com");
});

check("reset base falls back to FRONTEND_URL when RESET_LINK_BASE unset", () => {
  const r = probe({ NODE_ENV: "development", FRONTEND_URL: "https://www.schooldomain.com" });
  assert.strictEqual(r.parsed.snap.resetLinkBase, "https://www.schooldomain.com");
});

check("multi-origin allow-list is trimmed and de-duplicated", () => {
  const r = probe({
    NODE_ENV: "development",
    ALLOWED_ORIGINS: "https://www.schooldomain.com, https://staging.schooldomain.com ,https://www.schooldomain.com",
  });
  assert.deepStrictEqual(r.parsed.snap.allowedOrigins, [
    "https://www.schooldomain.com",
    "https://staging.schooldomain.com",
  ]);
});

check("wildcard origin is detected", () => {
  const r = probe({ NODE_ENV: "development", ALLOWED_ORIGINS: "*" });
  assert.strictEqual(r.parsed.hasWildcardOrigin, true);
});

check("empty CORS allow-list flagged in production", () => {
  const r = probe({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: " ",
    MONGODB_URI: "x",
    JWT_SECRET: "y",
    RESET_LINK_BASE: "z",
  });
  assert.ok(r.parsed.problems.some((p) => p.includes("No frontend origin")));
});

check("wildcard CORS flagged in production", () => {
  const r = probe({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "*",
    MONGODB_URI: "x",
    JWT_SECRET: "y",
    RESET_LINK_BASE: "z",
  });
  assert.ok(r.parsed.problems.some((p) => p.includes("wildcard")));
});

check("missing prod DB/JWT flagged", () => {
  const r = probe({ NODE_ENV: "production", ALLOWED_ORIGINS: "https://www.schooldomain.com" });
  assert.ok(r.parsed.problems.some((p) => p.includes("MONGODB_URI")));
  assert.ok(r.parsed.problems.some((p) => p.includes("JWT_SECRET")));
});

check("reset base is env-isolated (falls back to the env's own frontend)", () => {
  // Staging reset links must NOT point at production. Verify that with no
  // explicit RESET_LINK_BASE, the base resolves to the environment's own
  // FRONTEND_URL, not a hardcoded production host.
  const r = probe({
    NODE_ENV: "staging",
    FRONTEND_URL: "https://staging.schooldomain.com",
    ALLOWED_ORIGINS: "https://staging.schooldomain.com",
  });
  assert.strictEqual(r.parsed.snap.resetLinkBase, "https://staging.schooldomain.com");
  assert.strictEqual(r.parsed.snap.resetLinkBase.includes("https://www."), false, "no production host leaked");
});

check("valid production config produces no validation problems", () => {
  const r = probe({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://x",
    JWT_SECRET: "s",
    ALLOWED_ORIGINS: "https://www.schooldomain.com",
    RESET_LINK_BASE: "https://www.schooldomain.com",
  });
  assert.deepStrictEqual(r.parsed.problems, []);
});

check("config snapshot exposes no secret values", () => {
  const r = probe({
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://user:supersecret@x",
    JWT_SECRET: "super-secret-jwt",
    CLOUDINARY_API_SECRET: "cloudsecret",
    FACEBOOK_PAGE_ACCESS_TOKEN: "fbtoken",
    ALLOWED_ORIGINS: "https://www.schooldomain.com",
    RESET_LINK_BASE: "https://www.schooldomain.com",
  });
  const blob = JSON.stringify(r.parsed);
  for (const secret of ["supersecret", "super-secret-jwt", "cloudsecret", "fbtoken", "mongodb://user"]) {
    assert.ok(!blob.includes(secret), `snapshot must not leak ${secret}`);
  }
});

check("trust proxy is numeric/string passthrough (0 default)", () => {
  const r = probe({ NODE_ENV: "development", TRUST_PROXY: "2" });
  assert.strictEqual(r.parsed.snap.trustProxy, "2");
});

// --- Phase 18C-4: staging config validation (never affects production) ---
check("staging validation flags missing DB/JWT and fallback-localhost CORS", () => {
  const r = probe({ NODE_ENV: "staging" });
  assert.ok(r.parsed.stagingProblems.some((p) => p.includes("MONGODB_URI")));
  assert.ok(r.parsed.stagingProblems.some((p) => p.includes("JWT_SECRET")));
  assert.ok(r.parsed.stagingProblems.some((p) => p.includes("ALLOWED_ORIGINS is not set")));
  // The staging validator must NOT exercise the production validator on prod.
  assert.deepStrictEqual(r.parsed.problems, [], "prod validation untouched by staging env");
});

check("staging validation flags a wildcard CORS origin", () => {
  const r = probe({ NODE_ENV: "staging", MONGODB_URI: "mongodb://x", JWT_SECRET: "s", ALLOWED_ORIGINS: "*" });
  assert.ok(r.parsed.stagingProblems.some((p) => p.includes("wildcard")));
  assert.strictEqual(r.parsed.hasWildcardOrigin, true);
});

check("valid staging config produces no validation problems", () => {
  const r = probe({
    NODE_ENV: "staging",
    MONGODB_URI: "mongodb://staging",
    JWT_SECRET: "staging-secret",
    ALLOWED_ORIGINS: "https://staging.schooldomain.com",
    RESET_LINK_BASE: "https://staging.schooldomain.com",
  });
  assert.deepStrictEqual(r.parsed.stagingProblems, []);
  assert.deepStrictEqual(r.parsed.problems, [], "prod validation stays empty in staging");
});

console.log(`\nPHASE_18C4_STAGING_FOUNDATION: ${totals.pass} PASS, ${totals.fail} FAIL`);
if (totals.fail > 0) process.exit(1);