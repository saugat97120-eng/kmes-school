# Phase 21 - Remediation of the project review

Every item below was verified against the real code first; the review document
marked several as "fixed" that were not present. Items already fixed by Phase 20
(first-admin race, forgot-password delivery failures, SMTP) were left untouched.

## Backend
| Defect | Fix |
|---|---|
| `cloudinary.js` used `dotenv` with `override: true` and `env.js` read `process.env` before dotenv ran | New `config/loadEnv.js` (no override) is the first import of `server.js` and `cloudinary.js` |
| Bulk unpublish threw `TypeError` (500) | `results.unpublished` initialised |
| Contact form passed `req.body` to the model; no limits; no rate limit | Field allow-list, length limits (schema + validator), 8 msgs / 15 min / IP, minimal response |
| Mongoose validation / duplicate-key / bad regex returned 500 | 400 / 409 mapping; `escapeRegex` for admin and media search |
| `javascript:` and other non-http URLs stored in image / attachment fields | `prepareBody` validates `image`, `src`, `certificateUrl`, `attachmentUrl`, attachment urls |
| Blank date stored as null (shown as 1970) | Blank dates are omitted |
| Attachment upload returned `_id: undefined`; saving the form dropped `publicId` / `resourceType` | Real subdocument id returned; submitted attachments that match an existing `_id` are replaced by the server record |
| Attachment add/remove on live content bypassed re-review | Resets non-draft content to draft (same rule as edits) |
| Filename-derived Cloudinary public ids; no cleanup on failed DB write / permanent delete | Safe names; best-effort cleanup (`utils/cloudinaryCleanup.js`) |
| Documents only checked by extension + MIME | PDF / OLE / ZIP content signature check |
| Public `GET /api/site-settings` and `/api/leadership` inserted documents | Read-only; unsaved defaults returned. Fake default phone removed |
| Admin could set 1-char password / invalid email; duplicate email -> 500; sessions survived password/role change | Validated; 409; `authVersion` bumped |
| Login case-sensitive, accepted non-string password | Normalised; validated |
| Production could run without `JWT_SECRET` | Refuses to start (< 32 chars) |
| CORS wildcard `kmes-school.*` | Tightened regex, can be disabled with `ALLOW_VERCEL_PREVIEWS=false` |
| Integration tests only ran on one Windows machine, hid `.env` and left it renamed on crash | Portable paths, no `.env` hack, `tests/helpers/mongo.mjs`; CI runs them |

Regression coverage: `backend/tests/phase-21.regression.mjs` (33 checks).

## Frontend
* Homepage notices/events/gallery/facilities/activities/achievements load live data (demo arrays and their dead `/notices/demo-1` links removed); empty optional sections are hidden.
* Cards link with `_id`, format dates, lazy-load images and fall back when an image is missing.
* Placeholder phone/email are hidden (`utils/format.js`); contact form blocks double submit and has field limits.
* Single `config.js` for the API URL (no silent localhost fallback in production).
* Admin: mobile navigation drawer, readable validation errors, redirect on expired session, crash-proof uploads, image upload state, `required` on image URL, label association, blank-date handling, bulk-publish skip feedback, Media Library "Load more", Site Settings no longer writes on page view, per-resource state (`key`).
* Scroll-to-top on navigation, keyboard-accessible nav dropdowns, CSP + Permissions-Policy + asset caching headers (`vercel.json`), meta description / Open Graph tags.

## Needs a human (cannot be fixed in code)
1. **Rotate the Cloudinary API secret** (it was printed in a chat transcript) and make sure no `.env` or `backup/` folder is shared.
2. **Confirm the production domain** (`kmes-school.vercel.app` vs `kmes-school-xi.vercel.app`) and align `ALLOWED_ORIGINS`, `FRONTEND_URL`, `RESET_LINK_BASE` (render.yaml still lists an old preview URL) and `public/sitemap.xml` / `robots.txt`. Then set `ALLOW_VERCEL_PREVIEWS=false`.
3. Run `npm run audit:content` (backend) against the live database and fix what it lists: placeholder phone, "to be confirmed" items, stock Unsplash photos, leftover test accounts, duplicate settings.
4. Enter the school's real phone, email and leadership details in Admin -> Site Settings / Leadership.
5. Set `VITE_API_BASE_URL` in Vercel (production builds now log an error if it is missing).

## Not changed on purpose
Password minimum stays 6 (documented policy, enforced consistently); consider raising it to 8+.
