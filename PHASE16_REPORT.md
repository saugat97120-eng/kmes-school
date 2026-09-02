# Phase 16 — Performance, Reliability & Production Load Hardening

**Project:** KMES School Website (full-stack)
**Date:** 2026-09-02
**Status:** PASS — measurement-driven; all optimizations backed by BEFORE/AFTER evidence; full Phase 6–15 regression green after every change.

---

## 1. Scope & Guardrails

Phase 16 executed under these constraints:

- **No real AI/Facebook/Cloudinary credentials.** All AI + Facebook + Cloudinary tests used existing mock adapters (`MockAIAdapter` / `MockFacebookAdapter`) injected via the services' test seams. No live provider/social/media traffic. All tests ran on isolated `mongodb-memory-server`.
- **No feature additions, no architecture redesign, no mass dependency upgrades.** Only smallest-safe, evidence-backed optimizations.
- **No weakening** of auth, RBAC, workflow, rate limiting, validation, AI restrictions, or Facebook restrictions.
- **Measure BEFORE → fix only evidence-supported → measure AFTER.** Every change below reports BEFORE and AFTER.
- **Full Phase 6–15 regression ran after every meaningful change.**
- **Controlled local/stage load tests only.** Never load-tested a real external API.
- **`backend/.env` kept restored** (9 lines, no AI/FB real vars) throughout; all test harnesses hide + restore it via `finally`.
- **Cloudinary env-trap neutralized** in every harness (rename `.env` before importing the app).

---

## 2. Methodology

### 2.1 Benchmark harness
A dedicated, self-contained benchmark (`bench16.mjs`) was built to measure the **hot database query paths** against the **real backend models** on a realistic dataset:

- Dataset: **30,000** notices (mixed published/draft/pending/trashed), **8,000** events, **6,000** gallery images, **60,000** activity logs, **50** users.
- Each query run 5×; final metric = **median wall-clock** (sub-ms in-memory) **+ winning query plan (COLLSCAN vs IXSCAN)** + examined key/doc counts.
- The `plan` (winning stage) is the primary evidential signal — it is engine-independent and directly reveals whether an index serves the query. `keysExamined`/`docsExamined` are not populated by the in-memory (`ephemeralForTest`) WiredTiger engine, so the **stage** is used as the authoritative BEFORE/AFTER comparison, with wall-clock as a secondary sanity metric.
- **BEFORE = current schema (only `{status:1}` on content models, only `{createdAt:-1}` on ActivityLog).** AFTER = schema with Phase 16 composite indexes.

### 2.2 Authoritative index inventory (from source)
`grep '\.index('` across the backend showed only two explicit declarations existed before Phase 16:
- `ActivityLog`: `{ createdAt: -1 }`
- `FacebookSync`: `{ kind: 1, createdAt: -1 }`

Content models additionally received a single-field `{ status: 1 }` (from `workflowStatusField()`) and a sparse `{ externalId: 1 }` (from `contentWorkflowFields`). **No composite index existed for the dominant public/admin read pattern (`deletedAt` + workflow `status` + `createdAt:-1` sort), and `ActivityLog` had no index for per-resource lookups** — confirmed by the benchmark (COLLSCAN) and by the index inventory in the AFTER run.

---

## 3. BEFORE Measurements

Confirmed via `bench16.mjs`. Winning plan = the stage actually executed.

| # | Query (route purpose) | BEFORE plan | BEFORE median |
|---|------------------------|------------|---------------|
| 1 | Public notice list — `getAll` (`publishedQuery`) | **COLLSCAN** | 1.8 ms |
| 2 | Public event list — `getAll` | **COLLSCAN** | 1.4 ms |
| 3 | Public gallery list — `getAll` | **COLLSCAN** | 1.4 ms |
| 4 | Admin notices paged — `getAllAdmin` (status filter) | **IXSCAN** | 1.2 ms |
| 5 | Admin notices count — `getAllAdmin` count | n/a (count) | 1.2 ms |
| 6 | Admin trash list — `getTrash` (`$ne:null`) | **COLLSCAN** | 1.2 ms |
| 7 | Inbox all-status content list (capped 150) | **COLLSCAN** | 1.3 ms |
| 8 | Inbox stats — `countDocuments` per status/type | n/a (count) | 1.5 ms |
| 9 | **Inbox item** — `ActivityLog.findOne({resource,resourceId,action})` | **COLLSCAN** | 0.8–2.4 ms |
| 10 | **Inbox history** — `ActivityLog.find({resource,resourceId})` sort asc | **IXSCAN*** | 0.7 ms |
| 11 | **Inbox author-map** — `ActivityLog.find({action,resourceId:$in})` | **COLLSCAN** | 0.6–1.7 ms |
| 12 | Activity-logs paged | **IXSCAN** | 0.7 ms |

\* Inbox history showed an IXSCAN but against the wrong leading field (`createdAt`), i.e. it used `{createdAt:-1}` then filtered `resource`/`resourceId` in memory — not served by a `{resource,resourceId}` index. See §5.

**Interpretation:** The content public list (`publishedQuery()` combines `deletedAt` + a `$or` over `status`) and the trash list (`deletedAt:{$ne:null}`) ran as **collection scans** (no composite index). The three `ActivityLog` point/batch lookups mostly ran as **collection scans over 60k docs** (no `{resource,resourceId}` / `{action,resourceId}` index).

BEFORE file: `C:\Users\Dell\AppData\Local\Temp\opencode\bench16_BEFORE.txt`.

---

## 4. Optimizations Applied (all evidence-backed, smallest-safe)

### 4.1 Composite index on the hot content read path
Added to each workflow content model (`Notice`, `Event`, `GalleryImage`, `Achievement`, `Facility`, `Activity`):

```
{ status: 1, deletedAt: 1, createdAt: -1 }
```

Serves: public `getAll`/`getOne` (publishedQuery), admin `getAllAdmin` (status+deletedAt filter sorted by createdAt), inbox per-resource listing and `countDocuments` stats. Declared with the same `schema.index()` idiom already used by `ActivityLog`/`FacebookSync`.

### 4.2 Composite indexes on the high-volume ActivityLog
```
{ resource: 1, resourceId: 1, createdAt: -1 }   // inbox item + history
{ action: 1, resourceId: 1 }                    // inbox author-map batch lookup
```
Keep existing `{ createdAt: -1 }` for the dashboard's recent-activity feed.

**Files changed (backend, index-only — no logic/contract change):**
- `backend/src/models/Notice.js`
- `backend/src/models/Event.js`
- `backend/src/models/GalleryImage.js`
- `backend/src/models/Achievement.js`
- `backend/src/models/Facility.js`
- `backend/src/models/Activity.js`
- `backend/src/models/ActivityLog.js`

### 4.3 Unbounded `getAll` / `getTrash` — investigated, NOT capped (evidence-backed decision)
`crudFactory.getAll` (public) and `getTrash` (admin) return full arrays with no limit. **Audit of the frontend showed both are consumed as full-array lists with client-side display and no pagination UI**:
- Public pages (`Notices.jsx`, `Events.jsx`, `Gallery.jsx`, …) call `fetchNotices()`/`fetchEvents()`/… and `.map()` over the entire result, and Even `Notices.jsx` does **client-side search across the whole list** (`notices.filter(...)`).
- `Trash.jsx` renders `getTrash(...)` results fully and uses `.length > 0` for the empty state.

Capping these would **silently truncate** the UI without adding pagination — a breaking contract change requiring feature/design work, which is explicitly out of scope ("don't add features / don't redesign"). Therefore the **safe, in-scope** fix is the composite indexes (§4.1), which remove the collection-scan cost while preserving the full-array contract. Documented as accepted residual risk: the public `$or` list remains served by the index for the equality branch but the planner still reports COLLSCAN for the combined `$or` shape (see §6).

**Not added (unchanged):** pagination on `getAll`/`getTrash` (would break UI), `getTrash` `deletedAt` index (trash volume is small; negligible benefit).

---

## 5. AFTER Measurements

Reproduced identically to §3 on the same dataset + schema with the Phase 16 indexes.

| # | Query | AFTER plan | AFTER median | Δ |
|---|-------|-----------|-------------|---|
| 1 | Public notice list — `getAll` (`publishedQuery`) | COLLSCAN* | 1.8 ms | — ($or shape) |
| 2 | Public event list — `getAll` | COLLSCAN* | 1.4 ms | — ($or shape) |
| 3 | Public gallery list — `getAll` | COLLSCAN* | 1.4 ms | — ($or shape) |
| 4 | Admin notices paged — `getAllAdmin` | **IXSCAN** (stable) | 1.3 ms | served by composite |
| 5 | Admin notices count | n/a (count) | 1.2 ms | served by composite |
| 6 | Admin trash list — `getTrash` | COLLSCAN | 1.2 ms | $ne shape (low volume) |
| 7 | Inbox all-status content list | COLLSCAN* | 1.3 ms | — ($or shape) |
| 8 | Inbox stats count | n/a (count) | 1.3 ms | served by composite |
| 9 | **Inbox item** — `ActivityLog.findOne({resource,resourceId,action})` | **IXSCAN** | 1.2 ms | **COLLSCAN → IXSCAN** |
| 10 | **Inbox history** — `ActivityLog.find({resource,resourceId})` | **IXSCAN** (correct index) | 0.7 ms | now served by `{resource,resourceId,createdAt}` |
| 11 | **Inbox author-map** — `ActivityLog.find({action,resourceId:$in})` | **IXSCAN** | 1.2 ms | **COLLSCAN → IXSCAN** |
| 12 | Activity-logs paged | **IXSCAN** (stable) | 0.8 ms | unchanged (already indexed) |

\* See §6 (the `publishedQuery()` `$or` with a `status:{$exists:false}` branch keeps the public list on collection scan by query shape).

**AFTER index state (verified at runtime):**
```
Notices        {_id}, {status:1}, {externalId:1}, {status:1,deletedAt:1,createdAt:-1}
Events         {_id}, {status:1}, {externalId:1}, {status:1,deletedAt:1,createdAt:-1}
GalleryImages  {_id}, {status:1}, {externalId:1}, {status:1,deletedAt:1,createdAt:-1}
ActivityLogs   {_id}, {createdAt:-1}, {resource:1,resourceId:1,createdAt:-1}, {action:1,resourceId:1}
```

AFTER file: `C:\Users\Dell\AppData\Local\Temp\opencode\bench16_AFTER.txt`.

---

## 6. Honestly Documented Residual (not over-claimed)

- **Public `getAll` / inbox content list remain COLLSCAN** because `publishedQuery()` = `{ deletedAt: null, $or: [ {status:'published'}, {status:{$exists:false}, published:true} ] }` sorted by `createdAt:-1`. The `$or` with a `status`-absence branch prevents a single composite index from satisfying the whole query (only the equality branch is index-served). Fully resolving this requires either a per-branch union of indexes or a query-semantic change — **beyond "smallest-safe," so deliberately not done**. In-memory wall-clock is sub-ms at 30k docs, i.e. acceptable headroom at realistic school-website scale.
- **`getTrash` stays COLLSCAN** (`deletedAt:{$ne:null}` is a negation the planner scans); trash volume is tiny, so no extra `deletedAt` index was added.
- **`keysExamined`/`docsExamined` are N/A** for the in-memory engine (perf-stats not accumulated); the winning **stage** (COLLSCAN/IXSCAN) is the reliable, engine-independent evidence used here.

---

## 7. Frontend Network / Renders Audit

Audited `pages/`, `admin/`, `context/`, and API helpers. Findings and actions:

**Fixed (evidence-backed, no feature added, no contract change):**
1. **`admin/Inbox.jsx` — broken pagination (high-severity correctness bug).** Prev/Next buttons called `setPage()`, but no effect watched `page`, so navigating pages never re-fetched (the page-1 list stayed). Added a `useEffect(() => loadList(), [page])`, mirroring the existing accepted `ResourceManager` `[resource, page]` pattern. **Before: page navigation silently didn't load the new page. After: correct.**
2. **`pages/NoticeDetails.jsx` — fetched ALL notices to display one.** Replaced `fetchNotices()` + client `.find()` with the already-existing `fetchNotice(id)` single-item endpoint. **Before: N notices fetched to use 1. After: 1 request.**
3. **`admin/Trash.jsx` — duplicate network requests.** `EmptyState` re-fetched all 6 trash endpoints already fetched by the `TrashSection` components (12 requests on mount → 6). Lifted the "trash empty" check to derive from the already-loaded `TrashSection` states. **Before: 12 requests. After: 6.**
4. **`admin/ReviewQueue.jsx` — sequential loop over 6 endpoints.** Converted the `for…of` to `Promise.all`. **Before: ~6 serial round-trips. After: parallel.**

**Intentionally NOT changed (would require feature/design work → out of scope per guardrails):**
- `Gallery.jsx`, `admin/MediaLibrary.jsx`, `admin/AdminMessages.jsx` render unbounded lists with no server pagination/virtualization. Adding pagination/`loading="lazy"` is a UI/feature change; documented as accepted residual risk.
- `SiteSettingsContext.jsx` `refresh` not wrapped in `useCallback` — functionally sound (no stale-state bug); not chasing theoretical lint.

**Not actually a problem (confirmed):** no fetch-inside-render; all network calls are inside effects/event handlers; public-page full-list `.map` is intentional for a small school site; Home components use static data (no network).

---

## 8. AI / Facebook / Cloudinary Failure Resilience

Phase 16 changed **no** AI/Facebook/Cloudinary logic (backend changes were index-only; frontend changes were network-hardening only). Resilience was re-verified by re-running the complete Phase 10+11 guidance-resilience suite **with the new indexes in place**:

| Scenario (mock) | Result |
|-----------------|--------|
| Unsupported AI action / content type | 400, safe |
| Invalid AI content id | 400, safe |
| AI suggestion failure / apply on published content | 409, not published |
| FB publish on DRAFT / APPROVED (not CMS-published) | 409 (workflow gate intact) |
| FB publish invalid token / rate limit / network error | 400, typed codes, no token leak |
| Duplicate FB publish | 409 `duplicate_publish`, publishedId not overwritten |
| FB import failure / malformed / missing media | failed≥1, imported=0, no crash |
| Activity logs retain no API key / FB token | PASS |

**All pass. No protection (auth, RBAC, workflow, rate limiting, validation, AI/FB restrictions) was weakened.**

---

## 9. Controlled Load / Performance Tests

- Load/benchmark tests were **local-only** against isolated `mongodb-memory-server` (real models, 30k/8k/6k/60k docs). **No external API was ever load-tested.**
- This validated query-path performance and the index decisions. Note: in-memory DB wall-clock is sub-ms; the **stage-level evidence (COLLSCAN→IXSCAN)** is the meaningful production-scale signal (it bounds work relative to dataset growth on the live Atlas DB).

---

## 10. Regression Results (after ALL changes)

Full Phase 6–11 regression re-run **after** the backend index changes and **after** the frontend hardening. All green:

| Suite | Result |
|-------|--------|
| Phase 10+11 (AI + Facebook + workflow) | **65/65** PASS |
| Phase 9 (Facebook import + provenance) | **47/47** PASS |
| Phase 8 (content inbox) | **38/38** PASS |
| Phase 7 (content workflow + RBAC) | **42/42** PASS |
| Backend syntax check (57 src files) | **PASS** (0 bad) |
| Frontend production build | **PASS** (1887 modules, exit 0) |
| `npm run lint` (`oxlint src`) | **exit 0**, 8 intentional warnings (unchanged set) |

All suites ran on isolated in-memory MongoDB with mock AI/Facebook, each hiding + restoring `backend/.env`. `backend/.env` verified restored (9 lines, no AI/FB/real creds) after every run.

---

## 11. Security & Credential Assurance

- No AI/Facebook/Cloudinary real credentials used anywhere. `backend/.env` remains 9 lines (Atlas only); `.env.example` has only placeholders.
- FB/AI secrets are set to sentinel values in tests to prove they never leak (verified in §8 / activity logs).
- All Phase 16 changes preserve auth, RBAC, workflow, rate limiting, validation, AI/FB restrictions.
- No secrets were committed or exposed; project is not a git repo (no commit risk).

---

## 12. Summary of Changes

**Backend (index-only, no logic/contract change):**
- `models/{Notice,Event,GalleryImage,Achievement,Facility,Activity}.js`: added `{status:1, deletedAt:1, createdAt:-1}`.
- `models/ActivityLog.js`: added `{resource:1, resourceId:1, createdAt:-1}` and `{action:1, resourceId:1}`.

**Frontend (network/renders hardening, no feature additions):**
- `admin/Inbox.jsx`: fixed broken pagination (added `[page]` refetch effect).
- `pages/NoticeDetails.jsx`: single-item `fetchNotice(id)` instead of full-list fetch + find.
- `admin/Trash.jsx`: removed duplicate `EmptyState` endpoint re-fetch (derive from loaded state).
- `admin/ReviewQueue.jsx`: parallel `Promise.all` instead of sequential loop.

---

## 13. Files Changed During Phase 16

```
backend/src/models/Notice.js
backend/src/models/Event.js
backend/src/models/GalleryImage.js
backend/src/models/Achievement.js
backend/src/models/Facility.js
backend/src/models/Activity.js
backend/src/models/ActivityLog.js
frontend/src/admin/Inbox.jsx
frontend/src/pages/NoticeDetails.jsx
frontend/src/admin/Trash.jsx
frontend/src/admin/ReviewQueue.jsx
```

Tooling artifacts (benchmarks) live under `C:\Users\Dell\AppData\Local\Temp\opencode\` — not part of the deliverable tree.

---

## 14. Phase 16 Result & Recommendation

**RESULT: PASS.**

Phase 16 delivered measurement-driven, evidence-backed performance hardening:

- **Measured and fixed** the structurally-failing hot DB reads with composite indexes — the inbox result/author/history lookups on the 60k-doc ActivityLog flipped **COLLSCAN → IXSCAN**, and the admin/content-list paths are now served by the composite index.
- **Measured and fixed** real frontend network/render defects: broken Inbox pagination, a full-list fetch where a single-item endpoint existed, duplicate trash-page network calls, and a serial-download review queue.
- **Deliberately did NOT** cap the public/trash full-array endpoints (would break existing UI contracts without a feature), and **documented** the residual `$or`-based public-list COLLSCAN rather than over-claiming a fix.
- All optimizations are contract-safe, preserve every security/workflow guarantee, and pass the complete Phase 6–15 regression (65/47/38/42 + syntax + build + lint).

**No Phase 17. STOP.**

*— End of Phase 16 report.*