# Kaseni Model Secondary English School (KMES) — Complete Project Documentation & Master Report

**Document Version:** 1.0.0  
**Project:** Kaseni Model Secondary English School (KMES) Official Website & Content Management System  
**Repository:** `https://github.com/saugat97120-eng/kmes-school.git`  
**Root Path:** `C:\Users\Dell\OneDrive\Desktop\KMES FILES\kmes-school`  
**Current Branch:** `main`  
**System Status:** **100% Green / Ready for Production**  

---

## 1. Executive Summary

Kaseni Model Secondary English School (KMES) is a modern, full-stack web application and content management system developed to provide an engaging public portal for students, parents, and alumni, as well as a role-governed administration panel for school staff.

The system combines a reactive single-page frontend with an Express/Node.js REST API backed by MongoDB. It incorporates publishing lifecycles, role-based access control, media hosting, external social media interoperability, an AI content copilot, and automated regression/disaster recovery safeguards.

### Core Stack Summary
* **Frontend:** React 19, Vite, Tailwind CSS 4, React Router 7, `lucide-react`, Oxlint.
* **Backend:** Node.js (>=18), Express 5, Mongoose 9, MongoDB Atlas / MongoDB Memory Server.
* **Security & Auth:** JWT with `authVersion` session invalidation, bcrypt.js password hashing, helmet, express-rate-limit, express-validator, magic-number document signature validation.
* **Integrations:** Cloudinary (media upload & transformations), Facebook Graph API (adapter-based social sync), AI Content Assistant (adapter-based multi-LLM copilot), Nodemailer (SMTP password reset & security alerts).

---

## 2. Complete Phase Chronology (From 1st to Last)

```
[Phases 1-15: Core Platform] ──► [Phase 16: Indexing & Perf] ──► [Phase 17: Disaster Recovery]
                                                                        │
[Phase 20: Bootstrap Hardening] ◄── [Phase 19: Prod Verify] ◄── [Phase 18: Prod Readiness]
          │
          ▼
[Phase 21: Audit Remediation] ──► [Post-Phase 21: Lint & Fallback] ──► [Production State]
```

### 2.1 Phases 1 – 15: Platform Genesis & Core Feature Matrix
* **Foundation:** Established monorepo containing `backend/` and `frontend/`.
* **Public Pages:** Created pages for Home, About Us, Academics, Facilities, Activities, Notices, Events, Gallery, Achievements, Admissions, and Contact.
* **Admin CMS (`/admin`):** Implemented an administrative workspace with sidebar navigation, login protection, and management modules for all core collections.
* **Content Approval Workflow:** Formatted a 5-stage lifecycle (`draft → submitted → reviewed → approved → published`) with role gates (`editor` creates/submits, `admin` approves/publishes).
* **Integrations Architecture:** Created mockable adapter abstractions for Cloudinary, Facebook Graph API, and AI writing assistants.

### 2.2 Phase 16: Performance, Indexing & Load Hardening
* **Benchmark Suite (`bench16.mjs`):** Built high-density benchmark harness across 30,000 notices, 8,000 events, 6,000 gallery images, and 60,000 activity logs.
* **Index Optimization:** Converted expensive full collection scans (`COLLSCAN`) to indexed scans (`IXSCAN`) by introducing composite indexes on `{ deletedAt: 1, status: 1, createdAt: -1 }` and `{ resourceType: 1, resourceId: 1, createdAt: -1 }`.

### 2.3 Phase 17: Disaster Recovery & Backup Integrity
* **Backup Runbook:** Established recovery procedures in [`docs/DISASTER_RECOVERY.md`](file:///C:/Users/Dell/OneDrive/Desktop/KMES%20FILES/kmes-school/docs/DISASTER_RECOVERY.md) and [`docs/RESTORE_CHECKLIST.md`](file:///C:/Users/Dell/OneDrive/Desktop/KMES%20FILES/kmes-school/docs/RESTORE_CHECKLIST.md).
* **Driver-Level JSON Export/Restore:** Implemented type-safe BSON/JSON export mechanism preserving ObjectIds, ISODates, and subdocument schemas.

### 2.4 Phase 18 (18B & 18C): Production Readiness Hardening
* **Password Reset Workflow:** Implemented SHA-256 hashed single-use reset tokens with strict expiry and security alerts.
* **Session Invalidation:** Added `authVersion` tracking in `User` model, terminating stale JWT tokens upon password or role modification.
* **Database-Aware Health Probe:** Upgraded `/api/health` to dynamically report 503 Service Unavailable if MongoDB loses connectivity.
* **Hosting Foundation:** Configured Vercel deployment (`frontend/vercel.json`) with Content Security Policy (CSP) and Render configuration (`backend/render.yaml`).
* **SMTP Delivery:** Wired Nodemailer integration with support for TLS/STARTTLS and zero credential leaks in logs.

### 2.5 Phase 19: Staging & Production Verification
* Verified end-to-end multi-origin CORS configurations, client URL redirects, and environment variable isolation between dev, staging, and production environments.

### 2.6 Phase 20: First-Admin Bootstrap & Concurrency Hardening
* Solved the race condition in initial school provisioning using `ALLOW_ADMIN_BOOTSTRAP` and `ADMIN_BOOTSTRAP_EMAIL` with atomic registration locks.
* Ensured public registration closes permanently once the first administrator account is created.

### 2.7 Phase 21: Review Remediation & Frontend Modernization
* **Backend Hardening:**
  * Created `backend/src/config/loadEnv.js` to guarantee clean environment initialization without dotenv overwrite traps.
  * Resolved bulk unpublish return bug (`results.unpublished`).
  * Implemented contact form IP rate limiting (8 submissions / 15 min) and schema field allow-lists.
  * Added `escapeRegex` utility to prevent regular expression DoS in search queries.
  * Enforced URL protocol validation, blocking `javascript:` and unsafe schemas in media and attachments.
  * Preserved subdocument `_id` and metadata during attachment round-trips.
  * Added binary magic-number signature verification for PDF, DOCX, and ZIP uploads.
  * Made public `/api/site-settings` and `/api/leadership` read-only.
* **Frontend Modernization:**
  * Replaced mock demo data with live API queries across all homepage sections with empty-state handling.
  * Centralized API base URL logic in `frontend/src/config.js`.
  * Added `ScrollToTop` router synchronization and accessible mobile navigation drawers.
  * Formatted human-readable dates and lazy-loaded image fallbacks.

### 2.8 Post-Phase 21: Final Polish & Audit Resilience
* Fixed all React effect warnings and unused imports in `LeadershipManager.jsx`, achieving **0 errors and 0 warnings** under Oxlint.
* Enhanced `audit-content.mjs` with automatic fallback to offline backup snapshots when remote MongoDB connectivity is unavailable.
* Verified all test suites (Unit, Integration, RBAC, Bootstrap, Regression) and pushed clean commits to `origin/main`.

---

## 3. Architecture & System Topology

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        SPA["React 19 SPA (Vite + Tailwind)"]
        AdminUI["Admin CMS (/admin)"]
        PublicUI["Public School Pages"]
    end

    subgraph Backend["API Tier (Node.js / Express)"]
        Server["server.js (Port 5000)"]
        AuthMiddleware["JWT + RBAC Middleware"]
        Sanitize["Input Sanitizer & Rate Limiters"]
        Routes["RESTful API Route Layer"]
        CRUDFactory["Universal CRUD Factory"]
    end

    subgraph Database["Persistence Tier"]
        Mongo["MongoDB Atlas (13 Collections)"]
        Indexes["Composite B-Tree Indexes"]
    end

    subgraph Integrations["External Services (Adapter Pattern)"]
        Cloudinary["Cloudinary (Media Storage)"]
        Facebook["Facebook Graph API"]
        AI["AI LLM Providers"]
        SMTP["SMTP Mail Provider"]
    end

    PublicUI -->|HTTP / JSON| Server
    AdminUI -->|JWT Bearer Token| Server
    Server --> Sanitize --> AuthMiddleware --> Routes --> CRUDFactory --> Mongo
    Mongo --- Indexes
    Routes --> Cloudinary
    Routes --> Facebook
    Routes --> AI
    Routes --> SMTP
```

### Project Directory Structure
```
kmes-school/
├── .github/workflows/ci.yml       # Automated GitHub Actions CI pipeline
├── backend/                       # Express REST API
│   ├── scripts/                   # Administrative CLI utilities (audit-content.mjs)
│   ├── src/
│   │   ├── config/                # Environment, Database, and Cloudinary configuration
│   │   ├── integrations/          # External services (AI, Email, Facebook)
│   │   ├── middleware/            # Auth, RBAC, Upload, Error, Sanitization
│   │   ├── models/                # 13 Mongoose Data Models
│   │   ├── routes/                # 21 Express Route Modules
│   │   ├── utils/                 # Admin bootstrap, CRUD factory, regex safety
│   │   ├── permissions.js         # Granular permission mapping table
│   │   └── server.js              # Application entrypoint
│   ├── tests/                     # Unit, integration, bootstrap, and regression suites
│   ├── .env.example               # Safe configuration reference template
│   └── package.json               # Backend dependencies & npm scripts
├── frontend/                      # React 19 Single Page Application
│   ├── src/
│   │   ├── admin/                 # Admin CMS Views, Managers, and Layouts
│   │   ├── components/            # UI Cards, Layouts, Home Sections, Modals
│   │   ├── context/               # SiteSettings and Auth Context Providers
│   │   ├── hooks/                 # Custom React hooks (useApiList, etc.)
│   │   ├── pages/                 # Public route pages (Home, About, Contact, etc.)
│   │   ├── utils/                 # Formatting, API helpers, token storage
│   │   ├── App.jsx                # Route registry
│   │   ├── config.js              # Centralized environment configuration
│   │   └── main.jsx               # React DOM bootstrap
│   ├── index.html                 # HTML shell with SEO meta tags
│   ├── vercel.json                # Production routing & CSP headers
│   └── package.json               # Frontend dependencies & npm scripts
├── backup/                        # Point-in-time JSON database snapshots
└── docs/                          # Disaster recovery, restore checklist, deployment guides
```

---

## 4. Database Schema & Collections (13 Collections)

| Collection | Model File | Purpose | Primary Fields | Key Indexes |
|---|---|---|---|---|
| `users` | `User.js` | User accounts & permissions | `name`, `email`, `password`, `role`, `authVersion`, `passwordResetTokenHash`, `passwordResetExpires` | `{ email: 1 }` (unique) |
| `notices` | `Notice.js` | Announcements & circulars | `title`, `content`, `category`, `date`, `status`, `attachments`, `pinned` | `{ deletedAt: 1, status: 1, createdAt: -1 }` |
| `events` | `Event.js` | School calendar & events | `title`, `description`, `date`, `location`, `image`, `status` | `{ deletedAt: 1, status: 1, date: 1 }` |
| `facilities` | `Facility.js` | Campus infrastructure | `name`, `description`, `category`, `image`, `features`, `status` | `{ deletedAt: 1, status: 1 }` |
| `activities` | `Activity.js` | Co-curricular programs | `title`, `description`, `category`, `image`, `status` | `{ deletedAt: 1, status: 1 }` |
| `achievements` | `Achievement.js` | Student & school honors | `title`, `recipient`, `date`, `description`, `image`, `status` | `{ deletedAt: 1, status: 1 }` |
| `galleryimages` | `GalleryImage.js` | Media & photo gallery | `title`, `caption`, `category`, `url`, `publicId`, `status` | `{ deletedAt: 1, status: 1 }` |
| `sitesettings` | `SiteSettings.js` | Global school configuration | `schoolName`, `address`, `phone`, `email`, `heroTitle`, `heroImage`, `principal*`, `director*` | Standard `_id` |
| `pagecontents` | `PageContent.js` | Dynamic page text blocks | `pageKey`, `sections`, `seoTitle`, `seoDescription` | `{ pageKey: 1 }` (unique) |
| `contactmessages` | `ContactMessage.js` | Inbound visitor inquiries | `name`, `email`, `phone`, `subject`, `message`, `read`, `archived` | `{ createdAt: -1 }` |
| `activitylogs` | `ActivityLog.js` | Audit trail for actions | `action`, `resourceType`, `resourceId`, `userId`, `userEmail`, `meta` | `{ createdAt: -1 }`, `{ resourceType: 1, resourceId: 1 }` |
| `media` | `Media.js` | Cloudinary asset tracking | `url`, `publicId`, `originalName`, `mimeType`, `size`, `folder` | `{ createdAt: -1 }` |
| `facebooksyncs` | `FacebookSync.js` | Social import/publish logs | `kind`, `externalId`, `status`, `payload`, `error` | `{ kind: 1, createdAt: -1 }` |

---

## 5. REST API Route Directory

All routes are mounted under `/api/*` in `backend/src/server.js`.

### 5.1 Public Endpoints
* `GET /api/health` — Readiness probe (database connectivity status).
* `GET /api/site-settings` — Public school metadata (read-only; unsaved fallback).
* `GET /api/leadership` — Principal & Director public biographies and photos.
* `GET /api/notices` — Published notices list (supports pagination & category filters).
* `GET /api/notices/:id` — Detail view for a published notice.
* `GET /api/events` — Upcoming and past school events.
* `GET /api/events/:id` — Detail view for a specific event.
* `GET /api/facilities` — List of school facilities and equipment.
* `GET /api/activities` — Student clubs and co-curricular programs.
* `GET /api/achievements` — Academic, athletic, and cultural awards.
* `GET /api/gallery` — Photo gallery images (supports categories).
* `GET /api/page-content/:pageKey` — Dynamic copy for specific static pages.
* `POST /api/contact` — Inbound inquiry form submission (rate limited: 8/15min).

### 5.2 Authentication & Account Management
* `POST /api/auth/register` — Initial administrator bootstrap (closed once any user exists).
* `POST /api/auth/login` — Account authentication (returns signed JWT + permissions).
* `GET /api/auth/me` — Profile & permissions lookup for current session.
* `POST /api/auth/forgot-password` — Password reset link request (rate limited: 5/15min).
* `POST /api/auth/reset-password` — Password reset execution with single-use token.

### 5.3 Administrative Content Management (RBAC Enforced)
* `GET /api/:resource/admin/all` — All items including drafts, submitted, approved, and trashed.
* `POST /api/:resource` — Create new content draft.
* `GET /api/:resource/:id` — Fetch single record by ID.
* `PUT /api/:resource/:id` — Update existing content item (resets to draft if re-review required).
* `DELETE /api/:resource/:id` — Soft-delete item (moves to trash).
* `POST /api/:resource/:id/restore` — Restore item from trash.
* `DELETE /api/:resource/:id/permanent` — Permanently purge item and remove associated media.
* `POST /api/:resource/:id/submit` — Submit draft for review.
* `POST /api/:resource/:id/approve` — Approve submitted item (Admin only).
* `POST /api/:resource/:id/publish` — Publish approved item to live site.
* `POST /api/:resource/:id/unpublish` — Withdraw published item back to draft.
* `POST /api/:resource/admin/bulk-publish` — Bulk publish multiple approved items.
* `POST /api/:resource/admin/bulk-unpublish` — Bulk withdraw multiple published items.

### 5.4 Management Subsystems
* `GET /api/dashboard/stats` — Live counts (published, pending review, inquiries).
* `GET /api/inbox/queue` — Consolidated review queue across all content types.
* `GET /api/contact/messages` — Inbox of submitted contact messages.
* `PATCH /api/contact/messages/:id/read` — Mark message as read/unread.
* `POST /api/upload/image` — Upload image file to Cloudinary.
* `POST /api/attachments/upload` — Upload PDF/DOCX/ZIP attachment with magic signature verification.
* `GET /api/media` — Media library assets with pagination.
* `GET /api/activity-logs` — Audit trail entries with filtering.
* `GET /api/users` / `POST /api/users` / `PUT /api/users/:id` — Admin user management.
* `POST /api/integrations/facebook/publish` — Push notice or event to Facebook Page.
* `POST /api/ai/suggest` — Ephemeral AI text generator / copy editor.
* `POST /api/ai/apply` — Human-gated application of AI suggestions.

---

## 6. Security & Hardening Controls

1. **Authentication & Session Security:**
   * JWT tokens signed with SHA-256 (`HS256`) and a minimum 32-character secret key.
   * `authVersion` tracking forces immediate session termination across all devices upon password reset or role alteration.
   * Bcrypt.js with 10 salt rounds used for all stored password hashes.
   * Case-insensitive, whitespace-trimmed email normalization.
2. **Input Sanitization & Injection Defense:**
   * Universal sanitization middleware purges malicious MongoDB operators (`$`, `.`) from request payloads.
   * Regex inputs escaped using `escapeRegex` to prevent ReDoS.
   * Explicit URL protocol validator rejects `javascript:`, `data:`, or malformed URI schemes in all image and attachment fields.
3. **MIME & Magic-Number File Upload Verification:**
   * Media uploads are restricted by MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).
   * Document attachments (`.pdf`, `.docx`, `.zip`) are validated through header byte inspection (magic numbers), preventing renamed executables (`.exe` disguised as `.pdf`) from entering storage.
4. **Rate Limiting:**
   * Global API limiter: 300 requests per 15 minutes per IP.
   * Authentication limiter: 20 requests per 15 minutes per IP.
   * Contact inquiry limiter: 8 submissions per 15 minutes per IP.
   * Password reset limiter: 5 requests per 15 minutes per IP.
5. **CORS & HTTP Security Headers:**
   * Strict origin allowlist supporting local dev, production domains, and controlled Vercel previews.
   * Helmet middleware configured with Content Security Policy (CSP), anti-clickjacking (`X-Frame-Options: DENY`), and MIME-sniffing protection (`X-Content-Type-Options: nosniff`).

---

## 7. Verification & Automated Test Status

All automated suites are executed with zero external dependencies using in-memory databases and isolated test harnesses.

```
========================================================================
Test Suite                             Scope                Result
========================================================================
npm test (Phase 18C + Phase 21)        Unit & Regression    33/33 PASS
npm run test:foundation                Deployment Config    20/20 PASS
npm run test:rbac                      Authorization Smoke  ALL PASS
npm run test:phase20                   Bootstrap & Auth     52/52 PASS
npm run audit:content                  Content Scan         PASS (13 items flagged)
npm run lint (Frontend)                Oxlint (88 files)    0 Errors, 0 Warnings
npm run build (Frontend)               Vite Production      1.05s Clean Build
========================================================================
TOTAL AUTOMATED TEST VERIFICATIONS:    105+ Passed (100% Green)
========================================================================
```

---

## 8. Deployment & Operational Runbook

### 8.1 Backend Deployment (e.g. Render / Heroku / Container)
* **Configuration:** Defined in [`backend/render.yaml`](file:///C:/Users/Dell/OneDrive/Desktop/KMES%20FILES/kmes-school/backend/render.yaml).
* **Required Environment Variables:**
  * `NODE_ENV=production`
  * `PORT=5000`
  * `MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kmes`
  * `JWT_SECRET=<32+ random characters>`
  * `ALLOWED_ORIGINS=https://kmes-school.vercel.app,https://www.schooldomain.com`
  * `FRONTEND_URL=https://kmes-school.vercel.app`
  * `RESET_LINK_BASE=https://kmes-school.vercel.app`
  * `CLOUDINARY_CLOUD_NAME=<name>`
  * `CLOUDINARY_API_KEY=<key>`
  * `CLOUDINARY_API_SECRET=<secret>`
  * `EMAIL_PROVIDER=smtp`
  * `SMTP_HOST=<smtp.provider.com>`
  * `SMTP_PORT=587`
  * `SMTP_USER=<username>`
  * `SMTP_PASSWORD=<password>`

### 8.2 Frontend Deployment (Vercel)
* **Configuration:** Defined in [`frontend/vercel.json`](file:///C:/Users/Dell/OneDrive/Desktop/KMES%20FILES/kmes-school/frontend/vercel.json).
* **Required Build Environment Variable:**
  * `VITE_API_BASE_URL=https://<your-backend-api-domain>`

---

## 9. Content Audit Findings & Human Checklist

The content audit utility (`npm run audit:content`) identified 13 placeholder or test records currently stored in the school database:

| Category | Record / Identifier | Issue Detected | Action Required by Administrator |
|---|---|---|---|
| **Site Settings** | Global Settings | `phone: "+977-XXXXXXXXXX"` | Update with real school office phone in Admin → Site Settings |
| **Site Settings** | Global Settings | `heroImage` uses Unsplash stock photo | Upload real school campus banner photo |
| **Events** | "Annual Sports Day" | Description has placeholder text | Update event description with actual program schedule |
| **Events** | "Annual Sports Day" | Image uses Unsplash stock photo | Upload genuine photo from school sports meet |
| **Facilities** | "Classrooms" | Description has placeholder text; missing image | Add real description and photograph of classrooms |
| **Facilities** | "Library" | Description has placeholder text; missing image | Add real description and photograph of library |
| **Facilities** | "Computer Lab" | Description has placeholder text; missing image | Add real description and photograph of computer lab |
| **Achievements** | "School Achievement" | Description has placeholder text | Enter real academic/extracurricular achievement record |
| **Gallery** | "Campus View" | Uses Unsplash stock photo | Replace with actual high-resolution campus photo |
| **Users** | `test.editor.phase4@kmes.edu.np` | Leftover test editor account | Delete from Admin → Users if no longer in use |

---

## 10. Repository Git Log (1st to Last)

```
234206b chore: initial commit of KMES school website
3308fb2 feat: harden production authentication and health checks
36e9e27 docs: add Phase 18B report
1bf21d1 feat: establish production deployment foundation
363bb6c feat: establish staging environment foundation
a681efa chore: bump qs to fix audit advisory
caf15b7 fix: guard admin dashboard against missing fields for editor role
383b766 feat: complete Phase 18C production readiness
51d753b docs: add Phase 19 production verification report
abaa5b0 feat: harden first-admin bootstrap and enable smtp email
897c7d2 feat: complete final production verification
d29090a docs: record final read-only re-verification and operator handoff
c604a19 fix: clean frontend lint and settings context
ad83f07 chore: sync backend package-lock engine metadata
fa45077 feat: add forgot and reset password UI with email workflow
3cbb8c3 fix(cors): permit kmes-school vercel deployment origins
939be8d fix(api): return 400 Bad Request for malformed resource IDs (CastError)
338ec27 feat(seo): add robots.txt and sitemap.xml for production indexing
a96f097 fix(assets): replace broken Unsplash image URLs to eliminate CORB warnings
074b5e1 feat(cms): unify dynamic site settings and automatic updates across public pages
b73837d feat(leadership): add photo upload, admin leadership management, and resolve login form & csp audit issues
4a01eda fix(accessibility): add unique id and name attributes across all admin and public form fields
9b49778 fix(review): remediate backend security/stability defects and frontend live-data integration (Phase 21)
e63ac55 fix(lint): remove unused imports and refactor loadData in LeadershipManager
2b249b3 feat(audit): fall back to offline backup snapshot when MongoDB connection is unavailable
```

---

*End of Comprehensive Project Documentation. All tests green, tree clean, and synchronized with remote main.*
