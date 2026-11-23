# Multi-Modal Commute Comparator & Trail Elevation Tracker — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components: `Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `ElevationService`)

A standalone, zero-deprecation geospatial web application built with **SvelteKit + TypeScript** that compares multi-modal routes (**Driving**, **Cycling**, **Walking**, **Transit**) between **Denver Union Station, Denver, CO** and **Chautauqua Park, Boulder, CO**, with interactive route modifiers (**Avoid Tolls**, **Avoid Highways**, **Eco-Friendly `FUEL_EFFICIENT`**) and a live **Elevation & Slope Profile** synchronized with a hover marker on the map.

---

## Features & Modern Google Maps Platform APIs

- **Maps JavaScript API (`Map`, `Polyline`, `BicyclingLayer`)**: Vector map initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, interactive clickable route polylines, and `BicyclingLayer` enabled in Cycling mode.
- **Advanced Markers (`AdvancedMarkerElement`, `PinElement`)**: Origin (`A`), Destination (`B`), and elevation-chart synchronized hover marker (`▲`) rendered via `PinElement` with `glyphText` (never legacy `google.maps.Marker`).
- **Places API (New) (`Place.searchByText`, `PlaceAutocompleteElement`)**: Seeds Denver Union Station and Chautauqua Park live at startup, and mounts native `PlaceAutocompleteElement` inputs listening to the modern `gmp-select` event (`event.placePrediction.toPlace().fetchFields()`).
- **Routes API (`Route.computeRoutes`)**: Computes comparative travel times, distances, alternative routes, toll advisories (`TOLLS`), estimated fuel consumption (`FUEL_CONSUMPTION`), and eco-friendly `FUEL_EFFICIENT` routes without legacy `DirectionsService`.
- **Elevation API (`ElevationService.getElevationAlongPath`)**: Samples 64 equidistant points along active cycling and walking routes to plot cumulative elevation gain, min/max altitude, and grade `%`, scrubbing a live `AdvancedMarkerElement` along the map polyline.

---

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Prototyping — No Billing Required)
1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate / reveal your Demo Key.

> **Note:** The Maps Demo Key has daily quota limits and is intended for prototyping only, not production workloads.

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable the **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
3. Restrict the key by **HTTP referrer** and **API restrictions** following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

---

## Architecture Summary

- **SSR-Safe Dynamic Loading (`src/lib/maps/loader.ts`)**: Guards `window` checks inside SvelteKit `onMount`, reads `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` (avoiding build-time secret baking), and uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) to load `core`, `maps`, `marker`, `places`, `routes`, and `elevation`.
- **Live Seeded Places & Autocomplete (`src/lib/maps/places.ts`)**: Resolves initial Denver/Boulder landmarks via `Place.searchByText` and mounts `PlaceAutocompleteElement` instances imperatively with `gmp-select` listeners.
- **Multi-Modal Routing (`src/lib/maps/routes.ts`)**: Queries `Route.computeRoutes` across `DRIVING`, `BICYCLING`, `WALKING`, and `TRANSIT`, supporting `avoidTolls`, `avoidHighways`, and `FUEL_EFFICIENT` reference routing in Driving mode, plus beta path advisories for Cycling and Walking.
- **Synchronized Elevation & Slope Profile (`src/lib/maps/elevation.ts`, `src/lib/components/ElevationChart.svelte`)**: Samples 64 points via `ElevationService.getElevationAlongPath` and renders an interactive SVG profile chart synced bidirectionally with an `AdvancedMarkerElement` on the map.

### Core Implementation Snippet

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  libraries: ['core', 'maps', 'marker', 'places', 'routes', 'elevation']
});

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place, PlaceAutocompleteElement }, { Route }, { ElevationService }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('elevation')
  ]);

const map = new Map(mapContainer, {
  center: { lat: 39.884, lng: -105.135 },
  zoom: 11,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { routes } = await Route.computeRoutes({
  origin: origin.location,
  destination: destination.location,
  travelMode: 'BICYCLING',
  computeAlternativeRoutes: true,
  fields: ['description', 'distanceMeters', 'durationMillis', 'path', 'routeLabels', 'warnings']
});
```

---

## Documentation & Terms

- [Google Maps Platform JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Overview](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
