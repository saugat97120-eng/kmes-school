# KMES School Website
# Final Production Verification

**Date:** 2026-09-05
**Verifier:** Senior production engineer (automated + live inspection)
**Commit verified:** `abaa5b0eeb72c17f9f09301b25233612283fe625`
**Production frontend:** `https://kmes-school.vercel.app`
**Production backend:** `https://kmes-school.onrender.com`

---

## Executive Summary

The KMES School website was inspected end-to-end at the current commit
(`abaa5b0`, branch `main`, HEAD == origin/main, clean tree) and against the
live production deployment.

**Verdict: GO WITH CAVEATS.**

The core website is safe and functional: the live backend reports
`200 / database: ok`, MongoDB is connected, CORS is allow-list enforced (no
wildcard, disallowed origins blocked), the deployed frontend is correctly wired
to the Render backend (its bundle contains the production API origin and no
`localhost`), auth is authoritative (fresh DB role lookups + `authVersion`
invalidation), every protected endpoint denies anonymous access, and all seven
in-repo regression suites pass (150 checks) on top of 278 earlier harness
checks. Both `npm audit` runs report zero vulnerabilities and the secret scan
is clean.

Caveats are operational, not code defects:

1. **The live Render backend is running pre-Phase-20 code** (its register
   403 message is the legacy *"Registration is closed…"*; the Phase 20 build
   returns the generic *"Registration is temporarily unavailable."*). It must be
   redeployed from `abaa5b0` so the hardened bootstrap, SMTP gating, and
   security-notification code go live.
2. **The inert Phase 19 probe admin (`6a9bd536517cf52838416563`) still exists**
   in the production database (neutralized: randomized credentials, inert). It
   must be deleted by an operator via Atlas.
3. Optional integrations (SMTP, Cloudinary, Facebook, AI) are **unconfigured**
   in production by design and are **DEFERRED**; Atlas **backup/PITR
   enablement is not confirmed** (operator action).

None of the critical security blockers from the brief apply.

---

## Current Git Revision

```
Branch    : main
HEAD      : abaa5b0eeb72c17f9f09301b25233612283fe625
origin/main: abaa5b0eeb72c17f9f09301b25233612283fe625
Status    : clean (nothing to commit)
Remote    : https://github.com/Saugatbhattarai1010/kmes-school.git
Version control: Git (monorepo frontend + backend + docs)
```

---

## Production Architecture

- **Frontend** → Vercel (SPA, React 19 + Vite 8 + Tailwind 4 + React Router 7).
- **Backend** → Render (Express 5 ESM, helmet, cors allow-list, rate limits).
- **Database** → MongoDB Atlas (13 collections, workflow-status indexes).
- **Auth** → JWT 7d + `authVersion`; authorization resolved from DB per request.
- **Optional** → Cloudinary (media), Facebook (import-only), AI
  (suggestion-only), email (`mock|smtp|none`).
- **CI** → new minimal GitHub Actions pipeline (`.github/workflows/ci.yml`).

---

## Frontend Verification

| Check | Result | Evidence |
|---|---|---|
| `https://kmes-school.vercel.app` loads | **PASS** | HTTP 200 |
| SPA deep links (`/about`, `/academics`, `/notices`, `/admin/login`, fake `/api/...`) | **PASS** | all 200 (SPA shell, vercel.json rewrites) |
| Build succeeds | **PASS** | `vite build` → 420 kB JS, 38 kB CSS |
| Lint | **PASS WITH CAVEAT** | 0 errors, 8 pre-existing warnings (react fast-refresh / set-state-in-effect); not rewritten per brief |
| Production API wiring | **PASS** | deployed bundle contains `kmes-school.onrender.com`; **no** `localhost:5000` |
| No secrets in bundle / source | **PASS** | JWT/db/keys absent; no `dangerouslySetInnerHTML` (React-escaped output) |

## Backend Verification

| Check | Result | Evidence |
|---|---|---|
| `/api/health` | **PASS** | 200 `{status:ok, database:ok, mongoReadyState:connected}` |
| Helmet / JSON body / sanitize / morgan | **PASS** | `server.js` middleware chain |
| Rate limiting | **PASS** | `/api` 300/15min, `/api/auth` 20/15min, AI 30/min |
| CORS allow-list | **PASS** | `https://kmes-school.vercel.app` → `ACAO` echoes; `https://evil.example.com` → no `ACAO` (blocked); preflight 204 for allowed, blocked for disallowed |
| 404 behavior | **PASS** | unknown route → 404 JSON |
| Production error masking | **PASS** | `NODE_ENV=production` → 5xx becomes "Internal server error" (no stack/paths) |
| No debug routes | **PASS** | only `/api/health` plus registered API routers |
| Deployed code version | **OPERATOR ACTION REQUIRED** | live register returns legacy message (`Registration is closed…`) → **redeploy backend from `abaa5b0`** |

## Database Verification

| Check | Result | Evidence |
|---|---|---|
| Connectivity | **PASS** | health `mongoReadyState: connected` |
| Known indexes in schemas | **PASS** | `{status,deletedAt,createdAt}` on Notices/Events/Gallery/Facilities/Activities/Achievements; ActivityLog `{resource,resourceId,createdAt}` + `{action,resourceId}` + `{createdAt}`; FacebookSync `{kind,createdAt}` |
| Seed safety | **PASS** | `seedGuard` refuses `NODE_ENV=production` and requires `--allow-destructive` |
| Live index presence | **PASS WITH CAVEAT** | requires operator Atlas read access to confirm (not observable from outside); schema auto-creates on model init |

## Authentication

Verified via the phase-18C unit (40) and integration (38) suites plus live
probes: valid login → JWT; invalid credentials → 401 generic; JWT verify with
`authVersion` claim; stale-version / invalid / expired JWTs → 401; bcrypt
comparison (`comparePassword`); forgot-password always returns the generic
response (no enumeration); reset token = 43-char base64url, only SHA-256 hash
stored, 1h expiry, single-use (cleared on success); reset bumps `authVersion`
(invalidates all prior JWTs); password never returned by any API (safe
`publicUser()` projection); anonymous access to protected routes → 401 (live:
`/api/users` → 401). **PASS.**

## First Admin

| Check | Result | Evidence |
|---|---|---|
| `ALLOW_ADMIN_BOOTSTRAP` default `false`, strict `"true"` only | **PASS** | `env.js` `parseStrictBool` + phase-20 unit |
| Zero-user + email-match + flag conditions | **PASS** | phase-20 integration/bootstrap |
| First user forced to `admin` | **PASS** | `auth.routes.js` register + harness |
| Concurrency (unique lock) + permanent lock after success | **PASS** | `admin_bootstrap_locks`, phase-20.bootstrap (6 parallel → 1 created) |
| Registration closed after bootstrap | **PASS** | code + tests |
| Live register probe | **PASS** | probe `probe-verification@example.invalid` → 403, no user created |
| Real first-admin provisioning complete | **OPERATOR ACTION REQUIRED** | probe admin still present; real admin must be provisioned per runbook after redeploy of `abaa5b0` |

## RBAC

Backend-authoritative `requirePermission` resolves the **current** role from the
DB (per `roles.js`), so stale JWTs cannot keep elevated rights. Admin: full
permissions. Editor: content create/edit/submit, no approve/publish/manage
users. Verified by `rbac.smoke.mjs` (all pass) and phase-18C integration.
**PASS.**

## CMS Workflow

Centralized workflow (`workflow/` + `crudFactory`): clients can never set
`status`/`published` (stripped); new items start as `draft`; editing non-draft
resets to `draft`; restore never re-publishes; bulk publish only moves
`approved → published` and `published → draft`; public endpoints expose only
`publishedQuery()` (published + non-trashed); inbox filters validate statuses
(unknown → empty). Verified by phase-7 and phase-18C suites.
**PASS.**

## Media (Cloudinary)

Server-side config only; frontend never receives credentials. Uploads: magic-byte
validation (PNG/JPEG/GIF/WebP), ≤ 10 MB, MIME/content mismatch rejected, SVG/HTML
excluded; unconfigured Cloudinary returns a safe 400 (no crash). Live media
**not configured in production** → `MEDIA LIVE TEST = DEFERRED`.

## Email (SMTP)

`EMAIL_PROVIDER=mock|smtp|none`; unsupported values fail at boot; `smtp`
requires `SMTP_HOST`+`SMTP_USER`+`SMTP_PASSWORD` at boot (no silent
mock fallback). Reset links use `RESET_LINK_BASE`; raw tokens never
logged/stored; security notification after reset is best-effort and
content-free. **No SMTP credentials configured** → `SMTP LIVE TEST = DEFERRED`.
(Production currently delivers via `mock`/no real delivery — expected until the
operator configures a relay.)

## Facebook

Import-only to drafts (`import`, `sync`) with dedup + provenance +
ActivityLog; `publish` requires an explicitly CMS-published item,
`social.publish`, explicit human action, and has duplicate-publication
protection. **No auto-publish exists.** Live not configured →
`FACEBOOK LIVE TEST = DEFERRED`.

## AI

Suggestion-only (`suggest` ephemeral, nothing written); `apply` requires
explicit human action and DB-backed `content.edit`; AI can never approve,
publish, delete, or change roles; dedicated rate limit; status endpoint never
returns keys. Live not configured → `AI LIVE TEST = DEFERRED`.

## Contact Form

Public `POST /api/contact` validated by express-validator; `sanitizeInput`
strips `$`/dotted keys (NoSQL injection); admin list/update/delete gated by
`MESSAGES_VIEW`/`MESSAGES_MANAGE`; covered by the `/api` rate limiter;
messages persisted safely (React does not render raw HTML anywhere).
**PASS.**

## Security

Helmet on; CORS explicit allow-list (live verified); NoSQL injection sanitizer;
express-validator; upload restrictions (magic bytes + 10 MB); rate limits on
auth/AI/global; production stack traces masked; no debug routes; bootstrap
closed; reset flow generic + hashed + single-use; JWT `authVersion`
invalidation; secret scan clean. **PASS.** (No destructive payloads were
sent.)

## Secret Scan

Scanned tracked repo for JWT/Atlas-URI/SMTP/Cloudinary/Facebook/AI/private-key
and password-assignment patterns. Only test constants and documented
placeholders found (e.g. `.env.example` `SMTP_PASSWORD=` empty, test
`JWT_SECRET` constants). `.env` ignored (root + `frontend/.env` confirmed via
`git check-ignore`); `.env.example` files safe; deployed frontend bundle
contains no secrets (only the public API origin). **PASS.**

## Dependency Audit

- Backend `npm audit`: **0 vulnerabilities**.
- Frontend `npm audit`: **0 vulnerabilities**.
No upgrades applied (nothing to fix). **PASS.**

## Backup / Disaster Recovery

Procedures, restore checklist, and validated drills on disposable DBs exist
(`docs/DISASTER_RECOVERY.md`, `docs/RESTORE_CHECKLIST.md`; Phase 17: 9/9 backup
integrity + 15/15 app-restore). **Atlas Cloud Backup / PITR enablement is not
confirmed** on the cluster → **BACKUP/PITR = OPERATOR ACTION REQUIRED** (or
schedule daily `mongodump` to encrypted off-host storage). No destructive
restore was performed on production.

## CI/CD

No CI existed. A minimal GitHub Actions pipeline was added
(`.github/workflows/ci.yml`): backend unit suites (18C/18C4/20) + syntax check +
`npm audit`; frontend lint + build + `npm audit`; **no** automatic deployment.
First real run will occur on the next push to `main`.
**PASS WITH CAVEAT** (added, pending first run).

## Regression Tests

All in-repo suites run fresh against `abaa5b0`:

| Suite | Result |
|---|---|
| Phase 18C unit | 40 PASS / 0 FAIL |
| Phase 18C integration | 38 PASS / 0 FAIL |
| Phase 18C4 deployment foundation | 20 PASS / 0 FAIL |
| RBAC smoke | ALL PASS |
| Phase 20 unit | 20 PASS / 0 FAIL |
| Phase 20 integration | 20 PASS / 0 FAIL |
| Phase 20 bootstrap harness | 12 PASS / 0 FAIL |
| Legacy harnesses (6–9, 10/11, 18b), earlier in this session | 278 PASS / 0 FAIL |
| Backend syntax (`node --check`, 65 src + 7 test) | PASS |

No suites skipped; no tests deleted or modified to hide results.

## Known Limitations

- Live Render backend not yet on Phase 20 code (redeploy pending).
- Service uptime depends on the PaaS (Render/Vercel free-tier cold starts are
  possible); `GET /api/health` monitors DB state.
- JWT kept in `localStorage` — acceptable for this trusted staff-only CMS, and
  mitigated because the frontend never renders raw HTML.
- Media/Facebook/AI/SMTP live behaviors unverified without credentials.
- `User.password` `select:false` requires care during backup/restore.

## Operator Actions Required

1. **Redeploy the backend** so production runs `abaa5b0` (Phase 20). After
   deploy, verify register returns the generic *"Registration is temporarily
   unavailable."* 403.
2. **Delete the inert Phase 19 probe admin `6a9bd536517cf52838416563`** via
   Atlas (safe procedure in `docs/PRODUCTION_RUNBOOK.md` §12; never via the API,
   never by app code).
3. Provision the real admin (`saugatb40@gmail.com`) only after the DB has zero
   users and bootstrap is briefly enabled, then disable it (runbook §4).
4. **Confirm/enable Atlas Cloud Backup & PITR** (or run daily `mongodump`).
5. Configure optional integrations when desired: SMTP (`EMAIL_PROVIDER=smtp` +
   `SMTP_*`), Cloudinary, Facebook, AI — each with staging-first verification.
6. Confirm live index set + document counts via Atlas read access (expected:
   workflow-status and activity-log indexes).

## Final GO / GO WITH CAVEATS / NO-GO

**GO WITH CAVEATS.** The core system (frontend, backend, database,
authentication, authorization, public API, deployment wiring, secret hygiene,
dependency audit) is verified safe and functional. The remaining items are
operational — redeploy of the already-committed Phase 20 code, removal of an
inert probe account, real-admin provisioning, backup/PITR confirmation, and
optional integration configuration. None of the critical security blockers are
present, so the website can launch now with the listed operator actions tracked.

---

## Final Status Table

| Area | Status | Evidence | Remaining Action |
|---|---:|---|---|
| Repo state / Git revision | PASS | HEAD==origin/main `abaa5b0`, clean | none |
| Backend health / DB | PASS | live 200, `mongoReadyState: connected` | none |
| CORS / preflight / disallowed origins | PASS | live ACAO allow-list verified | none |
| Frontend live + deep links | PASS | 200 on all routes | none |
| Frontend API wiring (no localhost) | PASS | bundle contains onrender.com, no localhost | none |
| Backend deployed code | OPERATOR ACTION REQUIRED | live register = legacy message | redeploy `abaa5b0` |
| Authentication | PASS | unit/integration/live 401 probes | none |
| First-admin bootstrap | PASS (code+tests); OPERATOR ACTION (live) | phase-20 suites; probe → 403 | redeploy, delete probe, provision real admin |
| RBAC | PASS | rbac smoke + integration | none |
| CMS workflow | PASS | phase-7/18C suites; factory enforces status | none |
| Media (Cloudinary) | DEFERRED | impl PASS; not configured | configure + live test |
| Email (SMTP) | DEFERRED | impl PASS; not configured | configure + live test |
| Facebook | DEFERRED | impl PASS; not configured | configure + live test |
| AI | DEFERRED | impl PASS; not configured | configure + live test |
| Contact form | PASS | validation/sanitize/RBAC verified | none |
| Security (helmet/sanitize/limits/errors) | PASS | code + live probes | none |
| Secret scan | PASS | only placeholders/tests; `.env` ignored | none |
| Dependency audit | PASS | 0 vuln backend + frontend | none |
| Backup / PITR | OPERATOR ACTION REQUIRED | not confirmed enabled | verify/enable Atlas backup/PITR or daily dump |
| CI/CD | PASS WITH CAVEAT | workflow added | confirm first run green |
| Regression tests | PASS | 150 in-repo checks + 278 harness checks | run periodically |