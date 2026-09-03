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
| `EMAIL_PROVIDER` | No | `mock` | `mock`/sandbox | transactional API |
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

`buildResetLink()` in `backend/src/routes/auth.routes.js` now uses
`env.resetLinkBase`, which is resolved as:

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
- **Email:** the mock/no-op adapter is the production default until a real
  provider is selected (later). `RESET_LINK_BASE` keeps reset delivery correctly
  scoped per environment.

None of these connect to any external provider during this phase.

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
`PORT`, CORS/URLs, `TRUST_PROXY=1`, `EMAIL_PROVIDER=mock`, `AI_PROVIDER=mock`).

Secrets are declared with `sync: false` and must be entered by an operator in
the Render dashboard (Environment tab). Render sits behind a trusted proxy, so
`TRUST_PROXY=1` lets rate limiting see the real client IP.

### 14.3 Staging environment variable names (values entered in dashboards)

Backend (server-side, in the Render **staging** service): `NODE_ENV`, `PORT`,
`MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `CLIENT_URL`,
`TRUST_PROXY`, `RESET_LINK_BASE`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FACEBOOK_APP_ID`,
`FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`,
`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `EMAIL_PROVIDER`.

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
not create an admin). The **approved** staging admin bootstrap is the existing
first-admin register route: `/api/auth/register` is open **only while the
`users` collection is empty**. On a freshly-created staging database the first
account created via that route is the staging admin. Use a **unique**
staging-only email and password (never the dev or production value). After the
first account exists, additional users are created from the admin panel.
Verify by logging in on the staging site. Credentials are never printed,
committed, reused from production, or copied from another environment's user
table.