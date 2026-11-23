# Field Workforce Geofenced Attendance & Site Audit Router — Angular Standalone Components + TypeScript (@angular/google-maps) with `AdvancedMarkerElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, and `TerraDraw`

An Austin-centered field operations dashboard built with **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern Google Maps Platform APIs. Supervisors can inspect pre-seeded Austin site geofence polygons, draw custom polygon geofences on the map with **Terra Draw**, simulate field worker GPS check-ins with live polygon containment verification and reverse-geocoded street addresses, discover Austin retail audit sites via **Places API (New)**, and compute traffic-aware multi-stop driving routes with **Routes API** waypoint optimization.

## Google Maps Platform APIs & Libraries Used

- **Maps JavaScript API** (`@googlemaps/js-api-loader` v2 `setOptions` + `importLibrary`) — Interactive 2D vector map (`mapId: 'DEMO_MAP_ID'`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` ([Maps JS API Docs](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Marker Library** (`AdvancedMarkerElement` / `<map-advanced-marker>` + `PinElement` with `glyphText`) — Numbered audit stop pins and dynamic field worker badge ([Advanced Markers Docs](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Places API (New)** (`Place.searchByText`) — Live Austin audit site discovery ([Places Text Search Docs](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Routes API** (`Route.computeRoutes` with `optimizeWaypointOrder: true` and `TRAFFIC_AWARE`) — Multi-stop audit route optimization and polyline rendering ([Routes Class Docs](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Geocoding API** (`Geocoder`) — Reverse geocoding simulated worker GPS coordinates into human-readable Austin street addresses ([Geocoding Docs](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Geometry Library** (`google.maps.geometry.poly.containsLocation`) — Client-side geofence polygon entry/exit verification ([Geometry Library Docs](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0))
- **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`) — Modern polygon drawing & editing replacement for the deprecated `google.maps.drawing` library ([Terra Draw Example](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0))

## Architecture Summary

1. **Runtime Environment Injection (`serve-dist.mjs` + `/env-config.js`)**: No API key is ever hardcoded in `src/` or `environment.ts`. The Node production preview server `serve-dist.mjs` (bound strictly to `127.0.0.1`) reads `GOOGLE_MAPS_API_KEY` from `.env` (or `process.env`) and serves `/env-config.js` at runtime alongside Angular's production `dist/` output.
2. **Dynamic Library Loading (`GoogleMapsService`)**: Calls `@googlemaps/js-api-loader` v2 `setOptions()` and `importLibrary()` for `core`, `maps`, `marker`, `places`, `routes`, `geocoding`, and `geometry` before mounting `<google-map>`.
3. **Geofencing + Terra Draw (`AppComponent`)**: Renders 3 pre-seeded Austin geofence polygons via `<map-polygon>` and initializes `TerraDraw` with `TerraDrawGoogleMapsAdapter` (`isolatedData: true`) once the map is idle. Both pre-seeded and supervisor-drawn polygons are evaluated in real time using `google.maps.geometry.poly.containsLocation()` to unlock or lock the **Verified Clock-In** badge.
4. **Live Place Discovery & Waypoint Optimization**: Searches live Austin retail locations with `Place.searchByText()`, then calls `Route.computeRoutes()` with `optimizeWaypointOrder: true` to reorder intermediate stops, update numbered `<map-advanced-marker>` `PinElement` badges, and draw the route with `<map-polyline>`.

### Core Implementation Snippet

```typescript
const { routes } = await Route.computeRoutes({
  origin: workerPosition,
  destination: destinationSite.location,
  intermediates: intermediateSites.map((site) => ({
    location: site.location,
    vehicleStopover: true,
  })),
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  optimizeWaypointOrder: intermediateSites.length >= 2,
  fields: [
    'path',
    'distanceMeters',
    'durationMillis',
    'legs',
    'optimizedIntermediateWaypointIndices',
    'viewport',
  ],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Running Locally

### 1. Configure `GOOGLE_MAPS_API_KEY`

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

#### Option A: Free Maps Demo Key (Fastest for Prototyping — No Billing Required)

1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate / reveal your Maps Demo Key.
5. Paste the key into `.env` as `GOOGLE_MAPS_API_KEY=...`.

> **Note:** The Maps Demo Key has a daily reset limit and is intended only for prototyping, not production workloads.

#### Option B: Production Google Cloud API Key

1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key by HTTP Referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Install, Typecheck, Build & Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200`.

## Compliance & Terms

- Use of Google Maps Platform APIs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- All place names, addresses, and route metrics are fetched dynamically at runtime from Google Maps Platform APIs.

## Related Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
