# Phase 20 — Production Auth Hardening + First Admin + SMTP Email

End-to-end report for the KMES School production-readiness Phase 20 work item:
a secure, operator-controlled **first-admin bootstrap** and production
**SMTP email** support, layered on the existing authentication/JWT/RBAC
foundations from Phases 18B/18C.

---

## 1. Objective

1. **First-admin bootstrap** — replace the legacy "registration is open while
   the user collection is empty" rule with a hardened, operator-gated
   bootstrap. Public registration may create the first account **only** when an
   explicit flag is on, the authorized email matches, and the database has zero
   users — and exactly one admin can ever be created, even under concurrency.
2. **SMTP email** — real production password-reset and security-notification
   delivery via the existing route → `emailService` → adapter → provider
   layering, with `EMAIL_PROVIDER=mock|smtp` selection and mandatory SMTP
   configuration checks at boot (no silent mock fallback in production).
3. **No regressions** — normal login, JWT/authVersion invalidation, forgot /
   reset-password generic masking, and RBAC are preserved.

---

## 2. First-admin bootstrap

### 2.1 New contract

`POST /api/auth/register` now creates a user only when **all** of these hold:

| Condition | Source |
|---|---|
| `ALLOW_ADMIN_BOOTSTRAP === "true"` (literal) | env |
| database has **zero** users | DB |
| normalized submitted email === normalized `ADMIN_BOOTSTRAP_EMAIL` | env + payload |
| payload passes express-validator (`name`, `email`, `password ≥ 6`) | route |

Any other request returns the **identical** generic `403`:

```json
{ "success": false, "message": "Registration is temporarily unavailable." }
```

This single message hides flag-on/off, authorized vs authorized, users-exist vs
empty — no enumeration oracle.

### 2.2 Strict flag parsing

`env.js` parses `ALLOW_ADMIN_BOOTSTRAP` with `parseStrictBool` — only the exact
string `"true"` enables bootstrap. `"1"`, `"yes"`, `"TRUE"`, or anything else
all count as **off**. A typo in production therefore never accidentally opens
registration.

### 2.3 Email authorization

`ADMIN_BOOTSTRAP_EMAIL` defaults to `saugatb40@gmail.com` via `env.js` (the
email is **not** hard-coded in route logic). `isAuthorizedBootstrapEmail()`
(normalized to lowercase + trimmed) compares the request email to the
configured value, so `SaugatB40@GMAIL.COM` matches. The email is also stored
lowercased by the User schema (`lowercase: true`).

### 2.4 Concurrency safety (exactly one admin)

`tryAcquireBootstrapLock()` in `backend/src/utils/adminBootstrap.js` uses a
dedicated MongoDB collection `admin_bootstrap_locks` with a **unique index** on
`{ key: 1 }`:

1. `insertOne({ key: "admin-bootstrap" })` — the first concurrent request wins;
   a duplicate key (Mongo error code `11000`) loses and immediately returns the
   generic `403`.
2. Winner re-checks `countDocuments() === 0` **after** acquiring the lock
   (eliminating the classic count-then-create race).
3. Winner creates the first user with a **forced** `role: "admin"` (client-sent
   roles are ignored).
4. On success the lock document **stays** — the one-time open window is closed
   forever, even if the flag is later re-enabled.
5. On failure the lock is released best-effort so an empty-DB retry can still
   work.

### 2.5 Closure after first admin

Once ≥ 1 user exists, `POST /api/auth/register` returns the generic `403` for
**every** email — including the bootstrap email — even with the flag still on.
Additional accounts are created only by an existing admin via `/api/users`.

### 2.6 Requirements traceability

| # | Assertion | Where |
|---|---|---|
| 1 | bootstrap disabled by default (flag unset → false, register 403) | unit + integration |
| 2 | flag `"true"` or unset + authorized email on an empty DB → 201, exactly one admin | bootstrap harness |
| 3 | wrong email → 403 generic | unit + integration |
| 4 | case-insensitive email match (`SaugatB40@GMAIL.COM`) | unit + integration |
| 5 | after first admin exists → 403 even with flag on + auth email | bootstrap harness |
| 6 | after first admin exists → 403 for non-auth email | bootstrap harness |
| 7 | flag off → 403 generic (no user created) | unit + integration |
| 8 | `"1"` → treated as off | unit |
| 9 | `"yes"` → treated as off | unit |
| 10 | `"TRUE"` → treated as off | unit |
| 11 | 6 concurrent requests → exactly one 201, N-1 × 403, one admin row | bootstrap harness |

---

## 3. SMTP email

### 3.1 Provider model

`EMAIL_PROVIDER` supports `mock` (default, in-memory), `smtp` (real Nodemailer
delivery), and `none` (explicit safe no-op, retained for back-compat with
pre-existing tests). Any other value **fails startup predictably** — there is no
silent fallback, and an SMTP configuration can never silently degrade to mock in
production.

- `selectEmailProvider()` — resolves the provider from the live environment.
- `assertEmailProviderConfiguration()` — called once at server boot; throws when
  the provider is unsupported or when `EMAIL_PROVIDER=smtp` but
  `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` are missing.

### 3.2 SMTP variables

| Variable | Default | Notes |
|---|---|---|
| `SMTP_HOST` | (required for smtp) | server |
| `SMTP_PORT` | `587` | `465` implies implicit TLS |
| `SMTP_SECURE` | `false` | true → implicit TLS |
| `SMTP_USER` | (required for smtp) | auth user |
| `SMTP_PASSWORD` | (required for smtp) | primary credential |
| `SMTP_PASS` | back-compat alias | legacy tests set this |
| `EMAIL_FROM` | falls back to SMTP_USER | sender address |
| `EMAIL_FROM_NAME` | `Kaseni Model Secondary English School` | sender display name |

`SMTP_PASSWORD` is treated as a secret: it lives only in the platform's secret
environment store, never in source, `.env.example`, logs, or the config
snapshot.

### 3.3 Adapters (`backend/src/integrations/email/`)

- `emailAdapter.js` — `MockEmailAdapter` + `NoopEmailAdapter`; both now expose
  `sendSecurityNotification()`. Mock records security notifications separately
  from password-reset deliveries so counts stay unambiguous.
- `smtpEmailAdapter.js` — `SmtpEmailAdapter` with `SMTP_PASSWORD`/`SMTP_PASS`
  resolution, `SMTP_SECURE`, `EMAIL_FROM_NAME` default, and
  `sendSecurityNotification()`. `assertConfigured()` and transport setup throw
  cleanly before network I/O and never in error messages contain credentials.
- `emailService.js` — facade: provider selection + boot assert +
  `sendPasswordReset()` + `sendSecurityNotification()`.

### 3.4 Integrations

- **forgot-password** — unchanged semantics: generic 200 response, token hash
  stored, 1h expiry, raw token never logged/returned. SMTP failures are caught
  and still return the generic response (no leak, no crash).
- **reset-password** — after a successful reset a **best-effort security
  notification** email is sent to the account (no token/password content;
  failure never fails the reset). The reset itself keeps hash clearing,
  single-use, and `bumpAuthVersion` invalidation.
- **REST / login** — unchanged: no email verification, no 2FA this phase.

### 3.5 Requirements traceability

| # | Assertion | Where |
|---|---|---|
| 12 | `mock` adapter selected by default / `none` → no-op | unit |
| 13 | `smtp` value → SmtpEmailAdapter | unit |
| 14 | unsupported provider → boot failure (clear error) | unit |
| 15 | `smtp` without SMTP_HOST → config error at boot | unit + integration |
| 16 | `smtp` without SMTP_PASSWORD → config error at boot | unit |
| 17 | forgot-password for existing account delivers via the active adapter | integration |
| 18 | reset link built from `RESET_LINK_BASE` | unit + foundation |
| 19 | no raw token/password anywhere in API responses | unit + integration |
| 20 | no raw token echoed by forgot/reset response | integration |
| 21 | security notification carries no token/password | integration |
| 22 | SMTP failure → still generic response, no delivery, no leak | integration/regression |
| 23 | reset token single-use | integration |
| 24 | expired reset token rejected | regression (existing) |
| 25 | forgot/reset flow + generic masking preserved | regression |

---

## 4. Authentication & RBAC regression

Unchanged and re-verified:

- Login → JWT (7d) with `authVersion` in claims.
- `/api/auth/me` → current role + effective permissions.
- `/api/users` is gated by `requireAuth` + `requirePermission(PERMISSIONS.USERS_MANAGE)`
  (role resolved from DB, not stale JWT).
- Reset bumps `authVersion` → previously issued JWTs for that user return 401.
- RBAC smoke suite (admin vs editor) passes.

---

## 5. Files changed by this phase

| File | Change |
|---|---|
| `backend/src/config/env.js` | `allowAdminBootstrap` (strict `true`), `adminBootstrapEmail`, `smtpPassword`, `smtpSecure`, production validation additions |
| `backend/src/utils/adminBootstrap.js` | **new** — normalizeEmail, isAuthorizedBootstrapEmail, GENERIC_REGISTRATION_DENIED, unique-lock acquire/release |
| `backend/src/routes/auth.routes.js` | hardened register (bootstrap contract, 403 generic, forced admin, concurrency lock); security notification after reset |
| `backend/src/integrations/email/emailService.js` | `selectEmailProvider`, `assertEmailProviderConfiguration`, `sendSecurityNotification` |
| `backend/src/integrations/email/emailAdapter.js` | `sendSecurityNotification` on Mock + Noop; `clear()` also resets security notifications |
| `backend/src/integrations/email/smtpEmailAdapter.js` | `SMTP_PASSWORD`/`SMTP_PASS`, `SMTP_SECURE`, from-name default, `sendSecurityNotification` |
| `backend/src/server.js` | `assertEmailProviderConfiguration()` at boot |
| `backend/.env.example` | bootstrap + SMTP placeholders |
| `backend/render.yaml` | bootstrap env (flag off, email) + `SMTP_SECURE`/`SMTP_PASSWORD` names |
| `docs/DEPLOYMENT.md` | env table, admin bootstrap section, SMTP refresh |
| `backend/tests/phase-20.unit.mjs` | **new** bootstrap/SMTP unit tests |
| `backend/tests/phase-20.integration.mjs` | **new** registration-closure + auth/RBAC/reset integration |
| `backend/tests/phase-20.bootstrap.mjs` | **new** empty-DB concurrency-bounded bootstrap harness |
| `backend/package.json` | `test:phase20` script |

No production password, `JWT_SECRET`, MongoDB URI, or SMTP secret is tracked in
any of these files.

---

## 6. Production configuration (final)

Set these in the Render service's Environment tab (secrets via the secure value
editor):

```
NODE_ENV=production
MONGODB_URI=<prod Atlas URI>
JWT_SECRET=<long random>
ALLOWED_ORIGINS=https://kmes-school.vercel.app
RESET_LINK_BASE=https://kmes-school.vercel.app
TRUST_PROXY=1
ALLOW_ADMIN_BOOTSTRAP=false
ADMIN_BOOTSTRAP_EMAIL=saugatb40@gmail.com
EMAIL_PROVIDER=smtp
SMTP_HOST=<provider relay>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<relay user>
SMTP_PASSWORD=<relay secret>
EMAIL_FROM=<sender address>
EMAIL_FROM_NAME=Kaseni Model Secondary English School
```

`SMTP_PASSWORD` (and `MONGODB_URI`, `JWT_SECRET`) must be entered through the
secure environment store and never committed to `git`.

---

## 7. First-admin provisioning sequence (operator)

1. **Deploy Phase 20 code.** Confirm `POST /api/auth/register` returns the
   generic `403` (`ALLOW_ADMIN_BOOTSTRAP=false` by default).
2. **Remove the residual operator-flagged test account**
   (`6a9bd536517cf52838416563`, the inert `phase19-probe` admin created during
   Phase 19 live verification). This is a manual MongoDB operator action — it is
   intentionally **never** performed by application code.
3. Confirm the `users` collection now has **zero** documents.
4. Temporarily set `ALLOW_ADMIN_BOOTSTRAP=true` in Render and redeploy.
5. Create the real admin with an operator-entered password (never in source /
   docs / git / tests):
   ```bash
   curl -X POST https://kmes-school.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Kaseni Administrator","email":"saugatb40@gmail.com","password":"<operator-entered>"}'
   ```
6. Verify `201` returns an admin token; log into the dashboard.
7. Set `ALLOW_ADMIN_BOOTSTRAP=false` and redeploy.
8. Verify a second `register` returns the generic `403` and the admin login still
   works.

---

## 8. SMTP acceptance status

| Area | Status |
|---|---|
| SMTP implementation (adapter, config assert, security notification) | **PASS** (automated + code review) |
| SMTP provider selection + boot-time config failure | **PASS** |
| Forgot/reset flow over mock adapter | **PASS** |
| Live SMTP configuration on the Render service | **NOT TESTED** (no real relay credentials available in this environment) |
| Real email delivery end-to-end | **NOT TESTED** (no real relay credentials) |

Once real relay credentials are provisioned by the operator, verify with a single
forgot-password email to the admin address and confirm delivery + reset link.

---

## 9. Regression

- **Phase 20 unit:** `tests/phase-20.unit.mjs` — 20 PASS
- **Phase 20 integration:** `tests/phase-20.integration.mjs` — 20 PASS
- **Phase 20 bootstrap harness:** `tests/phase-20.bootstrap.mjs` — 12 PASS
  (concurrency-bounded: 6 parallel requests → exactly one 201)
- **Phase 18C unit:** 40 PASS; **Phase 18C integration:** 38 PASS
- **Foundation:** 20 PASS; **RBAC smoke:** PASS
- **Legacy regression harnesses (phase6–9, phase10-11, phase18b):** 50 + 42 + 38
  + 47 + 65 + 36 = **278 PASS**, 0 FAIL (harnesses updated to the Phase 20
  bootstrap contract)
- **Backend syntax (`node --check`):** PASS (68 source files)
- **Frontend lint:** 0 errors / 8 warnings; **build:** PASS
- **npm audit (backend):** 0 known vulnerabilities

---

## 10. Security notes

- Only the literal `"true"` enables bootstrap; everything else is off.
- The generic `403` is identical across all denial causes (no oracle).
- The bootstrap lock is unique-indexed in MongoDB, surviving concurrent
  requests; it is permanent after the first success.
- SMTP misconfiguration cannot silently fall back to mock in production —
  startup fails with a clear, credential-free message.
- No raw tokens, passwords, or SMTP secrets are ever logged, stored, or
  returned. Security-notification content contains no secrets.
- The residual Phase 19 test admin must be deleted by the operator (Section 7,
  step 2) — the code deliberately never auto-deletes accounts.

---

## 11. Future work / left for later

- Real SMTP credentials + `EMAIL_PROVIDER=smtp` on Render, then an end-to-end
  delivery check.
- Optional: rate-limit already present on `/api/auth`; consider per-route
  hardened limits for register/reset if abuse is observed.
- Candidate for future phases: email verification, 2FA, and account lockout —
  explicitly **out of scope** for this phase (login unchanged).