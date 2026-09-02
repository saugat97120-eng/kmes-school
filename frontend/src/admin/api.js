// Small fetch wrapper for the admin dashboard.
// Stores the JWT in localStorage — fine for this school CMS use case,
// where the only "users" are trusted staff/admin accounts.
import { PERMISSIONS, ROLE_PERMISSIONS } from "./permissions";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TOKEN_KEY = "kmes_admin_token";
const USER_KEY = "kmes_admin_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

// Refresh the stored user from the authoritative /auth/me endpoint. Keeps the
// local role/permission snapshot in sync with the backend (e.g. after a role
// change). No-op when not logged in. On 401 the request helper clears the
// session automatically.
export async function refreshSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await api.getMe();
    const user = res?.data;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export const api = {
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Authoritative authorization payload from the backend. The frontend stores
  // this role+permissions snapshot; the backend remains the security authority.
  getMe: () => request("/api/auth/me"),

  // params: { q, status, page, limit }
  getAll: (resource, params) => request(`/api/${resource}/admin/all${qs(params)}`),
  getTrash: (resource) => request(`/api/${resource}/admin/trash`),
  restore: (resource, id) => request(`/api/${resource}/admin/trash/${id}/restore`, { method: "PUT" }),
  permanentDelete: (resource, id) =>
    request(`/api/${resource}/admin/trash/${id}`, { method: "DELETE" }),
  bulkTrash: (resource, ids) =>
    request(`/api/${resource}/admin/bulk-trash`, { method: "POST", body: JSON.stringify({ ids }) }),
  bulkPublish: (resource, ids, published) =>
    request(`/api/${resource}/admin/bulk-publish`, {
      method: "POST",
      body: JSON.stringify({ ids, published }),
    }),

  // Phase 7 workflow actions (POST /api/:resource/:id/:action)
  submit: (resource, id, reason) =>
    request(`/api/${resource}/${id}/submit`, { method: "POST", body: reason ? JSON.stringify({ reason }) : undefined }),
  review: (resource, id) =>
    request(`/api/${resource}/${id}/review`, { method: "POST" }),
  approve: (resource, id, reason) =>
    request(`/api/${resource}/${id}/approve`, { method: "POST", body: reason ? JSON.stringify({ reason }) : undefined }),
  reject: (resource, id, reason) =>
    request(`/api/${resource}/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  publish: (resource, id) =>
    request(`/api/${resource}/${id}/publish`, { method: "POST" }),
  unpublish: (resource, id) =>
    request(`/api/${resource}/${id}/unpublish`, { method: "POST" }),

  getPage: (slug) => request(`/api/page-content?slug=${encodeURIComponent(slug)}`),

  getMessages: (status) => request(`/api/contact${qs({ status })}`),
  updateMessage: (id, payload) =>
    request(`/api/contact/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMessage: (id) => request(`/api/contact/${id}`, { method: "DELETE" }),

  getDashboardStats: () => request("/api/dashboard/stats"),

  getUsers: () => request("/api/users"),
  createUser: (payload) => request("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),

  getActivityLogs: (params) => request(`/api/activity-logs${qs(params)}`),

  // Phase 8: Content Inbox
  inboxStats: () => request("/api/inbox/stats"),
  inboxList: (params) => request(`/api/inbox${qs(params)}`),
  inboxItem: (type, id) => request(`/api/inbox/item/${type}/${id}`),
  inboxHistory: (type, id) => request(`/api/inbox/history/${type}/${id}`),

  // Phase 9: Facebook integration (admin, import-only)
  facebookStatus: () => request("/api/integrations/facebook/status"),
  facebookTestConnection: () =>
    request("/api/integrations/facebook/test-connection", { method: "POST", body: JSON.stringify({}) }),
  facebookPosts: (limit) => request(`/api/integrations/facebook/posts${qs({ limit })}`),
  facebookPreview: (postId) => request(`/api/integrations/facebook/posts/${encodeURIComponent(postId)}`),
  facebookImport: (posts, targetType) =>
    request("/api/integrations/facebook/import", {
      method: "POST",
      body: JSON.stringify({ posts, targetType }),
    }),
  facebookSync: (limit, targetType) =>
    request("/api/integrations/facebook/sync", {
      method: "POST",
      body: JSON.stringify({ limit, targetType }),
    }),

  // Phase 11: publish a CMS-published item to Facebook (explicit human action)
  facebookPublish: (contentType, contentId, caption, allowRepublish) =>
    request("/api/integrations/facebook/publish", {
      method: "POST",
      body: JSON.stringify({ contentType, contentId, caption, allowRepublish }),
    }),

  // Phase 10: AI content preparation
  aiStatus: () => request("/api/ai/status"),
  aiSuggest: (contentType, contentId, action) =>
    request("/api/ai/suggest", {
      method: "POST",
      body: JSON.stringify({ contentType, contentId, action }),
    }),
  aiApply: (contentType, contentId, action, value) =>
    request("/api/ai/apply", {
      method: "POST",
      body: JSON.stringify({ contentType, contentId, action, value }),
    }),

  getMedia: (params) => request(`/api/media${qs(params)}`),
  deleteMedia: (id) => request(`/api/media/${id}`, { method: "DELETE" }),

  uploadImage: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Upload failed (${res.status})`);
    }

    return data.data;
  },

  uploadAttachment: async (resource, id, file, onProgress) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener("load", () => {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.attachment || data.data);
        } else {
          reject(new Error(data.message || "Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", `${API_BASE}/api/attachments/upload/${resource}/${id}`);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  deleteAttachment: (resource, id, attachmentId) =>
    request(`/api/attachments/${resource}/${id}/${attachmentId}`, { method: "DELETE" }),

  create: (resource, payload) =>
    request(`/api/${resource}`, { method: "POST", body: JSON.stringify(payload) }),

  update: (resource, id, payload) =>
    request(`/api/${resource}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  remove: (resource, id) => request(`/api/${resource}/${id}`, { method: "DELETE" }),
};

export function isAdmin() {
  return getUser()?.role === "admin";
}

// Decides whether the current user holds `permission`.
//
// Source of truth: the `permissions[]` array returned by the authoritative
// backend and stored in the session. If a session predates that array (or the
// array is missing), falls back to the static role -> permission map. UI
// permission checks are UX controls only — backend remains the security
// authority.
export function hasPermission(permission) {
  const user = getUser();
  if (!user?.role) return false;

  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }

  return (ROLE_PERMISSIONS[user.role] || []).includes(permission);
}

// Backend-authorized values. Use these to decide what a user may attempt in
// the UI. Note: for admin, every permission resolves to true.
export const canViewDashboard = () => hasPermission(PERMISSIONS.DASHBOARD_VIEW);

export const canViewContent = () => hasPermission(PERMISSIONS.CONTENT_VIEW);
export const canCreateContent = () => hasPermission(PERMISSIONS.CONTENT_CREATE);
export const canEditContent = () => hasPermission(PERMISSIONS.CONTENT_EDIT);
export const canDeleteContent = () => hasPermission(PERMISSIONS.CONTENT_DELETE);
export const canPublishContent = () => hasPermission(PERMISSIONS.CONTENT_PUBLISH);
export const canSubmitContent = () => hasPermission(PERMISSIONS.CONTENT_SUBMIT);
export const canReviewContent = () => hasPermission(PERMISSIONS.CONTENT_REVIEW);
export const canApproveContent = () => hasPermission(PERMISSIONS.CONTENT_APPROVE);
export const canRejectContent = () => hasPermission(PERMISSIONS.CONTENT_REJECT);
export const canUnpublishContent = () => hasPermission(PERMISSIONS.CONTENT_UNPUBLISH);

export const canViewMedia = () => hasPermission(PERMISSIONS.MEDIA_VIEW);
export const canUploadMedia = () => hasPermission(PERMISSIONS.MEDIA_UPLOAD);
export const canDeleteMedia = () => hasPermission(PERMISSIONS.MEDIA_DELETE);

export const canUploadAttachments = () => hasPermission(PERMISSIONS.ATTACHMENTS_UPLOAD);
export const canDeleteAttachments = () => hasPermission(PERMISSIONS.ATTACHMENTS_DELETE);

export const canViewPages = () => hasPermission(PERMISSIONS.PAGES_VIEW);
export const canEditPages = () => hasPermission(PERMISSIONS.PAGES_EDIT);

export const canViewMessages = () => hasPermission(PERMISSIONS.MESSAGES_VIEW);
export const canManageMessages = () => hasPermission(PERMISSIONS.MESSAGES_MANAGE);

export const canViewUsers = () => hasPermission(PERMISSIONS.USERS_VIEW);
export const canManageUsers = () => hasPermission(PERMISSIONS.USERS_MANAGE);

export const canViewTrash = () => hasPermission(PERMISSIONS.TRASH_VIEW);
export const canRestoreTrash = () => hasPermission(PERMISSIONS.TRASH_RESTORE);
export const canDeleteTrash = () => hasPermission(PERMISSIONS.TRASH_DELETE);

export const canViewActivityLogs = () => hasPermission(PERMISSIONS.ACTIVITY_LOGS_VIEW);

export const canViewSettings = () => hasPermission(PERMISSIONS.SETTINGS_VIEW);
export const canEditSettings = () => hasPermission(PERMISSIONS.SETTINGS_EDIT);

// Phase 9: Facebook integration (backend-authoritative; UI is UX only)
export const canViewSocial = () => hasPermission(PERMISSIONS.SOCIAL_VIEW);
export const canManageSocial = () => hasPermission(PERMISSIONS.SOCIAL_MANAGE);
export const canImportSocial = () => hasPermission(PERMISSIONS.SOCIAL_IMPORT);
// Phase 11:
export const canPublishSocial = () => hasPermission(PERMISSIONS.SOCIAL_PUBLISH);

// Phase 10: AI assistance (backend-authoritative; UI is UX only)
export const canViewAI = () => hasPermission(PERMISSIONS.AI_VIEW);
export const canUseAI = () => hasPermission(PERMISSIONS.AI_USE);
export const canManageAI = () => hasPermission(PERMISSIONS.AI_MANAGE);
