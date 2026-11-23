# Coding Agent Guidelines — Field Workforce Geofenced Attendance & Site Audit Router (Angular)

This Angular standalone application enforces a strict **Zero-Legacy Google Maps Platform Mandate** and runtime API key security model. Future coding agents modifying this repository MUST follow these rules.

## Modern Google Maps Platform APIs Used Here

- **Loader:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`)
- **Angular Map Wrapper:** `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`, `MapPolygon`, `MapPolyline`, `MapInfoWindow`) with `schemas: [CUSTOM_ELEMENTS_SCHEMA]`
- **Map Initialization:** `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Markers & Pins:** `AdvancedMarkerElement` (`<map-advanced-marker>`) and `PinElement` using `glyphText`, `background`, `borderColor`, `glyphColor`
- **Places Discovery:** `Place.searchByText()` (`importLibrary('places')`) with explicit `fields` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Multi-Stop Routing & Waypoint Optimization:** `Route.computeRoutes()` (`importLibrary('routes')`) with `optimizeWaypointOrder: true` and `routingPreference: 'TRAFFIC_AWARE'`
- **Reverse Geocoding:** `Geocoder.geocode({ location })` (`importLibrary('geocoding')`)
- **Geofence Containment:** `google.maps.geometry.poly.containsLocation()` (`importLibrary('geometry')`)
- **Polygon Drawing:** `TerraDraw` + `TerraDrawGoogleMapsAdapter` (`terra-draw` + `terra-draw-google-maps-adapter`)

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

NEVER introduce any of the following in this project:

1. `google.maps.Marker` or `<map-marker>` — always use `AdvancedMarkerElement` / `<map-advanced-marker>` with a valid `mapId`.
2. `google.maps.places.PlacesService`, `Autocomplete`, `AutocompleteService`, or `SearchBox` — always use `Place.searchByText`, `Place.searchNearby`, `PlaceAutocompleteElement` (`gmp-select`), or `AutocompleteSuggestion.fetchAutocompleteSuggestions`.
3. `google.maps.DirectionsService`, `DirectionsRenderer`, `MapDirectionsService`, `MapDirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes()` or `RouteMatrix`.
4. `google.maps.drawing` (`DrawingManager`) — always use `TerraDraw` + `TerraDrawGoogleMapsAdapter`.
5. `google.maps.visualization.HeatmapLayer` or `MapHeatmapLayer`.
6. `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use v2 `setOptions()` + `importLibrary()`.
7. `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and configure `glyphText` / `glyphSrc`.
8. `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy event `gmp-placeselect`.
9. Direct browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, `geocode.googleapis.com`, or `addressvalidation.googleapis.com` (blocked by CORS in browser-only apps).
10. Hardcoding `GOOGLE_MAPS_API_KEY` anywhere in source files, `environment.ts`, or `.env.example`. Always load it at runtime via `serve-dist.mjs` (`/env-config.js`) from `.env` or `process.env`.
11. Binding `serve-dist.mjs` to anything other than `127.0.0.1` / `localhost`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/app.component.ts`](./src/app/app.component.ts)
- **Places, Routes & Geo Services:** [`src/app/services/google-maps.service.ts`](./src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./serve-dist.mjs), [`src/app/app.component.ts`](./src/app/app.component.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit && node --check serve-dist.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node serve-dist.mjs --host 127.0.0.1 --port 4176
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
