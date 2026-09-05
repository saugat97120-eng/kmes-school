# KMES School Website — Production Runbook

Operational reference for the Kaseni Model Secondary English School website.
Companion to `docs/FINAL_PRODUCTION_VERIFICATION.md` (verification) and
`docs/DEPLOYMENT.md` (full deployment guide). No credentials are stored here.

---

## 1. Architecture

- **Frontend:** React + Vite + Tailwind + React Router → **Vercel**
  (`https://kmes-school.vercel.app`).
- **Backend:** Node.js + Express → **Render**
  (`https://kmes-school.onrender.com`). ESM, single process, `npm start`.
- **Database:** MongoDB Atlas (cluster `cluster0.ndtzgxk.mongodb.net`), 13
  collections (Users, SiteSettings, PageContent, Notices, Events, GalleryImages,
  Achievements, Facilities, Activities, Media, ContactMessages, ActivityLogs,
  FacebookSyncs).
- **Auth:** JWT (7d) + `authVersion` invalidation; roles resolved from the DB on
  every permission check (not the JWT).
- **Optional integrations (all gated + mocked by default):** Cloudinary (media),
  Facebook (import-only), AI (suggestion-only), email (`mock`/`smtp`/`none`).

---

## 2. Deployment

### Backend → Render
1. Push to `main`. Render auto-deploys via connected repo (`autoDeploy: true` in
   `backend/render.yaml`, service `kmes-staging-api`).
2. Set environment variables in the Render service's Environment tab (see
   `docs/DEPLOYMENT.md` §2 + §6). Secrets (`MONGODB_URI`, `JWT_SECRET`,
   `SMTP_PASSWORD`, Cloudinary/Facebook/AI keys) are entered only in the secure
   env store.
3. Verify: `GET /api/health` → `200` with `database: ok`.

### Frontend → Vercel
- Build-time env: **`VITE_API_BASE_URL`** must be the deployed backend URL. It is
  baked into the bundle at build time. The current production build uses
  `https://kmes-school.onrender.com`. If unset, the SPA falls back to
  `http://localhost:5000` (dev warning only) — do not release a build without it.
- `vercel.json` rewrites SPA routes to `index.html` (deep links work on refresh).

### CI
- `.github/workflows/ci.yml` runs on push/PR to `main`: backend unit suites +
  syntax check + `npm audit`, and frontend lint/build/audit.
- Mongod-backed integration suites (`npm test`, `test:phase20`, `test:rbac`,
  `test:foundation`) run locally on demand.

---

## 3. Environment Variables

Backend (see `backend/.env.example` for the full list):

| Variable | Required (prod) | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Render sets `10000` |
| `MONGODB_URI` | Yes | Atlas URI (secret) |
| `JWT_SECRET` | Yes | long random (secret) |
| `ALLOWED_ORIGINS` | Yes | comma-separated frontend origins |
| `FRONTEND_URL` | No | frontend origin |
| `RESET_LINK_BASE` | Yes | must be the frontend origin for prod |
| `TRUST_PROXY` | Yes | `1` on Render (rate-limit client IP) |
| `ALLOW_ADMIN_BOOTSTRAP` | No | literal `"true"` only; keep `false` |
| `ADMIN_BOOTSTRAP_EMAIL` | No | first-admin email (`saugatb40@gmail.com`) |
| `EMAIL_PROVIDER` | No | `mock` (default) / `smtp` / `none` |
| `SMTP_HOST`,`SMTP_PORT`,`SMTP_SECURE`,`SMTP_USER`,`SMTP_PASSWORD`,`EMAIL_FROM`,`EMAIL_FROM_NAME` | only for smtp | HOST+USER+PASSWORD all required when `smtp` |
| `CLOUDINARY_*`, `FACEBOOK_*`, `AI_*` | No | optional; safe per-request 400 when unset |

Frontend: only `VITE_API_BASE_URL` (public, non-secret). Never put secrets in
`VITE_*` — they are baked into browser-visible assets.

---

## 4. First-admin bootstrap

- Once an admin exists, registration is closed. When the user collection is
  empty **and** the operator explicitly wants the first admin:
  1. Set `ALLOW_ADMIN_BOOTSTRAP=true` (Render env) and redeploy.
  2. Confirm `POST /api/auth/register` succeeds **only** for
     `ADMIN_BOOTSTRAP_EMAIL` while the DB has zero users; the created account is
     forced to `admin`; the one-time lock is kept after success.
  3. Set `ALLOW_ADMIN_BOOTSTRAP=false` and redeploy.
- Every other register attempt returns the identical generic `403`. The lock
  collection `admin_bootstrap_locks` makes concurrent attempts produce exactly
  one admin.
- Stop-condition: disallow automatic provisioning. After provisioning, re-verify
  register returns `403`.

---

## 5. Authentication & password reset

- Login: `POST /api/auth/login` → JWT (7d, contains `authVersion`). `GET
  /api/auth/me` returns the authoritative role + permissions.
- Forgot: `POST /api/auth/forgot-password` → always the generic response. A
  43-char base64url token is generated only for existing accounts; only its
  SHA-256 hash is stored (1h expiry). Reset link = `RESET_LINK_BASE` +
  `/reset-password?token=...`.
- Reset: `POST /api/auth/reset-password` requires password ≥ 6. On success the
  token is cleared (single use), `authVersion` bumped (invalidates all older
  JWTs) and a best-effort security-notification email is attempted.
- Rate limits: `/api/auth` 20 req / 15 min; `/api` general 300 / 15 min.

---

## 6. SMTP

- `EMAIL_PROVIDER=mock` (dev/test, in-memory), `none` (safe no-op), `smtp`
  (Nodemailer). Unsupported values fail startup; `smtp` without
  HOST/USER/PASSWORD fails startup (no silent mock fallback).
- Never log/commit `SMTP_PASSWORD`. `SMTP_PASS` is a back-compat alias.
- To go live: configure real relay values, set `EMAIL_PROVIDER=smtp`, then send
  one real forgot-password email to verify delivery.

---

## 7. Cloudinary (media)

- Server-side only: `cloudinary.config` uses `CLOUDINARY_CLOUD_NAME/API_KEY/
  API_SECRET` from env. Frontend never receives credentials.
- Uploads validated by magic bytes (PNG/JPEG/GIF/WebP), size ≤ 10 MB, then
  uploaded to the `kmes-school` folder. Missing config → safe 400, no crash.
- Live test deferred until production credentials exist.

---

## 8. Facebook

- Import-only to **drafts** (`import`, `sync`, idempotent, deduplicated,
  provenance recorded in ActivityLog). `publish` requires an explicitly
  CMS-published item, `social.publish` permission, explicit human action, and
  has duplicate-publication protection. There is **no** automatic or
  unattended publishing. Live test deferred until credentials exist.

---

## 9. AI

- `POST /api/ai/suggest` returns an ephemeral suggestion (nothing written);
  `POST /api/ai/apply` requires an explicit human apply and re-checks
  `content.edit` against the DB. AI can never approve, publish, delete, or
  change roles; dedicated rate limit 30/min. Live test deferred until
  credentials exist.

---

## 10. Backups / restore / PITR

- See `docs/DISASTER_RECOVERY.md` and `docs/RESTORE_CHECKLIST.md`.
- **Current status: OPERATOR ACTION REQUIRED** — Atlas Cloud Backup / PITR
  enablement is not confirmed. Confirm it in Atlas (Backup tab) or enable
  periodic `mongodump` to encrypted off-host storage (recommended daily; keep 7
  daily / 4 weekly / 12 monthly).
- `User.password` is `select:false` — any backup must export with
  `select("+password")`; restore must use the raw driver (`insertMany`) to
  preserve hashes; BSON `_id`/`Date` types must be preserved (use `mongodump`/
  Atlas restore).
- `node src/seed.js` is destructive and refuses to run with
  `NODE_ENV=production` or without `--allow-destructive`.

---

## 11. Health checks & logs

- `GET /api/health` reports liveness + Mongo `readyState` (connected).
- Uptime monitor against `https://kmes-school.onrender.com/api/health`.
- Backend logs: Render service Logs. Watch for `[config]` warnings at boot
  (missing critical config), and `Password reset email delivery failed:`
  (SMTP issues — generic response still returned).
- Rollback: `git revert`/push a prior commit; Render and Vercel redeploy.
- Incident response:
  1. Check `/api/health` (DB up?). 2. Check boot `[config]` warnings.
  3. Restore DB only to a **fresh** DB first (never overwrite live).
  4. For accidental deletes, use the CMS Trash/restore before considering a
     full restore. 5. Rotate any suspected-exposed secret immediately.

---

## 12. Launch checklist

- [ ] Backend deployed from the Phase 20 commit (register returns the generic
  *"Registration is temporarily unavailable."* 403).
- [ ] Inert Phase 19 probe admin `6a9bd536517cf52838416563` deleted via Atlas
  (documented procedure below).
- [ ] `ALLOW_ADMIN_BOOTSTRAP=false`; `ADMIN_BOOTSTRAP_EMAIL=saugatb40@gmail.com`.
- [ ] `ALLOWED_ORIGINS` includes `https://kmes-school.vercel.app`; no wildcard.
- [ ] Frontend build has `VITE_API_BASE_URL=https://kmes-school.onrender.com`
  (verified: the deployed bundle contains it, no localhost).
- [ ] `/api/health` → 200 with database connected.
- [ ] Admin login works; `/api/auth/me` returns role + permissions.
- [ ] Forgot-password flow returns the generic response; reset link is served
  over HTTPS from the frontend origin.
- [ ] HTTPS enforced (Vercel + Render are HTTPS-first).
- [ ] Atlas Cloud Backup/PITR enabled (or `mongodump` schedule in place).
- [ ] SMTP / Cloudinary / Facebook / AI live integrations documented as DEFERRED until configured.
- [ ] CI green on `main` (backend unit suites + audit; frontend build/lint/audit).

### Safe Atlas deletion procedure (probe admin)
Performed by an operator with an Atlas project credential (never in app code,
never via the API from the frontend):

1. Open Atlas → Cluster → **Browse Collections** (or use `mongosh` with an
   operator credential).
2. Find `users` where `_id == ObjectId("6a9bd536517cf52838416563")`.
3. Document it (role, email) for the audit record, then delete exactly that one
   document (`.deleteOne({ _id: ObjectId("6a9bd536517cf52838416563") })`).
4. Confirm the count went down by exactly one and that no other collection
   references that user id as `createdBy`/`publishedBy` (trash/trashed items can
   still reference it — that is fine for audit history).

Do **not** delete it by guessing at matching emails or by using the application
API. No credential requests are ever made through this runbook.