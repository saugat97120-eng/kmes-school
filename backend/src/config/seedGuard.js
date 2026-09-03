// Phase 18C-3 — Production seed protection.
//
// seed.js is DESTRUCTIVE: it deleteMany()'s every seeded collection before
// inserting fixture data. Running it against a real production database would
// wipe live content. It must NEVER run automatically in production.
//
// Extracted as a pure, testable function so the guard can be unit-tested without
// connecting to any database. Only the flag/exit semantics live here; seed.js
// calls this before connecting so a blocked run never touches the database.

export function assertSeedAllowed(argv = process.argv) {
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    console.error(
      "Blocked: refusing to seed the database because NODE_ENV is 'production'. " +
        "This script permanently deletes and repopulates collections and must " +
        "never be run against a production database. Copy production data, seed " +
        "a disposable database, or operate on a staging/development environment instead."
    );
    return { allowed: false, reason: "production" };
  }

  if (!argv.includes("--allow-destructive")) {
    console.error(
      `Blocked: refusing to seed because this script is destructive (it deletes ` +
        `all seeded collections before inserting) and is running with NODE_ENV='${nodeEnv}'. ` +
        `To acknowledge this and seed a non-production database, re-run with the flag: ` +
        `node src/seed.js --allow-destructive`
    );
    return { allowed: false, reason: "flag-required" };
  }

  return { allowed: true, reason: "ok" };
}