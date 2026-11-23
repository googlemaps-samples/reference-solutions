# Multi-Branch Store, ATM & Inventory Locator — Angular Standalone Components + TypeScript (@angular/google-maps)

Built with **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern, zero-deprecation Google Maps Platform SDK classes: `GoogleMap`, `MapAdvancedMarker`, `AdvancedMarkerElement`, `MarkerClusterer` (`SuperClusterAlgorithm`), `Place.searchByText`, `AutocompleteSuggestion`, `AutocompleteSessionToken`, `Place.fetchFields`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`.

## Features

- **Split-Screen NYC Branch Network**: Responsive desktop & mobile layout with a scrollable 420px branch directory alongside a full-height interactive Google Map centered on Manhattan (`40.7549, -73.9840`, zoom `12`).
- **Live Places API (New) Discovery**: Executes live `Place.searchByText` queries across New York City to load real Flagship Stores, Express Kiosks, and 24/7 ATMs with live ratings, addresses, coordinates, and `regularOpeningHours.weekdayDescriptions`.
- **Advanced Markers & Marker Clustering**: Uses `mapId: 'DEMO_MAP_ID'` and `@googlemaps/markerclusterer` (`SuperClusterAlgorithm` + custom `AdvancedMarkerElement` cluster renderer) to group dense NYC markers cleanly at city zoom and expand into distinct custom-styled `AdvancedMarkerElement` badges when zoomed in or when clicking a cluster.
- **Session-Tokenized Origin Search**: Searches customer starting locations with `AutocompleteSuggestion.fetchAutocompleteSuggestions` + `AutocompleteSessionToken` + `Place.fetchFields` (and `Geocoder` fallback on form submit), plus quick NYC landmark presets.
- **Live Road ETAs & Polyline Routing**: Computes live travel times and distances across all candidate branches via `RouteMatrix.computeRouteMatrix` (`DRIVE`, `WALK`, `TRANSIT`), ranks the **Fastest Nearby** branch, and draws the selected route polyline via `Route.computeRoutes` + `route.createPolylines()`.

## Quickstart

### 1. Obtain a Google Maps Platform API Key

For zero-billing prototyping, generate a free **Maps Demo Key** (no Google Cloud billing card required):
1. Open [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (note: demo keys have a daily reset limit and are for prototyping only).

For production deployments, create and restrict an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0), and enable:
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)

> Note: Usage of Google Maps Platform products and services may incur costs against your Google Cloud billing account when moving beyond the free Maps Demo Key.

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build, and Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser. `serve-dist.mjs` binds strictly to `127.0.0.1`, injects `GOOGLE_MAPS_API_KEY` from `.env` at runtime via `/env-config.js` (never hardcoded into Angular build artifacts), and serves the compiled Angular bundle.

## Architecture Summary

- **[`MapsLoaderService`](src/app/services/maps-loader.service.ts)**: Dynamically configures `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) before mounting `<google-map>`.
- **[`PlacesService`](src/app/services/places.service.ts)**: Runs live `Place.searchByText` queries, `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `AutocompleteSessionToken`, `Place.fetchFields`, and `Geocoder` fallback.
- **[`RoutesService`](src/app/services/routes.service.ts)**: Batches `RouteMatrix.computeRouteMatrix` requests to rank the fastest branch and computes single-route polylines via `Route.computeRoutes`.
- **[`LocatorMapComponent`](src/app/components/locator-map/locator-map.component.ts)**: Mounts `@angular/google-maps` `<google-map>` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) and `<map-advanced-marker>` for the customer origin, clusters branch `AdvancedMarkerElement` pins with `MarkerClusterer`, and renders `route.createPolylines()`.

### Core Implementation Snippet

```typescript
const { RouteMatrix, Route } = await google.maps.importLibrary('routes');

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [{ lat: origin.lat, lng: origin.lng }],
  destinations: branches.map((b) => ({ lat: b.lat, lng: b.lng })),
  travelMode: 'DRIVING' as google.maps.TravelMode,
  fields: ['distanceMeters', 'durationMillis', 'localizedValues', 'condition'],
});

const { routes } = await Route.computeRoutes({
  origin: { lat: origin.lat, lng: origin.lng },
  destination: { lat: selected.lat, lng: selected.lng },
  travelMode: 'DRIVING' as google.maps.TravelMode,
  fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'path', 'legs', 'viewport'],
});
const polylines = routes[0].createPolylines();
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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
