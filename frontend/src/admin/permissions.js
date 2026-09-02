// Frontend permission definitions.
//
// Security authority is the BACKEND. The backend returns an authoritative
// `permissions[]` array via POST /api/auth/login, POST /api/auth/register and
// GET /api/auth/me. This file provides:
//   1. A human-friendly mapping of the backend permission names (used by UI
//      components so we don't scatter magic strings).
//   2. A STATIC FALLBACK role -> permission map used ONLY so the UI can render
//      correctly before/around the /auth/me call or for pre-existing sessions
//      that predate the permissions array.
//
// UI permission checks are UX controls, NOT security controls — the backend
// enforces authorization on every protected endpoint regardless of this file.
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

  // Phase 10: AI content preparation
  AI_VIEW: "ai.view",
  AI_USE: "ai.use",
  AI_MANAGE: "ai.manage",
};

// Static fallback, mirroring the backend matrix. Used only when the session
// lacks an explicit permissions array (e.g. old sessions).
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
    // Phase 10: editors may use AI assistance (suggestions only; apply requires
    // content.edit which editors hold for their own content).
    PERMISSIONS.AI_VIEW,
    PERMISSIONS.AI_USE,
  ],
};
