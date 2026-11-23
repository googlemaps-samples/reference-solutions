# Multi-Modal Commute Comparator & Trail Elevation Tracker — Angular Standalone Components + TypeScript (@angular/google-maps) (`GoogleMap`, `MapAdvancedMarker`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `ElevationService`)

An interactive multi-modal commute comparator and outdoor cycling/running elevation tracker built with **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and the modern Google Maps Platform JavaScript SDK (`@googlemaps/js-api-loader` v2 `setOptions` + `importLibrary`).

Pre-seeded on the **Denver Union Station → Chautauqua Park (Boulder, CO)** Front Range corridor, the app resolves endpoints live via **Places API (New)** (`Place.searchByText`), compares **Driving**, **Cycling**, **Walking**, and **Transit** options via **Routes API** (`Route.computeRoutes` with alternative routes, route modifiers, and `FUEL_EFFICIENT` eco-friendly routing), renders color-coded polylines and `AdvancedMarkerElement` pins (`DEMO_MAP_ID`), and plots a 64-sample **Elevation API** (`ElevationService.getElevationAlongPath`) slope profile chart synchronized bidirectionally with a hover marker on the map.

---

## Architecture & Modern Google Maps Platform APIs

- **Dynamic SDK Bootstrap (`@googlemaps/js-api-loader` v2):** Uses `setOptions()` and `importLibrary()` to load `core`, `maps`, `marker`, `places`, `routes`, and `elevation` dynamically at runtime using `window.__ENV__.GOOGLE_MAPS_API_KEY` served by `serve-dist.mjs` from `/env-config.js`.
- **2D Vector Map & Markers (`@angular/google-maps`):** Mounts `<google-map>` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `<map-advanced-marker>` (`AdvancedMarkerElement` + `PinElement` using `glyphText`), `<map-polyline>`, and mode-aware layers (`MapBicyclingLayer`, `MapTransitLayer`, `MapTrafficLayer`).
- **Places API (New):** Resolves seeded Denver/Boulder endpoints via `Place.searchByText()` and attaches interactive `PlaceAutocompleteElement` pickers listening to the `gmp-select` event (`event.placePrediction.toPlace()` → `place.fetchFields()`).
- **Routes API (`Route.computeRoutes`):** Computes primary and alternative routes across `DRIVING`, `BICYCLING`, `WALKING`, and `TRANSIT`, supporting `avoidTolls`, `avoidHighways`, and `requestedReferenceRoutes: ['FUEL_EFFICIENT']` for Driving.
- **Elevation API (`ElevationService.getElevationAlongPath`):** Samples 64 equidistant coordinates along the active route polyline, computes cumulative elevation gain/loss and segment grade %, and synchronizes chart hover with a live `<map-advanced-marker>` pin.

### Core Implementation Snippet

```typescript
const { Route } = (await google.maps.importLibrary('routes')) as google.maps.RoutesLibrary;

const { routes } = await Route.computeRoutes({
  origin: origin.location,
  destination: destination.location,
  travelMode: 'BICYCLING' as google.maps.TravelMode,
  computeAlternativeRoutes: true,
  fields: [
    'durationMillis',
    'distanceMeters',
    'path',
    'routeLabels',
    'localizedValues',
    'travelAdvisory',
    'warnings',
  ],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

---

## Setup & Local Execution

### 1. Obtain a Google Maps Platform API Key

**Zero-Billing Prototyping (Maps Demo Key):**
1. Open the [Maps Demo Key quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.

**Production Key (Google Cloud Console):**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
3. Restrict the key by HTTP referrer and enabled APIs following [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

---

## Multi-Stack Sample Gallery

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Terms of Service & Licensing

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Google-sourced SDK patterns are governed by the Apache 2.0 License. Walking and bicycling directions are provided in beta; always observe trail conditions and signage.

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
