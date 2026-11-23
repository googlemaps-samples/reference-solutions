# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — Angular Standalone Components + TypeScript (@angular/google-maps) (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, Roads API `snapToRoads`)

A standalone **Angular 22** dispatch console for Dallas fleet telematics, road-snapped GPS breadcrumb inspection, and multi-stop corridor routing powered exclusively by modern, zero-deprecation Google Maps Platform APIs.

## Features & Google Maps Platform Products

- **Maps JavaScript API (`@angular/google-maps` + `@googlemaps/js-api-loader`)**:
  - Vector map (`mapId: 'DEMO_MAP_ID'`) with `clickableIcons: false` to minimize POI clutter and focus on Dallas freight corridors, plus optional `<map-traffic-layer>`.
  - Status-coded active fleet markers (`En Route`, `Delayed`, `Idle`) and numbered depot/hub markers via `<map-advanced-marker>` (`AdvancedMarkerElement`) and `<map-info-window>`.
  - Usage attribution configured via `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `solutionChannel: 'gmp_git_agentsamples_v1.0.0'`.
- **Places API (New) (`Place.searchByText` & `PlaceAutocompleteElement`)**:
  - Live discovery of Dallas logistics hubs and distribution centers on startup via `Place.searchByText`.
  - Interactive hub search bar mounted via `PlaceAutocompleteElement` listening to `gmp-select`, `event.placePrediction.toPlace()`, and `place.fetchFields()`.
- **Roads API (`v1/snapToRoads`)**:
  - Server-side BFF proxy (`/api/roads/snap` in [`serve-dist.mjs`](./serve-dist.mjs)) snaps noisy raw GPS breadcrumbs to Dallas road geometry (`interpolate=true`) and computes unique road segment counts and mean snap offset (`m`) using `google.maps.geometry.spherical.computeDistanceBetween`.
- **Routes API (`Route.computeRoutes` & `RouteMatrix.computeRouteMatrix`)**:
  - Computes multi-stop corridor polylines with optional `optimizeWaypointOrder` between the Dallas central depot and selected drop-off hubs, alongside a live depot-to-hub travel-time and distance matrix.

## Architecture Overview

1. **Dynamic Runtime Config (`/env-config.js`)**: `GOOGLE_MAPS_API_KEY` is never hardcoded in `src/` or `environment.ts`. [`serve-dist.mjs`](./serve-dist.mjs) reads `.env` at runtime, exposes `/env-config.js`, serves the compiled Angular bundle (`dist/dallas-fleet-telematics/browser`), and binds strictly to `127.0.0.1`.
2. **BFF REST Proxy (`/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`, `/api/places/search`)**: Avoids browser CORS blocks on Google Maps Platform REST endpoints and attaches `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0` server-side.
3. **Core Implementation Snippet** ([`src/app/services/telematics-api.service.ts`](./src/app/services/telematics-api.service.ts)):

```typescript
const { Route, RouteMatrix } = await importLibrary('routes');

const [{ routes }, { matrix }] = await Promise.all([
  Route.computeRoutes({
    origin: depot.location,
    destination: finalHub.location,
    intermediates: intermediateHubs.map((h) => ({
      location: h.location,
      vehicleStopover: true,
    })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: true,
    fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'optimizedIntermediateWaypointIndices'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  }),
  RouteMatrix.computeRouteMatrix({
    origins: [depot.location],
    destinations: hubs.map((h) => h.location),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: ['condition', 'distanceMeters', 'durationMillis'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  }),
]);
```

## Setup & Running Locally

### 1. Obtain an API Key

- **Prototyping (Free, No Billing Required):** Generate a **Maps Demo Key** at [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Production:** Create a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**, and apply [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Note:** Usage of Google Maps Platform APIs in production may incur costs against your Google Cloud billing account. Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=...

npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

## Related Sample Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
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
