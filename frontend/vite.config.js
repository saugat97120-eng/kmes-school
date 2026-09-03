import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Phase 18C-3 — deployment foundation: prevent a silent production localhost
// fallback. The built SPA reads VITE_API_BASE_URL at build time and falls back
// to http://localhost:5000. For a staging/production artifact that fallback
// would silently point every API call at a developer machine. Deployment builds
// MUST set VITE_API_BASE_URL. We do NOT hard-fail the build here because local
// development (and a config-less build) rely on the documented localhost
// default; instead we emit an unmistakable build-time warning and rely on the
// CD/env to bake the correct origin (see docs/DEPLOYMENT.md) plus CI smoke
// tests. Skipping this value is therefore never silent.
function warnIfMissingApiBase() {
  if (!process.env.VITE_API_BASE_URL) {
    console.log(
      '[deploy] VITE_API_BASE_URL is not set; the SPA will fall back to ' +
        'http://localhost:5000. For staging/production builds you MUST set ' +
        'VITE_API_BASE_URL (e.g. https://staging-api.schooldomain.com or ' +
        'https://api.schooldomain.com). See docs/DEPLOYMENT.md.'
    )
  }
}

export default defineConfig(() => {
  warnIfMissingApiBase()

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
  }
})