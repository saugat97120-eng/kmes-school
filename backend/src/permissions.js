// Central, authoritative permission definition for the KMES backend.
//
// Permissions are derived from a user's role (Model A). Roles are defined in
// the User model ("admin" | "editor"). Effective permissions are computed here
// and exposed via /api/auth/me so the frontend consumes the SAME definition
// instead of maintaining a second, drifting copy.
//
// Phase 6 scope:
//   - WHO may perform an operation (permissions).
//   - Content workflow state transitions are deliberately NOT modelled here
//     (that is Phase 7 scope).

// Every permission used in the system. Keep this list in sync with the routes
// that call requirePermission(...).
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  CONTENT_VIEW: "content.view",
  CONTENT_CREATE: "content.create",
  CONTENT_EDIT: "content.edit",
  CONTENT_SUBMIT: "content.submit",
  CONTENT_REVIEW: "content.review",
  CONTENT_APPROVE: "content.approve",
  CONTENT_PUBLISH: "content.publish",
  CONTENT_UNPUBLISH: "content.unpublish",
  CONTENT_REJECT: "content.reject",
  CONTENT_DELETE: "content.delete",
  CONTENT_RESTORE: "content.restore",
  CONTENT_PERMANENT_DELETE: "content.permanent_delete",

  MEDIA_VIEW: "media.view",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_EDIT: "media.edit",
  MEDIA_DELETE: "media.delete",

  ATTACHMENTS_UPLOAD: "attachments.upload",
  ATTACHMENTS_DELETE: "attachments.delete",

  PAGES_VIEW: "pages.view",
  PAGES_EDIT: "pages.edit",

  MESSAGES_VIEW: "messages.view",
  MESSAGES_MANAGE: "messages.manage",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DISABLE: "users.disable",
  USERS_DELETE: "users.delete",
  USERS_MANAGE: "users.manage",

  TRASH_VIEW: "trash.view",
  TRASH_RESTORE: "trash.restore",
  TRASH_DELETE: "trash.delete",

  ACTIVITY_LOGS_VIEW: "activity_logs.view",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  SOCIAL_VIEW: "social.view",
  SOCIAL_MANAGE: "social.manage",
  SOCIAL_IMPORT: "social.import",
  SOCIAL_REVIEW: "social.review",
  SOCIAL_PUBLISH: "social.publish",

  // Phase 10: AI content preparation.
  // AI_VIEW  — see AI status/availability.
  // AI_USE   — request AI suggestions + apply them to content (human-explained).
  // AI_MANAGE — view/manage AI configuration.
  AI_VIEW: "ai.view",
  AI_USE: "ai.use",
  AI_MANAGE: "ai.manage",
};

// Role -> permission matrix (Model A: role-derived permissions).
//
// Governance model:
//   Editor:  create, view, edit, submit, upload
//   Admin:   review, approve, publish, unpublish, reject, destructive admin
//
// Deletion: editors MAY move their own content to trash (content.delete /
// bulk-trash), but permanent deletion (content.permanent_delete / trash.delete)
// is admin-only. Editors may delete attachments they manage (attachments.delete).
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),

  editor: [
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

    // Phase 10: editors may use AI as an authoring/editing assistant for the
    // content they create (suggestions only — human apply is mandatory, and the
    // backend re-checks content edit permission at apply time). They do NOT get
    // ai.manage (configuration/status administration is admin-only).
    PERMISSIONS.AI_VIEW,
    PERMISSIONS.AI_USE,
  ],
};

// Effective permission list for a role.
export function getPermissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

// Whether a role holds a specific permission.
export function roleHasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

// True when the permission has an admin-context requirement (used by the
// frontend to decide whether a generic role is sufficient, and for docs).
export function requiresAdmin(permission) {
  return !roleHasPermission("editor", permission);
}
