// Fallback runtime config for ng serve when serve-dist.mjs is not fronting the app.
// In production preview, serve-dist.mjs serves /env-config.js dynamically from .env.
window.__GMP_CONFIG__ = window.__GMP_CONFIG__ || {
  googleMapsApiKey: '',
};
