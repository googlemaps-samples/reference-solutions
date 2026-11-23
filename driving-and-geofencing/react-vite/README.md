# Field Workforce Geofenced Attendance & Site Audit Router — React + Vite + TypeScript (`@vis.gl/react-google-maps`)

An Austin, TX field workforce attendance check-in and multi-site store audit router built with **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** using modern Google Maps Platform APIs: `AdvancedMarker` (`AdvancedMarkerElement`), `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, `google.maps.geometry.poly.containsLocation`, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`).

---

## Features & Modern Google Maps Platform APIs

- **Interactive Austin Map (`@vis.gl/react-google-maps`)**: Centered on Austin (`30.2672, -97.7431`, zoom `12`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Pre-Seeded & Supervisor-Drawn Geofences (`google.maps.Polygon` + Terra Draw)**:
  - Renders 3 pre-seeded Austin client site geofence polygons (Congress Ave Flagship, South Congress SoCo, East Austin Logistics Hub).
  - Integrates [Terra Draw](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0) via `TerraDrawGoogleMapsAdapter` so supervisors can draw new polygon geofence zones, edit vertices, or clear custom polygons.
- **Geofence Entry/Exit Detection (`google.maps.geometry.poly.containsLocation`)**:
  - Simulates worker GPS presets inside and outside active geofences and unlocks or locks the **Verified Clock-In** badge in real time across both pre-seeded and newly drawn polygons.
- **Live Reverse Geocoding (`Geocoder`)**:
  - Converts the simulated worker's latitude/longitude coordinates into a human-readable Austin street address via the [Maps JavaScript API Geocoding library](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Live Site Discovery (`Place.searchByText` & `PlaceAutocompleteElement`)**:
  - Discovers Austin retail audit sites via [Places API (New) Text Search](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (`retail stores in Austin, TX`) and supports quick-adding stops via an imperatively mounted `PlaceAutocompleteElement` listening to `gmp-select`.
- **Optimized Multi-Stop Driving Route (`Route.computeRoutes`)**:
  - Computes a traffic-aware, waypoint-optimized driving route (`optimizeWaypointOrder: true`) via the [Routes library](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0), rendering route polylines via `route.createPolylines()` and numbered `AdvancedMarker` pins (`<Pin glyphText={...} />`) with `InfoWindow` leg details.

---

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Prototyping — No Billing Required)
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and reveal your Demo Key. *(Note: subject to daily quota limits; not for production use.)*

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key by **HTTP referrer** and **API restrictions** following [Add Restrictions to API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For development mode with HMR:
```bash
npm run dev
```

---

## Architecture & Core Snippet

- `src/App.tsx`: Orchestrates `APIProvider`, geofence containment (`geometry.poly.containsLocation`), reverse geocoding (`Geocoder`), live retail audit discovery (`Place.searchByText`), and multi-stop route optimization (`Route.computeRoutes`).
- `src/hooks/useTerraDraw.ts`: Attaches `TerraDraw` + `TerraDrawGoogleMapsAdapter` once the map projection is ready and syncs drawn polygons into application state.
- `src/components/AustinOperationsMap.tsx`: Renders the `@vis.gl/react-google-maps` `<Map>`, floating Terra Draw toolbar, pre-seeded polygons, optimized route polylines, worker `AdvancedMarker`, and numbered audit stop `AdvancedMarker` + `Pin` elements.
- `src/components/OperationsSidebar.tsx`: Split-screen operations panel with Worker GPS & Geofenced Attendance, Geofence Zones & Terra Draw Controls, and Multi-Stop Audit Router cards.

```tsx
const { routes } = await routesLib.Route.computeRoutes({
  origin: workerPosition,
  destination: destinationStop.location,
  intermediates: intermediatesInput.map((site) => ({ location: site.location })),
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  optimizeWaypointOrder: true,
  fields: [
    'path',
    'legs',
    'distanceMeters',
    'durationMillis',
    'optimizedIntermediateWaypointIndices',
    'viewport',
  ],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

---

## Compliance & Terms

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Place data, street addresses, and routes are fetched live at runtime via official Google Maps Platform SDKs—never hardcoded from static memory.

---

## Standalone Sample Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
