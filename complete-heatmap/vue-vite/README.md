# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements: `Map`, `AdvancedMarkerElement`, `PinElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, `ElevationService`, `geometry.poly`, deck.gl `HeatmapLayer`)

A standalone civic flood/storm hazard monitor, citizen incident reporter, and safe-shelter evacuation router centered in Miami, FL (`25.7743, -80.1937`), built with **Vue 3**, **Vite**, **TypeScript**, **`@googlemaps/js-api-loader` v2**, and **deck.gl** (`@deck.gl/google-maps` + `@deck.gl/aggregation-layers`).

## Key Capabilities

- **High-Density Hazard Heatmap & Active Flood-Hazard Zones:** Renders a `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay` (with automatic Canvas `Circle` fallback in headless/non-WebGL2 environments) alongside clickable semi-transparent `google.maps.Polygon` flood-hazard zones.
- **Parallel Civic Incident Enrichment:** Clicking anywhere on the map drops an `AdvancedMarkerElement` (`PinElement`) and enriches the report in parallel using:
  - **Geocoding API** (`Geocoder.geocode`) for street-level reverse geocoding
  - **Elevation API** (`ElevationService.getElevationForLocations`) for terrain elevation above mean sea level
  - **Weather API** (`weather.googleapis.com/v1/currentConditions:lookup`) for live wind speed, gusts, and precipitation conditions
- **Dynamic Heatmap Updates:** Residents select a hazard type and click **Log Hazard Report** to append their geotagged report directly into the live `HeatmapLayer`.
- **Emergency Shelter Search (`Places API New`):** Queries nearby hospitals and community centers via `Place.searchByText()` with explicit `fields` and renders custom `PinElement` `AdvancedMarkerElement` markers.
- **Flood-Zone-Bypass Evacuation Routing (`Routes API` + `geometry.poly`):** Computes driving evacuation routes via `Route.computeRoutes()`, checks every route segment against active flood-hazard polygons via `geometry.poly.containsLocation()` / `isLocationOnEdge()`, and automatically injects safe perimeter `via` waypoints to bypass flooded corridors.

## Quickstart & API Key Setup

> **Cost Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account once moving to production. For zero-cost prototyping, use a free **Maps Demo Key** (subject to daily reset limits and not for production).

### 1. Obtain an API Key

- **Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
  1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with a Google account (no billing card required) and accept the Demo Project Terms.
  3. Generate and copy your Demo Key.
- **Option B — Production Google Cloud Key:**
  1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
  2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, **Elevation API**, and **Weather API**.
  3. Restrict your key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
```

### 3. Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with HMR:

```bash
npm run dev
```

## Architecture Summary & Core Implementation

- [`src/services/mapsLoader.ts`](src/services/mapsLoader.ts) configures `@googlemaps/js-api-loader` v2 via `setOptions()` and loads `core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `elevation`, and `geometry` with `importLibrary()`.
- [`vite.config.ts`](vite.config.ts) registers `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-*>` Web Components work seamlessly inside Vue templates.
- [`src/components/HazardMap.vue`](src/components/HazardMap.vue) initializes the 2D vector map with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, mounts the `deck.gl` `HeatmapLayer`, renders flood polygons, and draws `Route.createPolylines()` bypass paths.
- [`src/services/shelterRouting.ts`](src/services/shelterRouting.ts) performs `Place.searchByText()` shelter discovery and iterative `via`-waypoint bypass calculation via `Route.computeRoutes()`.

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  mapIds: ['DEMO_MAP_ID'],
  solutionChannel: 'gmp_git_agentsamples_v1.0.0',
});

const [{ Map }, { Place }, { Route }, { poly }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('places'),
  importLibrary('routes'),
  importLibrary('geometry'),
]);

const map = new Map(containerEl, {
  center: { lat: 25.7743, lng: -80.1937 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) — Text Search](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API — Compute Routes](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Weather API — Current Conditions](https://developers.google.com/maps/documentation/weather/current-conditions?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
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
