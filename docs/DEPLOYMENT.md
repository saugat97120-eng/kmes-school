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