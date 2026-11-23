# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — Field Workforce Geofenced Attendance & Site Audit Router (`AdvancedMarkerElement`, `PinElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, `geometry.poly.containsLocation`, Terra Draw)

A zero-bundler ES module Google Maps Platform web application for field workforce geofenced attendance check-ins and multi-stop retail store audit routing centered in Austin, TX.

## Architecture Summary

- **Zero-Bundler ES Modules + Import Map:** Browser-native `<script type="importmap">` in [`index.html`](./index.html) resolves `@googlemaps/js-api-loader` (v2 `setOptions` + `importLibrary`), `terra-draw`, and `terra-draw-google-maps-adapter` directly from local `/node_modules/` served by [`server.mjs`](./server.mjs).
- **Local Loopback Runtime Config Server ([`server.mjs`](./server.mjs)):** Strictly binds to `127.0.0.1` (never `0.0.0.0`), reads `GOOGLE_MAPS_API_KEY` from `.env` or environment variables, serves `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and guards against path traversal.
- **Geofencing & Terra Draw:** Pre-seeds 3 Austin client site geofence polygons (`google.maps.Polygon`) and integrates `TerraDraw` with `TerraDrawGoogleMapsAdapter` (`isolatedData: true`) so supervisors can draw and edit new polygon geofence zones. Worker GPS presets are evaluated against all active polygons using `google.maps.geometry.poly.containsLocation` to unlock or lock the Verified Clock-In badge.
- **Reverse Geocoding, Places Search & Waypoint Optimization:** Uses `Geocoder` (`geocoding` library) for worker street address resolution, `Place.searchByText` (`places` library) to discover live Austin retail audit sites, and `Route.computeRoutes` (`routes` library) with `optimizeWaypointOrder: true` and `TRAFFIC_AWARE` routing to render numbered `AdvancedMarkerElement` + `PinElement` stops and polylines.

## Core Implementation Snippet

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: window.__GMP_CONFIG__.apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
});

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place }, { Route }, { Geocoder }, { poly }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('geocoding'),
    importLibrary('geometry'),
  ]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 30.2672, lng: -97.7431 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Run

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Prototyping (Maps Demo Key):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate / reveal your Maps Demo Key (note: has a daily reset limit and is not for production).

**Option B — Production Key (Google Cloud Console):**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and designated APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173` in your browser.

## Documentation References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps JS API](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes](https://developers.google.com/maps/documentation/javascript/reference/route?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
