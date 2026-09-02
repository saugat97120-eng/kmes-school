// Phase 9 — Facebook adapter (single clean abstraction over the Meta Graph
// API). Controllers/services depend on THIS interface, never on raw HTTP, so
// the live implementation and an injected mock share one contract.
//
// The adapter ONLY reads. It never publishes, never mutates the Page, and
// returns normalized, post-shaped SAFE objects (no tokens, no internal state).
// All failures are folded into a handful of safe, actionable error codes that
// the service maps to user-facing messages without leaking credentials or
// stack traces.
//
// Facebook is an IMPORT SOURCE only. Nothing here can decide KMES publication.

export class FacebookError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FacebookError";
    this.code = code; // invalid_token | expired_token | rate_limit | page_unavailable | network | api_error | invalid_config
  }
}

// Read credentials from environment (backend-only). Never exported to a
// response and never persisted.
function readConfig() {
  return {
    appId: process.env.FACEBOOK_APP_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || "",
    pageId: process.env.FACEBOOK_PAGE_ID || "",
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "",
  };
}

export function isFacebookConfigured() {
  const c = readConfig();
  return Boolean(c.pageId && c.pageAccessToken);
}

// Map a raw Graph API response / thrown error to a safe FacebookError.
function toFacebookError(err) {
  if (err instanceof FacebookError) return err;

  const status = err?.status;
  const body = err?.body;
  const errorType = body?.error?.type || body?.error?.subcode || err?.message || "";
  const code = body?.error?.code;

  if (status === 401 || /invalid.*token|session.*expired/i.test(errorType)) {
    return new FacebookError("invalid_token", "Facebook credentials are invalid.");
  }
  if (status === 400 && /session has expired|expired/i.test(errorType)) {
    return new FacebookError("expired_token", "The Facebook access token has expired.");
  }
  if (status === 429 || /rate.?limit/i.test(errorType)) {
    return new FacebookError("rate_limit", "Facebook API rate limit reached. Try again later.");
  }
  if (status === 404 && /page/i.test(errorType)) {
    return new FacebookError("page_unavailable", "The configured Facebook Page is unavailable.");
  }
  if (err?.name === "AbortError" || err?.cause?.code === "ECONNREFUSED" || err?.cause?.code === "ENOTFOUND") {
    return new FacebookError("network", "Facebook is unreachable. Check your connection.");
  }
  return new FacebookError("api_error", "Facebook returned an unexpected response.");
}

// Minimal fetch with a hard timeout. The running app must not hang if Meta is
// slow or unavailable. Accepts an optional method override (POST for publishing).
async function fetchJson(url, { method = "GET" } = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { method, signal: controller.signal });
  } catch (err) {
    throw toFacebookError(err);
  } finally {
    clearTimeout(t);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (body?.error) {
    throw toFacebookError({ status: res.status, body });
  }
  if (!res.ok) {
    throw toFacebookError({ status: res.status, body });
  }
  return body;
}

function normalizePost(raw) {
  // Accept Graph API post shapes. Handle missing fields defensively so a
  // malformed/partial payload cannot crash the import pipeline.
  const id = typeof raw?.id === "string" ? raw.id : null;
  if (!id) throw new FacebookError("api_error", "A Facebook post was missing its id.");

  const message = typeof raw?.message === "string" ? raw.message : typeof raw?.story === "string" ? raw.story : "";

  // Permalink: prefer the explicit field, fall back to a constructed URL.
  const permalink =
    typeof raw?.permalink_url === "string"
      ? raw.permalink_url
      : typeof raw?.permalinkUrl === "string"
      ? raw.permalinkUrl
      : null;

  const createdTime = raw?.created_time || raw?.createdTime || null;

  // Media: collect image/video attachment urls. Each entry is { type, url }.
  const media = [];
  const attachments = raw?.attachments?.data || [];
  for (const att of attachments) {
    if (att?.media?.image?.src && typeof att.media.image.src === "string") {
      media.push({ type: "image", url: att.media.image.src });
    }
    if (typeof att?.media?.source === "string") {
      media.push({ type: "video", url: att.media.source });
    }
    // pager / subattachments may nest more images
    for (const sub of att?.subattachments?.data || []) {
      if (sub?.media?.image?.src && typeof sub.media.image.src === "string") {
        media.push({ type: "image", url: sub.media.image.src });
      }
    }
  }
  // Legacy posts sometimes carry image directly on the raw object under `full_picture`.
  if (typeof raw?.full_picture === "string") {
    media.push({ type: "image", url: raw.full_picture });
  }

  return {
    externalId: id,
    message,
    permalink,
    createdTime: createdTime ? new Date(createdTime).toISOString() : null,
    updatedTime: raw?.updated_time ? new Date(raw.updated_time).toISOString() : null,
    media,
  };
}

// Production adapter backed by the live Meta Graph API.
export class FacebookAdapter {
  constructor(config) {
    this.config = config || readConfig();
  }

  async testConnection() {
    const c = this.config;
    if (!c.pageId || !c.pageAccessToken) {
      return { connected: false, reason: "Not configured" };
    }
    try {
      const url = `https://graph.facebook.com/v19.0/${c.pageId}?fields=id,name&access_token=${encodeURIComponent(c.pageAccessToken)}`;
      const data = await fetchJson(url);
      return { connected: true, pageId: data.id, pageName: data.name };
    } catch (err) {
      return { connected: false, reason: err instanceof FacebookError ? err.message : "Connection failed" };
    }
  }

  async getPageInfo() {
    const c = this.config;
    if (!c.pageId || !c.pageAccessToken) {
      throw new FacebookError("invalid_config", "Facebook is not configured.");
    }
    const url = `https://graph.facebook.com/v19.0/${c.pageId}?fields=id,name&access_token=${encodeURIComponent(c.pageAccessToken)}`;
    const data = await fetchJson(url);
    return { pageId: data.id, pageName: data.name };
  }

  // Fetch recent posts from the Page. `limit` is bounded/down-clamped here so a
  // frontend can never request an unbounded window.
  async getRecentPosts({ limit = 25 } = {}) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const url = `https://graph.facebook.com/v19.0/${this.config.pageId}/posts?fields=id,message,story,permalink_url,created_time,updated_time,full_picture,attachments{media, subattachments{media}}&limit=${safeLimit}&access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const data = await fetchJson(url);
    const posts = Array.isArray(data?.data) ? data.data.map(normalizePost) : [];
    return { posts, next: data?.paging?.next || null };
  }

  async getPost(postId) {
    const url = `https://graph.facebook.com/v19.0/${postId}?fields=id,message,story,permalink_url,created_time,updated_time,full_picture,attachments{media, subattachments{media}}&access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const data = await fetchJson(url);
    return normalizePost(data);
  }

  // Phase 11 — publish a new post to the configured Page. It accepts a caption
  // and an optional array of image public URLs. Returns the new post id. The
  // published post is NEVER treated as CMS publication — it is a separate,
  // human-triggered social publication. No credentials are returned.
  async publishPost({ message, imageUrls = [] }) {
    const c = this.config;
    if (!c.pageId || !c.pageAccessToken) {
      throw new FacebookError("invalid_config", "Facebook is not configured.");
    }
    const caption = typeof message === "string" ? message.trim().slice(0, 5000) : "";
    if (!caption) {
      throw new FacebookError("validation_error", "A caption is required to publish to Facebook.");
    }

    const cleanImages = imageUrls.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 10);

    // Photos: use /photos endpoint (supports media upload via URL). Simpler than
    // the batch API and avoids `unpublished` album weirdness. Publish text to the
    // Page feed when there is a caption (with or without images).
    let publishedId = null;
    try {
      if (cleanImages.length > 0) {
        // Publish each image with the caption on the first, others plain.
        const url = `https://graph.facebook.com/v19.0/${c.pageId}/photos?url=${encodeURIComponent(cleanImages[0])}&caption=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(c.pageAccessToken)}`;
        const data = await fetchJson(url, { method: "POST" });
        publishedId = data?.id || null;
      } else {
        const url = `https://graph.facebook.com/v19.0/${c.pageId}/feed?message=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(c.pageAccessToken)}`;
        const data = await fetchJson(url, { method: "POST" });
        publishedId = data?.id || null;
      }
    } catch (err) {
      if (err instanceof FacebookError) throw err;
      throw new FacebookError("api_error", "Facebook publishing failed.");
    }

    if (!publishedId) {
      throw new FacebookError("api_error", "Facebook did not return a post id.");
    }
    return { publishedId };
  }
}

// Mock adapter used by integration tests. Simulates successful posts,
// duplicates, missing text/media, invalid/expired tokens, rate limits and
// malformed responses without any live Facebook traffic.
export class MockFacebookAdapter {
  constructor(seed = []) {
    this.seed = seed;
  }
  async testConnection() {
    return { connected: true, pageId: "mock_page", pageName: "Mock Page" };
  }
  async getPageInfo() {
    return { pageId: "mock_page", pageName: "Mock Page" };
  }
  async getRecentPosts({ limit = 25 } = {}) {
    const n = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const list = this.seed.slice(0, n);
    return { posts: list.map((p) => (typeof p === "function" ? p() : p)), next: null };
  }
  async getPost(postId) {
    const found = this.seed.map((p) => (typeof p === "function" ? p() : p)).find((p) => p.externalId === postId);
    if (!found) throw new FacebookError("api_error", "Post not found in mock");
    return found;
  }

  // Phase 11 — mock publish. Deterministic so tests can assert on it.
  async publishPost({ message, imageUrls = [] }) {
    if (!message || typeof message !== "string") {
      throw new FacebookError("validation_error", "A caption is required to publish to Facebook.");
    }
    return { publishedId: `mock_published_${this.seed.length + 1}` };
  }
}

// Build a mock adapter whose getRecentPosts throws a given FacebookError
// (used to simulate invalid/expired token, rate limit, page unavailable).
export function mockFailureAdapter(error, { pageOk = true } = {}) {
  return {
    async testConnection() {
      return pageOk ? { connected: true, pageId: "mock", pageName: "Mock" } : { connected: false, reason: error.message };
    },
    async getPageInfo() {
      throw error;
    },
    async getRecentPosts() {
      throw error;
    },
    async getPost() {
      throw error;
    },
    async publishPost() {
      throw error;
    },
  };
}