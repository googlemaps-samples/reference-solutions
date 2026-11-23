# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components)

A standalone civic flood/storm hazard monitor, citizen incident reporter, and safe-shelter evacuation routing portal centered in Miami, FL (`25.7743, -80.1937`), built with **SvelteKit + TypeScript** and zero-deprecation **Google Maps Platform** APIs (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, `ElevationService`, `geometry.poly`, Weather API v1) alongside **deck.gl** (`HeatmapLayer` via `GoogleMapsOverlay`).

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `core`, `marker`, `geometry`)**: Vector `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `Polygon` flood-hazard zones, `Polyline`, `InfoWindow`, `AdvancedMarkerElement`, `PinElement` (`glyphText`), and `geometry.poly.containsLocation`.
- **deck.gl + Google Maps Overlay (`@deck.gl/aggregation-layers`, `@deck.gl/google-maps`)**: `HeatmapLayer` rendered via `GoogleMapsOverlay` with automatic non-WebGL2 fallback for headless environments.
- **Places API (New) (`places`)**: `Place.searchByText` for nearby Miami hospitals and community centers, plus `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
- **Routes API (`routes`)**: `Route.computeRoutes` with perimeter `via` intermediate waypoints to detour around active flood-hazard polygons.
- **Geocoding API (`geocoding`)**: `Geocoder.geocode` for reverse-geocoding clicked map coordinates.
- **Elevation API (`elevation`)**: `ElevationService.getElevationForLocations` for terrain elevation in meters above sea level.
- **Weather API (`weather.googleapis.com/v1/currentConditions:lookup`)**: Live wind speed, wind gusts, direction, and precipitation probability/QPF.

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Prototyping (Maps Demo Key)
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project setup required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate/reveal your Demo Key. *(Note: Maps Demo Keys have daily quota limits and are for prototyping only, not production.)*

#### Option B: Production Google Cloud API Key
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, **Elevation API**, and **Weather API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [restrict your key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) by HTTP referrer and allowed APIs.

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture Summary

- **SSR-Safe Bootstrap (`src/routes/+page.svelte`)**: Reads `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` and initializes `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) strictly inside Svelte's `onMount` lifecycle so SSR never touches `window` or `document`.
- **Client SDK Wrappers (`src/lib/maps/gmpClient.ts`)**: Implements parallel map-click enrichment (reverse geocoding, terrain elevation, live weather), `Place.searchByText` shelter discovery, safe DOM `InfoWindow` construction (zero `innerHTML`), and `Route.computeRoutes` flood-zone perimeter bypass routing using `geometry.poly.containsLocation`.
- **Heatmap Layer (`src/lib/maps/heatmapOverlay.ts`)**: Dynamically imports `@deck.gl/google-maps` (`GoogleMapsOverlay`) and `@deck.gl/aggregation-layers` (`HeatmapLayer`) when WebGL2 is available, falling back cleanly to Google Maps `Circle` thermal markers in GPU-less headless environments.

### Core Implementation Snippet

```typescript
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  mapIds: ['DEMO_MAP_ID'],
  solutionChannel: 'gmp_git_agentsamples_v1.0.0'
});

const [{ Map }, { Route }, { Place }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('routes'),
  importLibrary('places')
]);

const map = new Map(container, {
  center: { lat: 25.7743, lng: -80.1937 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { routes } = await Route.computeRoutes({
  origin,
  destination,
  intermediates: [{ location: safePerimeterWaypoint, via: true }],
  travelMode: 'DRIVING',
  fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues', 'legs'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

## Compliance & Terms of Service

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- This portal is strictly an informational civic planning tool and **must not** be used for life-critical emergency dispatch or 911 operations.

## Other Standalone Sample Stacks

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
