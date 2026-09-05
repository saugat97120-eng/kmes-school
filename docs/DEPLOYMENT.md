# Deployment — KMES School Website

Phase 18C-3 deployment foundation. This document describes **how** the application
is configured for each environment and **what** must be supplied at deploy time.
It intentionally avoids committing real secrets or a specific hosting brand.

CI/CD (GitHub Actions), monitoring, backups/PITR, custom-domain/HTTPS wiring, and
the staging/production services themselves are **handled in later phases**
(18C-4 → 18C-10). This phase only lays the safe configuration groundwork and the
runtime behavior those later phases rely on.

---

## 1. Environment model

The application is environment-driven and provider-neutral. Three environments
are supported and must be **fully separated**:

| Environment | Backend `NODE_ENV` | Purpose |
|---|---|---|
| Development | `development` | local coding; local MongoDB / memory tests |
| Staging | `staging` (or `production`-off) | pre-production acceptance, isolated |
| Production | `production` | live public site |

**Golden rule:** each environment has its **own** secret values. Never share
`JWT_SECRET`, `MONGODB_URI`, Cloudinary keys, Facebook tokens, AI keys, email
credentials, or the reset-link base between environments.

---

## 2. Environment variables

Source of truth for variable **names**: `backend/.env.example` and
`frontend/.env.example` (both tracked). Real `.env` files are git-ignored.

### Backend variables

| Variable | Secret? | Dev default | Staging (example) | Production (example) |
|---|---|---|---|---|
| `NODE_ENV` | No | `development` | `staging` | `production` |
| `PORT` | No | `5000` | platform-injected | platform-injected |
| `MONGODB_URI` | **Yes** | local/memory | staging URI | prod URI |
| `JWT_SECRET` | **Yes** | dev value | staging value | prod value |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | `https://staging.schooldomain.com` | `https://www.schooldomain.com` |
| `FRONTEND_URL` | No | `http://localhost:5173` | `https://staging.schooldomain.com` | `https://www.schooldomain.com` |
| `CLIENT_URL` | No | `http://localhost:5173` | staging URL | prod URL |
| `TRUST_PROXY` | No | `0` | PaaS hop count | PaaS hop count |
| `RESET_LINK_BASE` | No | `http://localhost:5173` | `https://staging.schooldomain.com` | `https://www.schooldomain.com` |
| `CLOUDINARY_CLOUD_NAME` | No* | blank | staging cloud | prod cloud |
| `CLOUDINARY_API_KEY` | **Yes** | blank | staging key | prod key |
| `CLOUDINARY_API_SECRET` | **Yes** | blank | staging secret | prod secret |
| `FACEBOOK_APP_ID` | No | blank | staging app id | prod app id |
| `FACEBOOK_APP_SECRET` | **Yes** | blank | staging secret | prod secret |
| `FACEBOOK_PAGE_ID` | No | blank | **test Page** id | real Page id |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | **Yes** | blank | test token | prod token |
| `AI_PROVIDER` | No | blank | `mock`/test | real provider |
| `AI_API_KEY` | **Yes** | blank | test/restricted | prod key |
| `AI_MODEL` | No | blank | test model | prod model |
| `DEV_ADMIN_EMAIL` | No | dev value | *(unset)* | *(unset)* |
| `DEV_ADMIN_PASSWORD` | **Yes** | dev value | *(unset)* | *(unset)* |
| `EMAIL_PROVIDER` | No | `mock` | `mock`/sandbox | `smtp` (or `mock` until SMTP is ready) |
| `SMTP_HOST` | No | blank | staging relay/sandbox | production relay |
| `SMTP_PORT` | No | `587` | `587`/`465` | `587`/`465` |
| `SMTP_SECURE` | No | `false` | `false`/`true` | `false`/`true` |
| `SMTP_USER` | **Yes** | blank | staging user | prod user |
| `SMTP_PASSWORD` | **Yes** | blank | staging pass | prod pass |
| `SMTP_PASS` | **Yes** | blank | *(back-compat alias)* | *(back-compat alias)* |
| `EMAIL_FROM` | No | blank | staging sender | prod sender |
| `EMAIL_FROM_NAME` | No | `Kaseni Model Secondary English School` | school name | school name |
| `ALLOW_ADMIN_BOOTSTRAP` | No | `false` | `false` | `false` (see §19) |
| `ADMIN_BOOTSTRAP_EMAIL` | No | `saugatb40@gmail.com` | provision email | provision email |
| `RESET_LINK_BASE` | No | `http://localhost:5173` | staging URL | prod URL |

\* `CLOUDINARY_CLOUD_NAME` is an account identifier (not a secret) but is bundled
with the key+secret as a single integration and should be kept per-environment.

### Frontend variables

| Variable | Secret? | Role | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | Frontend (build-time) | Baked into the built SPA. Never a secret. |

**Bucketing (important):**
- **Frontend-visible (public, build-time):** `VITE_API_BASE_URL` only.
- **Backend-only (server-side):** everything else — including all `*_SECRET`,
  `*_ACCESS_TOKEN`, `JWT_SECRET`, `MONGODB_URI`, `DEV_ADMIN_*`, `AI_API_KEY`,
  `CLOUDINARY_*`, `FACEBOOK_*`.

**Never** put a secret in a `VITE_*` variable — those are embedded into
browser-visible static files.

---

## 3. Handling the known Step-1 findings

- **`VITE_API_BASE_URL` is build-time.** The SPA reads it at build time and falls
  back to `http://localhost:5000`. Local development uses that default. For
  staging/production the build MUST set it explicitly and CI smoke-tests the
  built artifact so a missing value is caught. A config-less build emits an
  unmistakable `[deploy]` warning (`frontend/vite.config.js`).
- **BrowserRouter needs an SPA fallback.** The static host must rewrite any path
  that is not a real file to `index.html` (so `/admin`, `/notices/123`, etc.
  render the app). This is configured on the static host at deploy time —
  provider-specific config (e.g. Netlify `_redirects`, Vercel rewrite) is added
  in Phase 18C-4/5, not here.
- **Single-origin CORS is now a configurable allow-list.** See section 5.
- **`trust proxy` is now configurable.** See section 6.
- **`RESET_LINK_BASE` is now the live reset-link authority.** See section 7.

---

## 4. CORS allow-list

`server.js` configures CORS from `env.allowedOrigins`, which is parsed from the
comma-separated `ALLOWED_ORIGINS` variable (falling back to the legacy
`CLIENT_URL`/`FRONTEND_URL`).

- Only the **exact, explicit** frontend origins are allowed.
- A wildcard `*` is never permitted. In production, `validateProductionConfiguration`
  reports a problem if the allow-list is empty or contains `*`.
- Requests with **no** `Origin` header (curl, server-to-server, same-origin) are
  allowed through; requests with a disallowed `Origin` are served **without** the
  CORS headers (the browser blocks them).

Example production value:

```
ALLOWED_ORIGINS=https://www.schooldomain.com
# multiple origins (if ever needed), comma-separated:
# ALLOWED_ORIGINS=https://www.schooldomain.com,https://admin.schooldomain.com
```

---

## 5. Trust proxy

`server.js` sets `app.set("trust proxy", N)` **only** when `TRUST_PROXY` is a
positive integer. It defaults to `0` (off), so development and local setups are
unchanged.

- On the production/staging PaaS, Express sits behind a trusted reverse proxy/CDN.
  Set `TRUST_PROXY` to the number of trusted hops **per the host's documented
  topology**. This makes rate-limiting and client-IP / `req.secure` detection use
  the real client IP instead of the proxy's.
- Do **not** blindly set it to `true`; use the narrowest correct hop count.

---

## 6. Password-reset link base (`RESET_LINK_BASE`)

`buildResetLink()` in `backend/src/utils/resetToken.js` (moved from
`auth.routes.js` in Phase 18C) now uses `env.resetLinkBase`, which is resolved
as:

```
RESET_LINK_BASE  ||  FRONTEND_URL  ||  http://localhost:5173
```

- `RESET_LINK_BASE` is the **live authority**. Keeping it environment-specific
  guarantees staging reset emails point at the staging site and production ones
  at the production site — they can never cross-link.
- When unset it falls back to `FRONTEND_URL` for back-compatibility, so existing
  dev setups are unchanged.
- Raw reset tokens are never stored, logged, or exposed; only the SHA-256 hash is
  persisted (Phase 18B behavior preserved).

---

## 7. Production seed protection

`backend/src/seed.js` is **destructive** (it `deleteMany()`s every seeded
collection). It is guarded:

- **Hard-blocked** when `NODE_ENV === "production"` — prints a clear reason and
  exits without touching the database.
- In any *other* environment it **requires `--allow-destructive`** to run, so an
  accidental `node src/seed.js` fails safe.
- Development/test seeding remains possible:
  `node src/seed.js --allow-destructive`

It is never part of the server start command. CI and production deploy jobs must
**never** invoke the seed step.

---

## 8. Health / readiness endpoint

`GET /api/health` is DB-aware (unchanged from Phase 18B):

- `200` when the process is up and MongoDB is reachable (via a lightweight ping).
- `503` when the database is unavailable or not ready.

The response contains only safe operational fields (status, checks, uptime,
timestamp). It never exposes credentials, the connection string, tokens, or stack
traces.

---

## 9. What must NEVER be committed

- Real `.env` files (git-ignored: `.env`, `.env.*`, `**/.env*`, with only
  `*.env.example` tracked).
- `JWT_SECRET`, `MONGODB_URI`, API keys, access tokens, private keys, passwords.
- Real production connection strings.
- Any value in a `VITE_*` variable that is a secret.

The `backend/.env.example` and `frontend/.env.example` templates contain
placeholders only.

---

## 10. How configuration is supplied at deploy time

- **Development:** copy `backend/.env.example` → `backend/.env` and
  `frontend/.env.example` → `frontend/.env`; fill local values.
- **Staging / Production:** set the variables in the host's **secret/secret
  environment panel** (server-side, never committed). The frontend build receives
  its non-secret `VITE_API_BASE_URL` as a build-time variable.
- Confirm the resolvable / safe config via `GET /api/health` and by exercising
  the allowed CORS origin (see section 12).

---

## 11. Rollback preparation

- The database is the single source of truth; keep DB changes **additive** so
  older code still works during a rollback window.
- Deploy the backend **before** the frontend (or feature-flag new endpoints) so
  the SPA never calls an API route that does not yet exist.
- Keep the previous frontend build and previous backend revision deployable —
  rollback is redeploying the prior artifact/revision.
- Never roll back the database schema behind a currently-live newer schema
  without an explicit migration plan.

---

## 12. Verifying configuration

1. `GET /api/health` returns `200` (DB connected) or `503` (DB unavailable) —
   never leaks secrets.
2. An allowed `Origin` gets an `Access-Control-Allow-Origin` header; a random
   origin does **not**.
3. `NODE_ENV=production node --check src/config/env.js` prints no CORS/DB/JWT
   problems when the minimum production config is present.
4. The built SPA points at the expected API (baked `VITE_API_BASE_URL`) — no
   silent `http://localhost:5000` fallback in staging/production.
5. `node src/seed.js` exits non-destructively in production (blocked) and
   requires `--allow-destructive` elsewhere.
6. Reset links use the environment's `RESET_LINK_BASE`.
7. Upload and attachment endpoints reject spoofed image content with a `400`
   (magic-byte check) and never crash when Cloudinary env is absent.
8. CMS write endpoints (site-settings / page-content) return `400` with an
   `errors[]` array for invalid payloads and strip unknown fields.
9. `EMAIL_PROVIDER=smtp` without `SMTP_HOST` still returns the generic
   forgot-password response (no account enumeration, no token leak).

---

## 13. Cross-cutting safety (Cloudinary / Facebook / AI / Email)

This phase ships **configuration separation only** — no outbound service calls.

- **Cloudinary:** each environment uses a distinct account/cloud and its own
  API key/secret. Staging media can never target production resources.
- **Facebook:** production uses the real Page; staging uses a **test Page** (or
  the integration disabled/mock). Publishing is always an explicit human action —
  there is no automated publish path.
- **AI:** production uses a server-side key; staging uses `mock`/a restricted key;
  development uses `mock`. AI output is suggestion-only and human-applied; the
  30s timeout and safe error codes are preserved.
- **Email:** `EMAIL_PROVIDER=mock` (in-memory) or `none` (no-op) are the safe
  defaults. `EMAIL_PROVIDER=smtp` (Phase 18C-4) enables real delivery via
  Nodemailer and requires `SMTP_HOST` (+ `SMTP_PORT`, and both `SMTP_USER` and
  `SMTP_PASS` together, or neither for an auth-less relay) plus an optional
  `EMAIL_FROM`/`EMAIL_FROM_NAME`. If `SMTP_HOST` is missing at boot the server
  logs a configuration warning; the forgot-password flow still returns its
  **generic** response so account existence and tokens are never revealed.
  `RESET_LINK_BASE` keeps reset delivery correctly scoped per environment.

None of these connect to any external provider from development/mock
configurations. Only a fully configured integration (or `EMAIL_PROVIDER=smtp`
with SMTP env) makes outbound calls.

---

## 14. Staging environment (Phase 18C-4)

Provider decisions finalized for the staging environment (Phase 18C-4):

| Layer | Provider | Staging |
|---|---|---|
| Frontend host | **Vercel** | Preview / staging deployment |
| Backend host | **Render** | `kmes-staging-api` Web Service |
| Database | **MongoDB Atlas** | separate staging cluster/database |
| Media | **Cloudinary** | separate staging cloud/account |
| Facebook | — | test Page / mock / disabled |
| AI | — | `mock` / restricted |
| Email | — | `mock` / sandbox |

The staging domain structure uses the approved subdomains:

- Frontend: `https://staging.schooldomain.com`
- API: `https://staging-api.schooldomain.com`

> If the school domain DNS is not yet configured, the providers' temporary
> staging/preview URLs are used instead. Production DNS is never modified here.

### 14.1 SPA routing (Vercel)

`frontend/vercel.json` declares the Vercel rewrite so **every** path returns
`index.html` (BrowserRouter SPA fallback):

```json
{
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

A direct request to `/admin`, `/notices/123`, `/events/...`, `/gallery`,
`/achievements`, or `/admissions` therefore renders the app instead of a 404.

### 14.2 Backend (Render)

`backend/render.yaml` is a Render Blueprint declaring the staging Web Service:
root directory `backend`, Node runtime, `npm start`, health check at
`/api/health`, and the full environment-variable **names** (`NODE_ENV=staging`,
`PORT`, CORS/URLs, `TRUST_PROXY=1`, `EMAIL_PROVIDER=mock`, `AI_PROVIDER=mock`). Phase 18C-4 added
the `SMTP_*` and `EMAIL_FROM*` secret **names** (`sync: false`) so the staging
service can be switched to real SMTP delivery without changing the blueprint.

Secrets are declared with `sync: false` and must be entered by an operator in
the Render dashboard (Environment tab). Render sits behind a trusted proxy, so
`TRUST_PROXY=1` lets rate limiting see the real client IP.

### 14.3 Staging environment variable names (values entered in dashboards)

Backend (server-side, in the Render **staging** service): `NODE_ENV`, `PORT`,
`MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `CLIENT_URL`,
`TRUST_PROXY`, `RESET_LINK_BASE`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FACEBOOK_APP_ID`,
`FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`,
`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `EMAIL_PROVIDER`, `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` (or back-compat
`SMTP_PASS`), `EMAIL_FROM`, `EMAIL_FROM_NAME`, `ALLOW_ADMIN_BOOTSTRAP`,
`ADMIN_BOOTSTRAP_EMAIL`.

Frontend (build-time, in the Vercel **staging** project's Environment
Variables for the staging environment/preset): `VITE_API_BASE_URL` set to the
staging API URL so the built SPA never falls back to `http://localhost:5000`.

### 14.4 Staging CORS, health, reset links, seed

- `ALLOWED_ORIGINS` must contain **only** the staging frontend origin.
  `production frontend → staging API` and `random origin → staging API` are
  blocked (no `Access-Control-Allow-Origin` header). No wildcard is ever used.
- `GET /api/health` returns `200` (staging DB reachable) or `503` (DB
  unavailable); the response never leaks secrets.
- `RESET_LINK_BASE=https://staging.schooldomain.com` keeps every staging reset
  email pointed at the staging site, never production.
- Seed on staging uses the guarded mechanism only — `NODE_ENV=staging` (never
  production) plus explicit `--allow-destructive`, pointed at the **staging**
  DB. It is never run automatically.

### 14.5 Staging data

Staging uses a **small, controlled** dataset with the guarded seeding mechanism
or hand-curated records. Real student/personal/private school data is never
imported. The staging MongoDB cluster and the staging Cloudinary environment are
purpose-built and isolated from production.

### 14.6 Staging admin

`ensureDevelopmentAdminUser()` is hard-gated to `NODE_ENV=development` and never
runs in staging/production, and the seed script inserts content only (it does
not create an admin). The **approved** admin bootstrap is the Phase 20 register
route: `/api/auth/register` creates the first (admin) account **only while**
`users` is empty **AND** `ALLOW_ADMIN_BOOTSTRAP=true` is set **AND** the
submitted (case-insensitive) email equals `ADMIN_BOOTSTRAP_EMAIL`. Use a
**unique** environment-specific email and password (never the dev or production
value), provision with the flag temporarily enabled, then set the flag back to
`false`. After the first account exists, additional users are created from the
admin panel. Verify by logging in on the staging site. Credentials are never
printed, committed, reused from production, or copied from another environment's
user table.

### 14.7 Current staging frontend origin + the site-settings CORS fix

The **actual** staging frontend served today is the Vercel deployment at:

```
https://kmes-school-lzs3g1qdw-saugatb40-8093.vercel.app
```

The backend's CORS allow-list is the **only** thing that can produce a
browser-side `Access-Control-Allow-Origin` error. The CORS middleware is global,
applies to every route (site-settings included), delivers correct headers on
GET/OPTIONS, and keeps headers on error responses (404/405) — verified against
the live API. If the browser reports a CORS error on `GET /api/site-settings`,
the Render backend's `ALLOWED_ORIGINS` simply does **not** contain the exact
`Origin` the frontend is being served from.

Required Render dashboard action (operator):

1. In the Render service Environment tab set
   `ALLOWED_ORIGINS=https://kmes-school-lzs3g1qdw-saugatb40-8093.vercel.app,https://kmes-school.vercel.app`
   (keep every Vercel alias you legitimately serve; never add `*`).
2. Re-deploy / restart the service.
3. Verify from the browser console that `GET /api/site-settings` now carries
   `Access-Control-Allow-Origin: <your exact origin>`.

`backend/render.yaml` and `backend/.env.example` already declare these staging
origins so any blueprint-provisioned service gets them automatically.

---

## 15. Media upload security + Cloudinary readiness (Phase 18C-3)

The naive upload gate relied on the client-supplied `mimetype`. Uploads are now
verified by **file content** so spoofed payloads (an executable renamed to
`.jpg`, a hostile SVG/HTML/JS/PHP sent with an `image/*` mimetype, unknown
binaries) are rejected.

- `backend/src/utils/fileValidation.js` recognizes only the **magic bytes** of
  JPEG, PNG, WebP, and GIF — nothing else matches, so nothing else is uploaded.
- `POST /api/upload` validates the buffered content **before** any Cloudinary
  call; a mismatch between the declared mimetype and the actual bytes returns
  `400`. When Cloudinary env is absent it returns a safe `400` (it never
  crashes, and never attempts a network call).
- The same content check also backs image **attachments**
  (`backend/src/middleware/attachmentUpload.js`); documents keep the extension
  + allow-list enforcement.
- `CLOUDINARY_FOLDERS` (`backend/src/config/cloudinary.js`) pins the production
  namespace: `kmes-school` (media), `kmes-school/attachments`, and
  `kmes-school/facebook`. A production cloud stays isolated from other projects.
- Media deletes pass `resource_type: "image"` explicitly and degrade safely
  when Cloudinary is unconfigured.

Each environment (dev/staging/production) uses its **own** Cloudinary account
and `CLOUDINARY_*` credentials. Never share a cloud between environments.

---

## 16. SMTP email delivery (Phase 18C-4 / Phase 20)

`EMAIL_PROVIDER=smtp` switches the backend to a Nodemailer `SmtpEmailAdapter`
(`backend/src/integrations/email/smtpEmailAdapter.js`). Mock and no-op adapters
are retained and remain the safe defaults.

- Configuration is **environment-only**: `SMTP_HOST`, `SMTP_PORT` (default 587;
  `SMTP_SECURE=true` or port 465 selects implicit TLS, everything else STARTTLS),
  `SMTP_USER`, `SMTP_PASSWORD` (with `SMTP_PASS` kept as a back-compat alias),
  `EMAIL_FROM` (falls back to `SMTP_USER`), `EMAIL_FROM_NAME` (default
  `Kaseni Model Secondary English School`).
- Phase 20: supported providers are `mock | smtp | none`. **Any other value
  fails startup** (no silent fallback, and SMTP can never silently degrade to
  mock in production). When `EMAIL_PROVIDER=smtp`, `SMTP_HOST` + `SMTP_USER` +
  `SMTP_PASSWORD` are all **required at boot**
  (`assertEmailProviderConfiguration()` in `server.js`), so a half-configured
  SMTP relay cannot boot into a "never delivers" state.
- `assertConfigured()` throws cleanly and **before** any network I/O when SMTP
  env is missing/incomplete; transport errors propagate from Nodemailer.
- The auth route wraps delivery in a catch that logs only a **safe diagnostic**
  and still returns the generic reset response — so a broken SMTP relay never
  reveals account existence or the token. Raw tokens are never logged, never
  stored (only the SHA-256 hash persists), and only travel inside the delivered
  reset URL built from `RESET_LINK_BASE`.
- Phase 20 adds a best-effort **security notification** email after a successful
  password reset (generic content only; failures never fail the reset itself).
- Boot-time validation (`validateProductionConfiguration`) emits a category-only
  warning when `EMAIL_PROVIDER=smtp` but required SMTP vars are unset, and when
  `ALLOW_ADMIN_BOOTSTRAP=true` is left on in production.

On Render, add the `SMTP_*`/`EMAIL_FROM*` values in the service Environment tab
and set `EMAIL_PROVIDER=smtp`. Verify with a single real forgot-password email.

---

## 16a. First-admin bootstrap (Phase 20)

Public registration creates a user **only** when all of these hold, otherwise an
**identical generic `403`** ("Registration is temporarily unavailable.") is
returned so attackers cannot distinguish flag-off / wrong-email / already-done:

1. `ALLOW_ADMIN_BOOTSTRAP` is the **literal** string `true` (`"1"`, `"yes"`,
   `"TRUE"` all count as **off**).
2. The database has **zero** users.
3. The submitted email, normalized to lowercase, equals
   `ADMIN_BOOTSTRAP_EMAIL`.
4. The payload passes express-validator (`name`, `email`, `password ≥ 6`).

Implementation notes:

- The first user is **always** forced to role `admin` (client-supplied roles are
  ignored).
- Concurrency is bounded by a **unique-indexed lock** collection
  (`admin_bootstrap_locks`). Exactly one simultaneous request can win; every
  other concurrent request gets the same generic `403`. On success the lock is
  kept permanently (the open window is closed forever); on failure it is
  released best-effort so an empty-DB retry still works.
- After the first account exists, registration is closed **for every email —
  including the bootstrap email** — even if the flag stays `true`.
- Provide the real admin password only at provision time in the Render/DB
  operator session. Never commit, print, or log it.

Provisioning sequence (operator):

1. Deploy the Phase 20 backend. Set `ALLOW_ADMIN_BOOTSTRAP=false`
   (default) and confirm `POST /api/auth/register` returns the generic `403`.
2. (If this is the first-ever deployment) ensure the `users` collection is empty.
3. Temporarily set `ALLOW_ADMIN_BOOTSTRAP=true` (Render dashboard) and redeploy.
4. `POST /api/auth/register` with `ADMIN_BOOTSTRAP_EMAIL` + a strong,
   operator-entered password → `201` + admin token. Verify login works.
5. Set `ALLOW_ADMIN_BOOTSTRAP=false` and redeploy. Re-verify register returns
   `403` and the admin login still works.

---

## 17. CMS payload validation (Phase 18C)

`backend/src/utils/cmsValidation.js` makes the accepted field set explicit for
the two public-CMS write routes:

- **Site settings** and **page content** have fixed allow-lists. Unknown fields —
  including `_id`, timestamps, and anything the admin form does not define —
  are **stripped and never persisted**.
- Known fields are type-checked; URL fields accept http(s) only
  (`javascript:`/`data:` are rejected); the settings `email` is validated;
  `published` must be boolean.
- `POST /api/page-content` requires a `slug` (trimmed + lowercased) and rejects
  duplicates with `409` (including on `PUT` when a different page already owns
  the slug).
- Invalid payloads return `400` with `{ errors: [...] }`.

PageContentManager and SiteSettingsManager already send only allow-listed
fields, so the frontend is unaffected; the new layer is defense-in-depth against
future client changes or direct API calls.

---

## 18. Automated tests

Run from `backend/`:

```
npm test                # unit + integration (mongodb-memory-server, no network)
npm run test:unit       # offline unit tests (validation, tokens, email selection)
npm run test:integration# boot full API against a disposable MongoDB
npm run test:foundation # config/seed/CORS validation (existing)
npm run test:rbac       # auth/permission smoke (existing)
npm run test:phase20    # Phase 20: bootstrap+SMTP unit, registration-closure
                        # integration, and concurrency-bounded bootstrap harness
```

The integration harness (`backend/tests/phase-18c.integration.mjs`) renames
`backend/.env` aside, boots the real Express app against `mongodb-memory-server`
on a disposable port, and exercises upload magic-byte rejection, the
Cloudinary-unconfigured path, media delete, CMS allow-listing, the full password
reset lifecycle, and SMTP-failure masking. It never contacts a real provider.

---