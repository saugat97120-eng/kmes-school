// Phase 10 — AI adapter (provider-independent abstraction).
//
// Controllers/services depend on the `generate()` interface — never on a raw
// provider SDK — so the live provider, an injected mock, and ability/failure
// mocks all share one contract. This keeps provider logic out of routes and
// React components.
//
// The adapter receives ONLY a minimmed, already-delimited "untrusted content"
// block (never credentials/JWTs/tokens/PII). It returns a SAFE, structured
// JSON suggestion object. All provider failures are folded into a small set of
// safe, actionable error codes; token/secret values are never surfaced.
//
// AI is an ASSISTANT. Nothing in here can publish, approve, delete, change
// roles, or change workflow state — it has no tools other than text generation.

export class AIServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AIServiceError";
    this.code = code; // not_configured | provider_unavailable | rate_limit | invalid_response | timeout | api_error
  }
}

// Read provider config (backend-only). Never exported from a response.
function readConfig() {
  return {
    provider: (process.env.AI_PROVIDER || "").trim(),
    apiKey: process.env.AI_API_KEY || "",
    model: (process.env.AI_MODEL || "").trim(),
  };
}

// Whether a production AI provider is configured (a key + provider are set so
// we don't leak WHICH provider/credential beyond "configured").
export function isAIConfigured() {
  const c = readConfig();
  return Boolean(c.provider && c.apiKey);
}

// Safe status view — never exposes the key or raw config.
export function aiConfigStatus() {
  const c = readConfig();
  return {
    configured: isAIConfigured(),
    provider: c.provider || null,
    model: c.model || null, // model name is a safe, non-sensitive identifier
  };
}

// ---------------------------------------------------------------------------
// Production adapter backed by a real provider. The provider-specific request
// is isolated here so the rest of the app never depends on it.
// ---------------------------------------------------------------------------
export class AIAdapter {
  constructor(config) {
    this.config = config || readConfig();
  }

  // `payload` = { system, user, contentType, action } already assembled by the
  // service (system prompt + delimited untrusted content). Must return
  // { ok: true, text, model } or throw an AIServiceError.
  async generate(payload) {
    const c = this.config;
    if (!c.provider || !c.apiKey) {
      throw new AIServiceError("not_configured", "AI is not configured.");
    }

    // Current supported production provider (configurable, not hard-coded in
    // routes/components). If a different provider name is set, fail safe.
    const response = await this.callProvider(c, payload);
    return { ok: true, text: response.text, model: response.model || c.model };
  }

  async callProvider(c, payload) {
    const normalized = String(c.provider || "").toLowerCase();

    if (normalized === "openai" || normalized === "anthropic" || normalized === "gemini") {
      // Generic chat-completions request for OpenAI-compatible endpoints.
      return this.openAiCompatible(c, payload);
    }
    // Unknown provider -> safe failure (no secret, no crash).
    throw new AIServiceError("not_configured", "No supported AI provider is configured.");
  }

  async openAiCompatible(c, payload) {
    const url =
      c.baseUrl ||
      (String(c.provider || "").toLowerCase() === "gemini"
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model || "gemini-1.5-flash")}:generateContent`
        : "https://api.openai.com/v1/chat/completions");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30000);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${c.apiKey}`,
        },
        body: JSON.stringify({
          model: c.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: payload.system },
            { role: "user", content: payload.user },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new AIServiceError("timeout", "The AI provider timed out.");
      }
      throw new AIServiceError("provider_unavailable", "The AI provider is unreachable.");
    } finally {
      clearTimeout(t);
    }

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok) {
      if (res.status === 429 || /rate.?limit/i.test(String(body?.error?.message || ""))) {
        throw new AIServiceError("rate_limit", "The AI provider rate limit was reached. Try again later.");
      }
      throw new AIServiceError("api_error", "The AI provider returned an unexpected error.");
    }

    const text = body?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new AIServiceError("invalid_response", "The AI provider returned an invalid response.");
    }
    return { text, model: body?.model || c.model };
  }
}

// ---------------------------------------------------------------------------
// Mock adapter used by integration tests (no live provider traffic).
// `handler({ system, user, contentType, action })` returns a JSON string or an
// object. Deterministic so tests can assert on behavior, not on randomness.
// ---------------------------------------------------------------------------
export class MockAIAdapter {
  constructor(handler = null, { model = "mock-model" } = {}) {
    this.handler = handler || defaultMockHandler;
    this.model = model;
  }
  async generate(payload) {
    const result = this.handler(payload);
    if (typeof result === "object" && result !== null) {
      return { ok: true, text: JSON.stringify(result), model: this.model };
    }
    if (typeof result === "string") {
      return { ok: true, text: result, model: this.model };
    }
    if (result instanceof Error) throw result;
    throw new AIServiceError("invalid_response", "Mock returned malformed output.");
  }
}

// Deterministic default: echoes back the action + a short suggestion so tests
// can assert the service drove the right prompt and parsed the output.
function defaultMockHandler({ action, contentType }) {
  return {
    action,
    summary: `[${contentType}] Suggested content approved for human review.`,
    suggestions: { title: `Draft ${action} title` },
    confidence: null,
    warnings: [],
  };
}

// Build a mock adapter whose generate() throws a given AIServiceError
// (used to simulate provider_unavailable / rate_limit / timeout / api_error).
export function mockFailureAIAdapter(error) {
  return {
    async generate() {
      throw error;
    },
  };
}