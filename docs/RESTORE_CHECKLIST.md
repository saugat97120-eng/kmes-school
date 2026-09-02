# KMES — Restore Checklist (Quick Reference)

Fast operational checklist for restoring KMES. Detailed runbook: `DISASTER_RECOVERY.md`.

## Database (MongoDB Atlas)
1. Stop writes (maintenance mode) or restore to a **fresh** DB.
2. Pick recovery point: latest `mongodump`, or Atlas PITR snapshot.
3. Restore to fresh DB; **rebuild indexes** (Atlas/mongorestore auto; scripted restore must re-create from schemas).
4. **Users**: ensure export used `.select("+password")`; import must bypass bcrypt (raw `insertMany`) to preserve hash.
5. **BSON types**: `_id`/`ObjectId`/`Date` must be re-cast (mongodump does this; JSON paths must do it manually).

## Verify before cutover
- [ ] `/api/health` returns 200
- [ ] Admin login works (hash survived) and wrong password → 401
- [ ] `/api/auth/me` returns role + permissions
- [ ] `/api/dashboard/stats` returns counts
- [ ] `/api/inbox` and `/api/activity-logs` return data
- [ ] Public content endpoint hides drafts (workflow `status` intact)
- [ ] Per-collection doc counts + index set match backup manifest

## Cutover
6. Point production `MONGODB_URI` at restored DB; resume traffic.
7. Log the restore in `ActivityLog`.

## Media (Cloudinary)
- Confirm `Media.publicId` values resolve; if originals lost, re-upload from master copies and re-point `Media.url`.
- Check published content for orphaned media URLs (Media delete does not cascade).

## Env/Secrets
- Rebuild `backend/.env` from `.env.example`; pull real values from secrets manager.
- Set `FRONTEND_URL` (not `CLIENT_URL`). No real Facebook/AI keys committed.

## Source
- Not a Git repo today. Recommended: `git init` + commit + push private remote; `npm ci` + `npm run build` to rebuild.

## Day-to-day
- Accidental deletion → use **Trash / restore** (soft-delete) first; full DB restore only as fallback.
- Run a disposable restore drill monthly; full app drill quarterly.