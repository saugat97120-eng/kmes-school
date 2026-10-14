// Single source of truth for the backend URL.
// In development it falls back to the local API. In a production build the
// variable MUST be provided (Vercel -> Settings -> Environment Variables);
// silently pointing real visitors at "localhost" would fail with no clue why.
const fromEnv = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

if (!fromEnv && import.meta.env.PROD) {
  console.error("VITE_API_BASE_URL is not set for this production build; API requests will fail.");
}

export const API_BASE = fromEnv || (import.meta.env.DEV ? "http://localhost:5000" : "");
