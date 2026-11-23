// Runtime environment fallback for ng serve development mode.
// In production preview (`node serve-dist.mjs`), `/env-config.js` is dynamically
// served from `.env` / `process.env.GOOGLE_MAPS_API_KEY`.
window.__ENV__ = window.__ENV__ || {};
