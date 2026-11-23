# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — Multi-Branch Store, ATM & Inventory Locator (`AdvancedMarkerElement`, `Place.searchByText`, `AutocompleteSuggestion`, `RouteMatrix`, `Route`)

A 100% standalone, zero-bundler ES module implementation of the **Multi-Branch Store, ATM & Inventory Locator** across New York City, built exclusively with modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (`Map`, `InfoWindow`, `Polyline`)**: Vector map centered on Midtown Manhattan (`40.7549, -73.9840`, zoom `12`, `mapId: 'DEMO_MAP_ID'`) loaded via `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Advanced Markers & Clustering (`AdvancedMarkerElement`, `MarkerClusterer`, `SuperClusterAlgorithm`)**: Groups dense NYC locations into interactive clusters at city zoom and expands into custom-styled pins for Flagship Stores, Express Kiosks, and 24/7 ATMs when zoomed in.
- **Places API (New) (`Place.searchByText`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `AutocompleteSessionToken`, `Place.fetchFields`)**: Fetches live NYC storefronts, cafes/kiosks, and 24/7 ATMs on load, preserving live names, addresses, coordinates, ratings, and `regularOpeningHours.weekdayDescriptions`. Provides session-tokenized starting-location autocomplete with `Geocoder` fallback.
- **Routes API (`RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, `route.createPolylines()`)**: Computes live road travel times and distances across `DRIVE`, `WALK`, and `TRANSIT` modes to rank the **Fastest Nearby** branch and render the active route polyline.

## Quickstart & API Key Setup

### Option A: Free Maps Demo Key (Zero-Billing Prototyping)
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card requested).
3. Accept the Maps Demo Project Terms when prompted and generate your key.
4. Copy `.env.example` to `.env` and paste your key into `GOOGLE_MAPS_API_KEY`.

> Note: The Maps Demo Key has a daily quota limit, is intended for prototyping only, and is governed by the Maps Demo Project Terms of Service.

### Option B: Production Google Cloud API Key
1. Create a key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and API scope following [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Running Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture & Core Implementation

- [`server.mjs`](./server.mjs): Binds strictly to `127.0.0.1`, reads `GOOGLE_MAPS_API_KEY` from `.env` / environment, serves `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and serves static assets safely.
- [`index.html`](./index.html): Split-screen layout with an ES `<script type="importmap">` resolving `@googlemaps/js-api-loader` and `@googlemaps/markerclusterer` from `/node_modules/` with zero bundler.
- [`app.js`](./app.js): Safe DOM rendering (`document.createElement` + `textContent` + `replaceChildren`, zero `innerHTML`) coordinating live Places discovery, `RouteMatrix` ETA ranking, `MarkerClusterer` rendering, and `Route.computeRoutes` polyline display.

```js
const [{ Map }, { AdvancedMarkerElement }, { Place }, { Route, RouteMatrix }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
  ]);

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [origin.location],
  destinations: branches.map((b) => b.location),
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
});
```

## Google Maps Platform Documentation & Compliance

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) in Maps JS](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes Library (`Route` & `RouteMatrix`)](https://developers.google.com/maps/documentation/javascript/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
