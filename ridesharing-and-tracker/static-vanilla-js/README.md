# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes` & Routes API v2 — Rideshare Booking, Fare Estimator & Live Driver Tracking

A 100% standalone Los Angeles rideshare booking, transparent fare estimation, eco-friendly route comparison, and live driver-dispatch tracking web application built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `marker`, `core`):** Vector 2D map (`mapId: 'DEMO_MAP_ID'`), `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `AdvancedMarkerElement`, and `PinElement` ([Maps JS API Docs](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Places API (New) (`places` + `/api/places/search`):** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) with `gmp-select` event + `place.fetchFields()`, `Place.searchByText`, and server-proxied `places.googleapis.com/v1/places:searchText` ([Places API New Docs](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Routes API v2 (`routes` + `/api/routes/compute` + `/api/routes/matrix`):** `Route.computeRoutes` and server-proxied `routes.googleapis.com/directions/v2:computeRoutes` (`TRAFFIC_AWARE_OPTIMAL`, `FUEL_EFFICIENT`, `FUEL_CONSUMPTION`), plus `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` for closest candidate driver dispatch ([Routes API Docs](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Geometry Library (`geometry`):** `encoding.decodePath()` and `spherical.computeDistanceBetween()`, `spherical.computeHeading()`, and `spherical.interpolate()` for smooth vehicle animation ([Geometry Library Docs](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0)).

## Architecture Summary

1. **Zero-Bundler ES Module Frontend ([`index.html`](./index.html), [`app.js`](./app.js), [`styles.css`](./styles.css)):**
   - Loads `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) via a native browser `<script type="importmap">`.
   - Pre-seeds Los Angeles pickup (`Union Station, Los Angeles, CA`) and drop-off (`Santa Monica Pier, Santa Monica, CA`) via Places API (New), renders interactive `PlaceAutocompleteElement` inputs, computes fastest traffic-aware vs. `FUEL_EFFICIENT` routes, calculates transparent Economy / Comfort / Green fares and CO₂/energy savings, dispatches the closest simulated driver via Route Matrix, and smoothly animates the vehicle `AdvancedMarkerElement` along the pickup and trip polylines with live ETA updates.
2. **Secure Local Static + BFF Proxy Server ([`server.mjs`](./server.mjs)):**
   - Binds strictly to `127.0.0.1` (`--host 127.0.0.1 --port <port>`), reads `GOOGLE_MAPS_API_KEY` from `.env`, exposes `/env-config.js`, and proxies `/api/places/search`, `/api/routes/compute`, and `/api/routes/matrix` with explicit `X-Goog-FieldMask` headers and `X-Content-Type-Options: nosniff` / `X-Frame-Options: SAMEORIGIN` security headers.

### Core Implementation Snippet

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: window.__GMP_CONFIG__.apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const [{ Map }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }, { encoding, spherical }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('geometry'),
  ]);

const map = new Map(document.getElementById('rideshare-map'), {
  center: { lat: 34.0328, lng: -118.3669 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Execution

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Zero-Billing Prototyping):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing setup required).
3. Accept the Maps Demo Project Terms when prompted and generate your key.
4. Note: The Maps Demo Key has a daily quota limit and is for prototyping only.

**Option B — Production Google Cloud API Key:**
1. Create and restrict an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Apply HTTP referrer and API restrictions following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Compliance & Terms

- Use of Google Maps Platform services is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Production usage may incur charges against your Google Cloud billing account.

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
