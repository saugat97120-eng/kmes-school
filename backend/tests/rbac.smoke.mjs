// Temporary Phase 6 authorization smoke test. Runs offline (no DB writes).
// Verifies the central permission matrix and middleware gating logic.
import assert from "node:assert";
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  roleHasPermission,
  PERMISSIONS,
} from "../src/permissions.js";
import { requireRole } from "../src/middleware/roles.js";

const ADMIN = "admin";
const EDITOR = "editor";

// --- Matrix integrity ---
assert.ok(ROLE_PERMISSIONS.admin.length > 0, "admin has permissions");
// Admin should hold every defined permission (full administrative authority).
for (const p of Object.values(PERMISSIONS)) {
  assert.ok(roleHasPermission(ADMIN, p), `admin lacks ${p}`);
}

// Editor baseline: create/view/edit/submit/upload/messages/trash-view.
const editorGrants = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.CONTENT_VIEW,
  PERMISSIONS.CONTENT_CREATE,
  PERMISSIONS.CONTENT_EDIT,
  PERMISSIONS.CONTENT_SUBMIT,
  PERMISSIONS.CONTENT_DELETE,
  PERMISSIONS.MEDIA_VIEW,
  PERMISSIONS.MEDIA_UPLOAD,
  PERMISSIONS.ATTACHMENTS_UPLOAD,
  PERMISSIONS.ATTACHMENTS_DELETE,
  PERMISSIONS.MESSAGES_VIEW,
  PERMISSIONS.TRASH_VIEW,
];
for (const p of editorGrants) {
  assert.ok(roleHasPermission(EDITOR, p), `editor lacks ${p}`);
}

// Editor MUST NOT hold publish/approve/review/unpublish/reject/users/settings/
// activity-logs/social/permanent-delete permissions.
const editorDenied = [
  PERMISSIONS.CONTENT_PUBLISH,
  PERMISSIONS.CONTENT_UNPUBLISH,
  PERMISSIONS.CONTENT_APPROVE,
  PERMISSIONS.CONTENT_REVIEW,
  PERMISSIONS.CONTENT_REJECT,
  PERMISSIONS.CONTENT_PERMANENT_DELETE,
  PERMISSIONS.CONTENT_RESTORE,
  PERMISSIONS.MEDIA_DELETE,
  PERMISSIONS.PAGES_VIEW,
  PERMISSIONS.PAGES_EDIT,
  PERMISSIONS.MESSAGES_MANAGE,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_EDIT,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.TRASH_RESTORE,
  PERMISSIONS.TRASH_DELETE,
  PERMISSIONS.ACTIVITY_LOGS_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT,
  PERMISSIONS.SOCIAL_MANAGE,
  PERMISSIONS.SOCIAL_PUBLISH,
];
for (const p of editorDenied) {
  assert.ok(!roleHasPermission(EDITOR, p), `editor should NOT hold ${p}`);
}

// Unknown role -> no permissions.
assert.deepStrictEqual(getPermissionsForRole("super_user"), [], "unknown role has no permissions");

// --- Middleware: requireRole gating ---
function invoke(middleware, req) {
  return new Promise((resolve) => {
    let status = null;
    let body = null;
    middleware(req, {
      status: (s) => ({ json: (b) => { status = s; body = b; resolve({ status, body }); } }),
    }, () => resolve({ status: "next" }));
  });
}

function jwtUser(role) {
  return { id: "u1", role, name: "Tester" };
}

const adminGate = requireRole(ADMIN);

// Unauthenticated -> 401
let r = await invoke(adminGate, {});
assert.strictEqual(r.status, 401, "no user => 401");
assert.match(r.body.message, /Authentication required/i);

// Editor on an admin gate -> 403
r = await invoke(adminGate, { user: jwtUser(EDITOR) });
assert.strictEqual(r.status, 403, "editor on admin gate => 403");
assert.match(r.body.message, /permission to perform this action/i);

// Admin passes -> next
r = await invoke(adminGate, { user: jwtUser(ADMIN) });
assert.strictEqual(r.status, "next", "admin passes admin gate");

console.log("ALL AUTHORIZATION SMOKE TESTS PASSED");