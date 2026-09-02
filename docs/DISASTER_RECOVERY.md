# KMES — Disaster Recovery & Restore Runbook

**Phase:** 17 (Backup, Disaster Recovery & Restore Validation)
**Scope:** Backups, restore procedure, recovery scenarios, backup security, drills, and regression baseline.
**Hosting (as discovered):** MongoDB Atlas (cluster `cluster0.ndtzgxk.mongodb.net`) · Cloudinary (media) · Node/Express backend · React frontend.
**Environment status:** Project is NOT a Git repository. No automated backup scheduler or CI exists in the codebase. All validation in this phase ran on disposable `mongodb-memory-server` databases; **no production database was read or modified.**

---

## 1. Data Inventory & Criticality

13 Mongoose models / collections (all source-verified, Phase 17.1).

| # | Model / collection | Blobs of record | Criticality | Notes |
|---|---|---|---|---|
| 1 | `User` / `users` | roles (`admin`/`editor`), permissions, password hash | **Critical** | `password` is `select:false` — a naive `find({})` export **drops the hash**. Must export with `.select("+password")`. |
| 2 | `SiteSettings` / `sitesettings` | school name, contact info, branding | Critical | Single-doc config, overwritten per save. |
| 3 | `PageContent` / `pagecontents` | page bodies, unique `slug` | Critical | `slug` is unique (index). |
| 4 | `Notice` / `notices` | news, workflow `status`, `deletedAt` | Critical | Composite index `{status,deletedAt,createdAt}`. |
| 5 | `Event` / `events` | schedule, workflow state, `deletedAt` | Critical | Same index pattern. |
| 6 | `GalleryImage` / `galleryimages` | image URLs/publicIds, workflow state | High | Cloudinary is blob source of truth. |
| 7 | `Achievement` / `achievements` | content only | High | |
| 8 | `Facility` / `facilities` | content only | High | |
| 9 | `Activity` / `activities` | content only | High | |
| 10 | `Media` / `media` | Cloudinary `publicId` + `url` | High | Media delete removes both Cloudinary asset and doc; **no cascade** to content references (orphan URLs possible). |
| 11 | `ContactMessage` / `contactmessages` | user-submitted inquiries | Medium | Public input, no PII per schema. |
| 12 | `ActivityLog` / `activitylogs` | audit trail | Medium | Auditable; indexes `{resource,resourceId,createdAt}` and `{action,resourceId}`. |
| 13 | `FacebookSync` / `facebooksyncs` | FB sync/publish records | Medium | Re-producible from Facebook API; source of truth is remote. |

**Blobs of record:**
- MongoDB Atlas (structured data, critical).
- Cloudinary (`kmes-school` folder) — originals + transformations; transformations are URL-side and reproducible from `publicId`.
- Source code on local filesystem (currently **not** under version control).
- Environment/secrets in `backend/.env` + `backend/.env.example` (reference template).

---

## 2. Backup Strategy, RPO, RTO, Retention (Phase 17.4–17.7)

### Strategy
- **Primary:** MongoDB Atlas **Cloud Backup / point-in-time recovery** (managed). Recommended to be enabled at cluster level; recovery point selectable to minutes.
- **Secondary (defense in depth):** periodic **`mongodump`** export to a **separate, encrypted, off-host** location (object storage / encrypted disk). `mongodump` preserves BSON types natively and captures indexes in `.metadata.json` files.
- **Media:** Cloudinary provides its **own redundancy**; optionally enable Cloudinary Backups. The `Media` collection's `publicId` allows re-deriving URLs.
- **Secrets/env:** store real values in a **secrets manager / password vault** (reconstructible from `.env.example` template; never commit `.env`).

### RPO (Recovery Point Objective) — recommended
- **≤ 24 h** default (daily `mongodump`), **≤ 5 min** if Atlas point-in-time recovery (PITR) is enabled on the paid tier.
- This project's low write volume supports daily backups comfortably.

### RTO (Recovery Time Objective) — recommended
- **≤ 4 h** from cold backup; **≤ 1 h** from Atlas PITR snapshot.
- Validated: full restore of all 13 collections, index rebuild, and app boot+login completed in seconds on disposable DBs (Phase 17.8–17.12), so the dominant RTO factor is external restore of a large remote Atlas dump, not the app itself.

### Retention — recommended
- **No enforced programmatic retention exists** in the codebase. Recommended policy:
  - Daily backups: **keep 7 daily**.
  - Weekly: **keep 4 monthly** (one per week → 4 per month).
  - Monthly: **keep 12 monthly** (yearly archive) or longer for compliance.
  - Occasional **annual offsite/immutable** copy as disaster archive.

---

## 3. Backup & Restore — Validated Procedure (Phase 17.8–17.12)

All automated validation was performed on **disposable `mongodb-memory-server`** databases in the O/S temp dir. Test artifacts live at `C:\Users\Dell\AppData\Local\Temp\kmes17-backup` (disposable; nothing retained inside the project).

**Critical findings from validation:**
1. **`User.password` is `select:false`.** Exporting users with `find({})` silently drops password hashes. **Backup must select `+password`** or restored admins cannot authenticate. (Discovered and fixed in the harness.)
2. **Restore must bypass the Mongoose bcrypt pre-save hook.** Use the raw collection driver (`Model.collection.insertMany`) so stored hashes are preserved byte-for-byte. A Mongoose `create/insertMany` would re-hash / require a plaintext password.
3. **BSON type preservation.** A naive JSON dump does NOT preserve `_id`/`ObjectId`/`Date` types — querying restored docs by `_id` (e.g., login→`/auth/me`) then fails even when `email` lookups still work. `mongodump`/Atlas restore re-hydrate these natively; any scripted JSON path **must re-cast** those fields.

### Restore checklist
1. Stop writes / put backend in maintenance, or restore to a fresh database first and switch `MONGODB_URI` after verification.
2. Restore the latest backup to a **fresh** database (never blindly overwrite the live DB).
3. Rebuild indexes (Atlas/`mongorestore` do this; scripted restore must re-create from schemas — see §5).
4. Run integrity comparison: per-collection document counts + index set must match the backup manifest.
5. Boot the backend against the restored DB with mocks; verify:
   - `/api/health`
   - admin login (proves password hash survived) + wrong-password → 401
   - `/api/auth/me` returns role + permissions
   - `/api/dashboard/stats` (counts), `/api/inbox`, `/api/activity-logs`
   - public content endpoint filters drafts correctly (workflow `status` intact)
6. On success, point production `MONGODB_URI` at the restored DB and resume traffic.
7. Log the restore in `ActivityLog` with timestamp + operator (manual step).

**Validated results:**
- Backup+restore+integrity on disposable DBs: **9/9 checks PASS** (all 13 collections, matching counts + indexes, key samples: workflow status, FB provenance, FB `facebookPublication`, AI metadata, admin role, non-clear-text password hash, trash/soft-delete, unique slug, media `publicId`).
- App-restore test (real backend on restored DB): **15/15 checks PASS** (health, restored-admin login + hash, role/permissions, dashboard, inbox, ActivityLogs, AI mock, Facebook mock test, workflow submit on restored draft).

---

## 4. Backup Security & Access Control (Phase 17.23–17.24)

- **Never commit** `.env` (already covered by `backend/.gitignore` — `node_modules/`, `dist/`, `.env`, `.env.*` except `!.env.example`, `*.log`).
- Dumps contain password **hashes**, not plaintext — but the hash is brute-forceable, so **treat dumps as secrets** and store them **encrypted at rest, restricted access ACLs** (only operators).
- Atlas cluster access: use the **principle of least privilege** — one application user (read/write on the app DB) + separate backup-restore principal; no `readAnyDatabase` / `root` for the app.
- Cloudinary credentials (`API_SECRET`) and `JWT_SECRET` must live only in the secrets manager / `.env`; they are **not exported by the DB backup** — back them up separately.
- Backups should be delivered to an **off-host, encrypted** destination distinct from the Atlas cluster region where feasible.

---

## 5. Disaster Scenarios & Source Recovery (Phase 17.17–17.21)

### 5.1 Database data loss / corruption (MongoDB)
1. Restore latest valid backup to a fresh database (per §3 checklist).
2. If payload corruption, restore the most recent **clean** snapshot/PITR point.
3. Reconcile with Cloudinary (media still referenceable via `publicId`) and Facebook (re-sync if needed).
4. Confirm indexes and app boot (validated procedure in §3).

### 5.2 User/admin credentials locked out or lost (Phase 17.13, admin recovery)
- **Restore** the admin user from the DB backup (restores role + hash) — preferred, least destructive.
- **Bootstrap:** `auth.routes.js` (`POST /api/auth/register`) is open **only when user count == 0**; after any user exists, registration is closed. So a full DB wipe leaves registration open → recreate the first admin.
- `ensureDevelopmentAdminUser()` auto-creates/updates from `DEV_ADMIN_EMAIL`/`DEV_ADMIN_PASSWORD`, but **only when `NODE_ENV === "development"`** (not production).
- **No password-reset / forgot-password endpoint exists** (verified). Recommended improvement: add a reset flow or document a manual one-time reset. Until then: restore backup, or (dev-only) use `ensureDevelopmentAdminUser`, or directly set a new hash in the DB with a properly bcrypt/argon2-hashed value.

### 5.3 Environment / secrets corruption or loss (Phase 17.14–17.15)
1. `backend/.env.example` is a complete 30-line template — rebuild a fresh `.env` from it.
2. Real values (Atlas URI, `JWT_SECRET`, Cloudinary creds, `DEV_ADMIN_*`) must be sourced from the **secrets manager**; cannot be regenerated from the repo.
3. **Inconsistency found:** `CLIENT_URL` is present in `.env.example` but absent from the production-shaped `backend/.env`; `FRONTEND_URL` is used instead. When rebuilding, set the var the app reads (`FRONTEND_URL`).
4. `config/database.js` calls `process.exit(1)` on connect failure — a transient Atlas blip can crash the process; pair with a process manager (PM2/systemd) that auto-restarts.

### 5.4 Cloudinary / media disaster (Phase 17.17)
- Originals are stored in the `kmes-school` Cloudinary folder; `Media` docs keep `url` + `publicId`; transformations are **URL-side** and reversible from `publicId`.
- If Cloudinary assets are lost: re-upload originals from your local/master copies and re-point `Media.url`, or restore the `Media` collection `publicId`s if only the DB was lost (Cloudinary still holds the binaries).
- Deleting from the Media library currently does **not** cascade to content references → a deleted media item can leave broken/orphan URLs in published content. Treat Media deletes as a review step before publishing.
- No Cloudinary credentialed test was performed (out of scope; no credentials used). Recommended: enable Cloudinary Backups and periodically export the `kmes-school` folder.

### 5.5 Facebook integration disaster (Phase 17.21)
- Facebook is a **remote source of truth**; page content can be re-imported (`/api/integrations/facebook/import` / `sync`) after restoring credentials. `FacebookSync` docs are re-producible.
- The Facebook adapter is mockable; both mock success and mock failure adapters exist in `src/integrations/facebook/facebookAdapter.js`. No real Facebook credentialed call was made (out of scope).

### 5.6 AI integration disaster (Phase 17.20)
- AI is an **ephemeral enhancement**; AI suggestions are not persisted as the system of record (explicit human `apply` via `POST /api/ai/apply`). Losing the AI provider only degrades the suggestion feature; no data loss.
- Recovery = restore the AI provider/key + `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` env vars. Adapter abstractions (`src/integrations/ai/`) allow swapping providers.

### 5.7 Source-code / filesystem loss (Phase 17.19)
- **Project is not a Git repository.** This is the largest single-source recovery gap.
- **Recommended:** initialize Git, commit the current verified state, and push to a private remote; keep node_modules reproducible via `package-lock.json` + `npm ci`.
- Recovering source = download from the remote; reinstall deps; rebuild frontend (`npm run build`) and redeliver backend; then restore DB + media + env (§5.3).

---

## 6. Monitoring Gap (Phase 17.18, detection time)
- `health.routes.js` returns a **static "running" message and does not check DB connectivity** — so a health check will not detect a lost Atlas connection (which also crashes the process via `database.js`).
- **Recommended:** make `/api/health` perform a lightweight DB ping and expose upstream status (`/api/integrations/facebook/status`, `/api/ai/status`) so automated uptime monitoring reflects real recovery-relevant state.

---

## 7. Backup Frequency Recommendation (Phase 17.29)
- **Daily automated `mongodump`** to encrypted off-host storage (recommended default; generous margin given low write volume).
- **Enable Atlas Continuous Cloud Backup / PITR** (paid tier) if budget allows → RPO to ~5 min with zero app code.
- **Weekly restore drill** (see §8); **monthly full integrity + restore drill** on a disposable DB.
- **Manual backup** before any mass edit/publish/cleanup.

---

## 8. Drills & Testing (Phase 17.27–17.28)
- **Accidental deletion / Trash restore (Phase 17.28):** the app has a **Trash/soft-delete** system — `deletedAt` + `GET /api/*/admin/trash` + `restore` endpoints. A restored backup preserves trash rows (`deletedAt` intact, verified in backup test). **Trash/restore is the day-to-day recovery path for accidental deletes** — no full restore needed for a trashed item.
- **Drills performed this phase (on disposable DBs):**
  1. Seed representative source DB → export → restore to fresh DB → integrity + indexes + key samples (**9/9 PASS**).
  2. Boot real backend on the restored DB, exercise auth/dashboard/inbox/ActivityLog/AI-mock/FB-mock/workflow (**15/15 PASS**).
- **Standing recommendation:** repeat drill #1 at least monthly and quarterly for a full end-to-end app drill to keep RTO claims honest and re-validate index rebuild.

---

## 9. Access & Ownership
- Backup outputs (`kmes17-backup`) are disposable temp artifacts outside the repo.
- No pull/config/deploy tasks exist in this app; restoring the app to production is a manual deploy of backend + frontend build + env + restored DB (out of phase scope — **no deploy performed**).