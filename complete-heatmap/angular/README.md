# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Angular Standalone Components + TypeScript (`@angular/google-maps`, `AdvancedMarkerElement`, `Place`, `Route.computeRoutes`, `Geocoder`, `ElevationService`, `Weather API`, `deck.gl HeatmapLayer`)

A cohesive civic flood/storm hazard monitoring, geotagged incident reporting, and flood-zone-bypass emergency shelter evacuation routing portal centered in **Miami, FL** (`25.7743, -80.1937`).

Built with **Angular 19 Standalone Components**, **TypeScript**, **`@angular/google-maps`** (`GoogleMap`, `MapAdvancedMarker`, `MapPolygon`, `MapPolyline`, `MapInfoWindow`), **`@googlemaps/js-api-loader`** (`setOptions` + `importLibrary`), and **`@deck.gl/aggregation-layers` / `@deck.gl/google-maps`** (`HeatmapLayer` via `GoogleMapsOverlay` with automatic WebGL2 fallback).

## Google Maps Platform APIs & Modern Classes Used

- **Maps JavaScript API (`maps`, `core`, `geometry`):** Interactive 2D vector map (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), flood-hazard zone `Polygon` overlays, `Polyline` evacuation paths, `InfoWindow`, and `geometry.poly` spatial intersection checks.
- **Advanced Markers (`marker`):** `MapAdvancedMarker` (`AdvancedMarkerElement`) with `PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`) for emergency shelters, clicked incident pins, and user-submitted reports.
- **deck.gl HeatmapLayer (`@deck.gl/aggregation-layers` + `@deck.gl/google-maps`):** High-density thermal incident visualization rendered through `GoogleMapsOverlay` (with graceful 2D circle fallback if WebGL2 is unavailable).
- **Places API (New) (`places`):** `Place.searchByText()` to query live Miami hospitals and community centers with ratings, operational status, and coordinates.
- **Routes API (`routes`):** `Route.computeRoutes()` with candidate `via: true` perimeter waypoints to compute evacuation routes that avoid active flood-hazard zone polygons.
- **Geocoding API (`geocoding`):** `Geocoder.geocode({ location })` for parallel reverse-geocoding of clicked map coordinates.
- **Elevation API (`elevation`):** `ElevationService.getElevationForLocations()` for terrain elevation above mean sea level in meters.
- **Weather API (REST v1):** `https://weather.googleapis.com/v1/currentConditions:lookup` for live Miami wind speed, gusts, direction, temperature, and precipitation probability/QPF.

> See the [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0), [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0), [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0), [Weather API Overview](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Quickstart & API Key Setup

### 1. Obtain a Free Maps Demo Key (Prototyping) or Cloud API Key

For zero-cost prototyping (no billing account required, subject to daily limits and demo terms):

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with your Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.

For production deployments, create and restrict a key in the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) (HTTP referrer + API restrictions for Maps JavaScript API, Places API New, Routes API, Geocoding API, Elevation API, and Weather API).

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

Never hardcode your API key in source files or `environment.ts`. At runtime, `serve-dist.mjs` reads `GOOGLE_MAPS_API_KEY` from `.env` (or `process.env`) and serves `/env-config.js` dynamically on `127.0.0.1`.

### 3. Install, Typecheck, Build & Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

## Architecture Summary & Core Implementation Snippet

- **`GoogleMapsLoaderService`** ([`src/app/services/google-maps-loader.service.ts`](src/app/services/google-maps-loader.service.ts)): Reads `window.__ENV__.GOOGLE_MAPS_API_KEY`, configures `@googlemaps/js-api-loader` via `setOptions()`, and dynamically loads `core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `elevation`, and `geometry`.
- **`HazardIntelligenceService`** ([`src/app/services/hazard-intelligence.service.ts`](src/app/services/hazard-intelligence.service.ts)): Parallelizes `Geocoder.geocode()`, `ElevationService.getElevationForLocations()`, and Weather API `currentConditions:lookup`; searches Miami emergency shelters via `Place.searchByText()`; and verifies flood-polygon avoidance via `geometry.poly.containsLocation()` + `Route.computeRoutes()` perimeter waypoints.
- **`AppComponent`** ([`src/app/app.component.ts`](src/app/app.component.ts)): Standalone Angular UI hosting the split-screen command dashboard, `<google-map>`, `<map-advanced-marker>`, `<map-polygon>`, `<map-polyline>`, `<map-info-window>`, and `deck.gl` `GoogleMapsOverlay` (`HeatmapLayer`).

```typescript
// Core flood-zone-bypass evacuation routing & Places API (New) shelter lookup
const { places } = await libs.places.Place.searchByText({
  textQuery: 'hospital and community center in Miami, FL',
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating', 'businessStatus'],
  locationBias: { center: origin, radius: 12000 },
  maxResultCount: 10,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await libs.routes.Route.computeRoutes({
  origin,
  destination: shelter.location,
  intermediates: [{ location: safePerimeterWaypoint, via: true }],
  travelMode: 'DRIVING',
  fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'localizedValues'],
});
```

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
