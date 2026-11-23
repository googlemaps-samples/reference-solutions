# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — React + Vite + TypeScript (`@vis.gl/react-google-maps`) using `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `RouteMatrix`, and Roads API `v1/snapToRoads`

A standalone Dallas fleet telematics, road-snapped GPS inspection, and multi-stop dispatch dashboard built with React, Vite, TypeScript, and [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/).

## Key Features

- **Distraction-Free Logistics Vector Map:** Renders a Dallas operations map (`mapId="DEMO_MAP_ID"`, `clickableIcons={false}`) with `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` and an interactive `TrafficLayer` toggle.
- **Status-Coded Fleet Markers & Telemetry Sidebar:** Displays active Dallas vehicles (`En Route`, `Delayed`, `Idle`) using `<AdvancedMarker>` and `<InfoWindow>`, synchronized with telemetry cards showing speed, next stop, live ETA, and status filters.
- **Noisy GPS Trace vs. Roads API Snap-to-Roads:** Sends raw corridor GPS breadcrumbs to a local Vite BFF proxy (`POST /api/roads/snap` -> `https://roads.googleapis.com/v1/snapToRoads?interpolate=true`) to render the raw dashed GPS trace alongside the road-snapped polyline, unique road segment `placeId` count, and mean GPS drift in meters via the Maps JS `geometry` library.
- **Live Dallas Hub Discovery & Multi-Stop Dispatch Matrix:** Discovers real Dallas distribution centers via `Place.searchByText`, allows adding facilities via an imperatively mounted `PlaceAutocompleteElement` (`gmp-select`), and computes multi-stop corridor routes (`Route.computeRoutes` with optional `optimizeWaypointOrder`) plus hub-to-stop travel-time matrices (`RouteMatrix.computeRouteMatrix`).

## Quickstart & API Key Setup

1. **Install dependencies:**
   ```bash
   npm install --no-audit --no-fund
   ```
2. **Configure `VITE_GOOGLE_MAPS_API_KEY`:**
   Copy `.env.example` to `.env.local` (git-ignored):
   ```bash
   cp .env.example .env.local
   ```
   - **Prototyping (Zero-Billing Maps Demo Key):**
     1. Open [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
     2. Sign in with any Google account and accept the Maps Demo Project Terms.
     3. Generate and copy the key into `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`.
     *(Note: The Maps Demo Key has a daily quota limit and supports Maps JS API, Places API (New), and Routes API; if Roads API `v1/snapToRoads` is not enabled on a demo key, the inspector cleanly falls back to Routes API corridor alignment.)*
   - **Production Key:** Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**, and apply HTTP referrer / API restrictions per [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **Run development or preview server:**
   ```bash
   npm run dev
   # or build & preview on 127.0.0.1:
   npm run build
   npx vite preview --host 127.0.0.1 --port 4173 --strictPort
   ```

## Architecture Summary & Core Implementation

- **Client SDK (`@vis.gl/react-google-maps`):** Initializes `<APIProvider>` with `libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}` and renders `<Map>` with `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Imperative Web Component (`PlaceSearchBar.tsx`):** Mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` and listens to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields()`.
- **Vite BFF Middleware (`vite.config.ts`):** Exposes `POST /api/roads/snap` in both `configureServer` and `configurePreviewServer`, keeping the Roads API REST call server-side without browser CORS traps and setting `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`.

```tsx
const [routesResponse, matrixResponse] = await Promise.all([
  routesLib.Route.computeRoutes({
    origin: depot.position,
    destination: finalStop.position,
    intermediates: intermediateStops.map((stop) => ({
      location: stop.position,
      sideOfRoad: true,
    })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: canOptimize,
    fields: [
      'durationMillis',
      'distanceMeters',
      'path',
      'legs',
      'optimizedIntermediateWaypointIndices',
    ],
  }),
  routesLib.RouteMatrix.computeRouteMatrix({
    origins: [depot.position],
    destinations: stops.map((stop) => stop.position),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: ['condition', 'distanceMeters', 'durationMillis'],
  }),
]);
```

## Documentation & Compliance Links

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Roads API Snap to Roads](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
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
