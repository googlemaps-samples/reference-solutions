# Single-Venue Storefront, Booking & Get Directions Hub — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) (`Map`, `AdvancedMarkerElement`, `Place.searchByText`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `StreetViewPanorama`)

A modern, zero-bundler ES module web application for a multi-specialty dental clinic in San Francisco featuring live Google Places storefront details and patient reviews, a 5 km home-visit coverage radius overlay, a synchronized Street View entrance panorama, multimodal directions (`DRIVING`, `TRANSIT`, `WALKING`), and an appointment booking workflow.

## Architecture Summary

- **Zero-Bundler ES Modules (`index.html`, `app.js`, `styles.css`):** Uses a browser `<script type="importmap">` pointing `@googlemaps/js-api-loader` directly to the installed v2 ESM bundle and loads Maps JavaScript API libraries on demand via `setOptions()` and `importLibrary()`.
- **Loopback Static & Config Server (`server.mjs`):** Binds strictly to `127.0.0.1` (never `0.0.0.0`), reads `GOOGLE_MAPS_API_KEY` from `.env` / environment variables, serves `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and serves static assets with path-traversal protection.
- **Modern Google Maps Platform APIs:**
  - [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0): 2D vector `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `Circle` coverage overlay, and [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) + `PinElement`.
  - [Places API (New)](https://developers.google.com/maps/documentation/javascript/place-overview?utm_campaign=gmp_git_agentsamples_v1.0.0): `Place.searchByText` for live clinic storefront details, opening hours, photos, ratings, and reviews, plus `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select`.
  - [Routes API](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0): `Route.computeRoutes` (`DRIVING`, `TRANSIT`, `WALKING`) and `route.createPolylines()`.
  - [Street View Service & Panorama](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0): `StreetViewService.getPanorama` paired with `spherical.computeHeading` from the `geometry` library to orient the camera toward the clinic entrance.
- **DOM & Security Hardening:** Builds all dynamic DOM nodes with `document.createElement()`, `textContent`, and `replaceChildren()` (zero `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`).

## Core Implementation Snippet

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: window.__GMP_CONFIG__.apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  solutionChannel: 'GMP_gmp_git_agentsamples_v1.0.0_vanilla',
});

const [{ Map }, { AdvancedMarkerElement }, { Place, PlaceAutocompleteElement }, { Route }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
  ]);

const map = new Map(document.getElementById('clinic-map'), {
  center: { lat: 37.7879, lng: -122.4074 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await Route.computeRoutes({
  origin: originLocation,
  destination: clinicLocation,
  travelMode: 'DRIVING',
  fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'localizedValues', 'viewport'],
});
```

## Setup & Local Verification

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card or Cloud project required), mint a **Maps Demo Key**:

1. Open the [Maps Demo Key quickstart page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Copy the generated key.

For production deployments, create a key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**, and restrict the key by HTTP referrer and APIs using the [API Key Restrictions guide](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

## Terms of Service & Licensing

- Usage of Google Maps Platform services is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and may incur billing charges when moving beyond prototyping to production.
- See the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) before deploying.

## Sample Repositories

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
