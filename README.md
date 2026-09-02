# Kaseni Model Secondary English School (KMES) — Website

A full-stack, production-shaped school website: a **React (Vite + Tailwind CSS)**
frontend and a **Node.js/Express + MongoDB (Mongoose)** backend with a
role-based admin CMS, a content review workflow, an admin inbox, Facebook
publishing/import, an AI content assistant, and Cloudinary media hosting.

```
kmes-school/
├── backend/    Node.js + Express + MongoDB (Mongoose) REST API
├── frontend/   React + Vite + Tailwind + React Router SPA
└── docs/       Disaster-recovery runbook + restore checklist
```

---

## Architecture

- **Backend** — `backend/src/server.js` mounts REST routes under `/api/*`.
  Layered as routes → controllers → Mongoose models, with middleware for auth,
  RBAC, input sanitization, rate limiting, and error handling.
- **Frontend** — a Vite SPA. Public pages render from the live API; an admin
  area (`/admin`) is a separate layout with a sidebar and its own routes.
- **Database** — MongoDB Atlas (Mongoose). 13 collections covering content,
  users, site settings, page content, media, contact messages, activity logs,
  and Facebook sync records.
- **Integrations** — Cloudinary (media), Facebook Graph API (publish/import),
  and an AI content assistant. Each is adapter-based and mockable so the site
  still runs (and is testable) if a provider is unavailable or unconfigured.
- **State/auth** — JWT stored in `localStorage` after login, sent as a
  `Bearer` token; `ProtectedRoute` / `AdminOnlyRoute` guard the admin area.

---

## Frontend

- **Public pages:** Home, About, Academics, Facilities, Activities, Notices +
  details, Events + details, Gallery (lightbox), Achievements, Admissions,
  Contact (posts to the backend), and a 404 page.
- **Admin area (`/admin`):** login, dashboard with live counts, full CRUD for
  notices, events, gallery, achievements, facilities, activities, plus page
  content, site settings, users, media library, messages/inbox, activity logs,
  review queue, trash, Facebook integration, and the AI assistant.
- **Stack:** React 19, React Router, Tailwind CSS 4, Vite; `lucide-react` icons.
  Linted with **oxlint** (`npm run lint`).

## Backend

- **Features:** JWT auth (open register **only while zero users exist**), RBAC
  (`admin`/`editor` roles), per-resource CRUD via a shared factory, content
  review workflow, admin inbox, activity logging, contact form, site settings,
  page content, media/upload, attachments, health check.
- **Auth & RBAC:** roles and permissions are enforced middleware-first
  (`src/permissions.js`, `src/middleware/roles.js`); permissions are
  granted/checked per request and are DB-backed.
- **Content workflow:** each content item passes through a status lifecycle
  (`draft → submitted → reviewed → approved → published`) with role-gated
  actions and an audit trail in `ActivityLog`.
- **Admin inbox:** `src/utils/inbox.js` + `routes/inbox.routes.js` coalesce
  submitted/queued content into a review queue (see `ReviewQueue.jsx`).
- **Facebook integration:** adapter-based (`facebookAdapter.js`) with mock +
  failure adapters; supports connection test, status, posts, import, sync,
  and publish — gated by social permissions.
- **AI content assistant:** adapter-based (`aiAdapter.js`) with mock + failure
  adapters; provides `suggest` (ephemeral, non-destructive) and an explicit
  human-gated `apply`. Gated by AI permissions.
- **Media / Cloudinary:** uploads via `upload.routes.js`; metadata in the
  `Media` model (`url` + `publicId`); transformations are URL-side and
  reproducible from `publicId`.
- **Backup / disaster recovery:** see [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md)
  and [`docs/RESTORE_CHECKLIST.md`](docs/RESTORE_CHECKLIST.md).

---

## Local development setup

Prerequisites: **Node.js ≥ 18** and a **MongoDB** instance (the app is designed
for Atlas but any URI works). No global tools required.

### Backend

```bash
cd backend
cp .env.example .env        # then edit with your values
npm install
npm run dev                 # http://localhost:5000
```

Go to `http://localhost:5000/api/health` — expect a success message.

### Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

---

## Environment variables

**Important:** real `.env` files are git-ignored and must never be committed.
Only the template `.env.example` files are version controlled. Copy the
template and fill in your own values.

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string (e.g. Atlas `mongodb+srv://...`) |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `FRONTEND_URL` | Frontend origin allowed by CORS (e.g. `http://localhost:5173`) |
| `CLIENT_URL` | Trust alias for the frontend origin |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (leave blank to disable) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FACEBOOK_APP_ID` | Facebook app ID (optional; blank disables FB) |
| `FACEBOOK_APP_SECRET` | Facebook app secret |
| `FACEBOOK_PAGE_ID` | Facebook page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook page access token |
| `AI_PROVIDER` | AI provider, e.g. `openai` \| `anthropic` \| `gemini` (optional) |
| `AI_API_KEY` | Provider API key (server-only) |
| `AI_MODEL` | Model id, e.g. `gpt-4o-mini` |
| `DEV_ADMIN_EMAIL` | Dev-only seeded admin (ignored unless `NODE_ENV=development`) |
| `DEV_ADMIN_PASSWORD` | Dev-only seeded admin password |

### Frontend — `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL the SPA calls (e.g. `http://localhost:5000`) |

**Never** put real credentials, connection strings, or passwords in any file
that gets committed. Use placeholders in templates only.

---

## Testing

- **RBAC smoke test (backend):**
  ```bash
  cd backend && npm test      # node tests/rbac.smoke.mjs
  ```
- **Lint (frontend):**
  ```bash
  cd frontend && npm run lint   # oxlint src
  ```
- **Build (frontend):**
  ```bash
  cd frontend && npm run build  # vite build -> dist/
  ```

Automated per-phase regression suites and the disposable-DB backup/restore and
application-restore drills are documented in `docs/DISASTER_RECOVERY.md`.

---

## Deployment notes

- **Backend (e.g. Render/other Node host):** root directory `backend`, build
  `npm install`, start `npm start`. Set all backend env vars from
  `backend/.env.example` with production values. Because `MONGODB_URI` must be
  a real Atlas connection string, provide it during deployment — never commit
  it.
- **Frontend (e.g. Vercel/other static host):** root directory `frontend`,
  framework preset Vite, build `npm run build`, output `dist`. Set
  `VITE_API_BASE_URL` to your deployed backend URL.
- **CORS:** set `FRONTEND_URL` on the backend to the deployed frontend URL so
  the API accepts requests from it.
- **Database:** MongoDB Atlas. Enable Atlas backups / point-in-time recovery;
  see the disaster-recovery docs for the full backup strategy, RPO/RTO,
  retention, and restore checklist.
- **Admin bootstrap:** `/api/auth/register` is open only while the `users`
  collection is empty, so you can create the first admin. After that, create
  additional users from the admin panel rather than the public register route.

---

## Documentation

- [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md) — backup strategy,
  RPO/RTO/retention, disaster scenarios, restore runbook, backup security.
- [`docs/RESTORE_CHECKLIST.md`](docs/RESTORE_CHECKLIST.md) — quick restore
  checklist.
- [`PHASE16_REPORT.md`](PHASE16_REPORT.md) — Phase 16 (indexes/performance)
  report.
- [`PHASE17_REPORT.md`](PHASE17_REPORT.md) — Phase 17 (backup/disaster
  recovery) report.