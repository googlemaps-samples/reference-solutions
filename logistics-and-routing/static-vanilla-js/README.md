# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (`AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, Roads API `snapToRoads`)

A 100% standalone, zero-bundler Dallas fleet telematics, road-snapping, and multi-stop dispatch console built with static HTML, vanilla ES modules, and a lightweight Node.js Backend-for-Frontend (BFF) server (`server.mjs`).

## Google Maps Platform Products & Modern APIs Used

- **[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: Vector `Map` (`mapId: "DEMO_MAP_ID"`, `clickableIcons: false`), `AdvancedMarkerElement`, `PinElement`, `InfoWindow`, `Polyline`, `TrafficLayer`, and `geometry.encoding.decodePath`.
- **[Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `places:searchText` (via `/api/places/search` with `Place.searchByText` fallback) and `PlaceAutocompleteElement` (`gmp-select` event + `toPlace()` + `fetchFields()`).
- **[Roads API](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `v1/snapToRoads` (`interpolate=true`) via `/api/roads/snap` to snap noisy GPS breadcrumbs to Dallas road geometry.
- **[Routes API](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `directions/v2:computeRoutes` & `distanceMatrix/v2:computeRouteMatrix` via `/api/routes/compute` and `/api/routes/matrix` (with `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix` fallback).
- **[`@googlemaps/js-api-loader` v2](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0)**: Functional `setOptions()` + `importLibrary()` API served locally via ES module import map.

## Quickstart & API Key Setup

> **Cost Notice:** Usage of Google Maps Platform APIs in production may incur charges against your Google Cloud billing account. For zero-cost prototyping, use the free **Maps Demo Key** below.

### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and copy your generated Demo Key.

### Option B: Production Google Cloud API Key
1. Create or select a project in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**.
3. Restrict your key following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 8080
```

Then open `http://127.0.0.1:8080` in your browser.

## Architecture Summary

- **`server.mjs`**: Strictly binds to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, injects runtime config via `/env-config.js`, serves static assets + `@googlemaps/js-api-loader` safely, and exposes four BFF proxy endpoints (`/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`) with explicit `X-Goog-FieldMask` and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0` headers.
- **`app.js`**: Bootstraps Maps JS libraries (`core`, `maps`, `marker`, `places`, `routes`, `geometry`), renders status-coded fleet `AdvancedMarkerElement` pins, compares raw dashed GPS traces against Roads API road-snapped paths, computes multi-stop dispatch corridors & travel-time matrices, and updates the DOM strictly with `document.createElement()`, `textContent`, and `replaceChildren()`.

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: window.__GMP_CONFIG__.apiKey, v: 'weekly', language: 'en', region: 'US' });
const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
]);

const map = new Map(document.getElementById('map'), {
  center: { lat: 32.7767, lng: -96.797 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  clickableIcons: false,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
