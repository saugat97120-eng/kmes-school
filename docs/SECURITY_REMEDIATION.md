# KMES Security Remediation & Release Notes

This document describes the code changes made to the uploaded KMES project. It does not claim that the live deployment has been changed; the updated source must be reviewed, tested, and deployed by an authorized project maintainer.

## Changes in this update

### 1. Clerk authentication and authorization

- `/api/auth/clerk-sync` now requires a Clerk session verified by `clerkMiddleware`.
- The backend fetches the Clerk profile using the server-side Clerk SDK. Email and name values sent by the browser are no longer trusted.
- The primary email must be verified.
- Clerk sign-in can link only to an existing KMES user record with the same verified email, or use an already-linked Clerk user ID.
- A Clerk sign-in can no longer create an administrator or assign a role based on the first user, a hardcoded email, or an untrusted request body.
- Protected API requests using Clerk require a matching `clerkUserId` in the KMES users collection. The database role is authoritative.

**First Clerk sign-in after deployment:** each staff account must already exist in the KMES `users` collection with the same email address. The primary email in Clerk must be verified. The first successful sign-in links the Clerk user ID to that existing record. If an account is not provisioned, it is denied access until an authorized administrator creates it through the normal KMES account-provisioning process.

### 2. Password-reset handling

- Removed reset-link, raw-token, and recipient logging from the forgot-password route.
- Provider errors for reset delivery are logged only as a generic failure; provider messages can contain request details and are not written to logs.
- Requests for unregistered email addresses are no longer logged with the submitted email address.
- In production, `EMAIL_PROVIDER=mock` and `EMAIL_PROVIDER=none` now fail startup. Production must use `resend` or `smtp`, so reset links are delivered through a real provider rather than printed to logs or silently discarded.

### 3. Admissions inquiry

- The admissions form now submits to `/api/contact/admissions`.
- The backend validates an explicit set of fields, applies the existing public inquiry rate limit, and generates the tracking reference on the server.
- The inquiry is stored in the existing admin messages inbox, preserving the current staff workflow.
- Parent/guardian email is optional and is no longer replaced with a school administrator's email address.
- The page clarifies that an inquiry receipt is not a confirmed admission or seat reservation.

### 4. Security headers

- The backend API now sends a restrictive API Content Security Policy (`default-src 'none'`, no frames, objects, forms, or base URI) through Helmet.
- The Vercel and static-host frontend CSP no longer permits `unsafe-eval` or inline scripts. Inline styles remain allowed for compatibility with the current Tailwind/React UI.

## Required production environment configuration

Set these values in the hosting provider's environment settings, not in committed files:

- `NODE_ENV=production`
- `MONGODB_URI` for the production database, using a dedicated least-privilege database user and TLS
- `JWT_SECRET` with at least 32 characters of cryptographically random material
- `CLERK_SECRET_KEY` on the backend only; `VITE_CLERK_PUBLISHABLE_KEY` is the public frontend key
- `ALLOWED_ORIGINS` with only the exact production website origin(s)
- `ALLOW_VERCEL_PREVIEWS=false` (default; only enable temporarily in a trusted non-production environment)
- `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`, or `EMAIL_PROVIDER=smtp` with the required SMTP settings
- `VITE_API_BASE_URL` on Vercel, set to the deployed backend API base URL expected by the frontend
- `VITE_CLERK_PUBLISHABLE_KEY` on Vercel, using the matching Clerk instance/environment

Do not put backend secrets in any `VITE_*` variable. Vite embeds `VITE_*` values into browser assets.

## Secret exposure response

The uploaded project archive contained local environment files. The cleaned maintenance archive excludes real `.env` files and includes only `.env.example` templates. If any key from an uploaded environment file is also used in a live environment, rotate it before deploying this code: Clerk secret key, JWT secret, MongoDB credentials, Resend/SMTP credentials, Cloudinary credentials, R2 credentials, Facebook tokens, and AI provider keys. Update the hosting provider's secret store after rotation.

Also ensure `.env*` files (except `.env.example`) and database backups remain excluded from Git and future ZIP archives. Check repository history separately if any real secret was ever committed; deleting a current file does not remove it from Git history.

## Verification status for this maintenance update

- Backend source syntax: checked with `node --check` across backend source and test files.
- Backend offline unit tests: 41 passed, 0 failed.
- Deployment foundation tests: 20 passed, 0 failed.
- RBAC smoke tests: passed.
- MongoDB integration/regression tests: not run to completion because `mongodb-memory-server` could not download its MongoDB binary in the isolated environment. Run them on a machine/CI runner with the MongoDB test binary available or set `TEST_MONGODB_URI` to a disposable test database.
- Frontend lint/build: not completed because the uploaded `node_modules` contains Windows-only Oxlint/Rolldown native bindings, not Linux binaries. Run `npm ci` in `frontend` on the target OS, then `npm run lint` and `npm run build`.
- Live device/browser checks and live penetration testing: not performed.

## Release checklist

1. Rotate any exposed production secrets.
2. Provision and verify each KMES staff user before Clerk login.
3. Configure a real production email provider.
4. Set exact CORS origins and disable unneeded Vercel previews.
5. Run backend integration tests against a disposable database.
6. Run frontend `npm ci`, lint, and build on a clean environment.
7. Deploy to staging first and test admin login, admissions submission, inbox visibility, password reset email delivery, uploads, and all public pages.
8. Verify phone, tablet, laptop, and desktop layouts in real browsers.
9. Deploy production only after staging sign-off and a verified database backup.
