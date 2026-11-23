# AGENTS.md — Coding Agent Mandates for `complete-heatmap/angular`

This repository implements the **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used Here

- **Bootstrap & Library Loading:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`) loading `core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `elevation`, and `geometry`.
- **Attribution & Map ID:** `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Map & Markers:** `@angular/google-maps` `GoogleMap`, `MapAdvancedMarker` (`AdvancedMarkerElement`), `PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`), `MapPolygon`, `MapPolyline`, `MapInfoWindow`.
- **Heatmap Visualization:** `@deck.gl/aggregation-layers` `HeatmapLayer` mounted via `@deck.gl/google-maps` `GoogleMapsOverlay` (with graceful 2D fallback when WebGL2 is unavailable).
- **Places Search:** `Place.searchByText` (Places API New).
- **Evacuation Routing:** `Route.computeRoutes` (Routes API) combined with `geometry.poly.containsLocation` / `isLocationOnEdge` and `via: true` perimeter bypass waypoints.
- **Incident Enrichment:** `Geocoder` (reverse geocoding), `ElevationService` (`getElevationForLocations`), and Weather API v1 (`https://weather.googleapis.com/v1/currentConditions:lookup`).
- **Runtime Secrets:** `GOOGLE_MAPS_API_KEY` injected at runtime via `/env-config.js` served by `serve-dist.mjs` (reading `.env` / `process.env`, bound strictly to `127.0.0.1`).

## Strict Zero-Deprecation & Security Rules for Future Agents

NEVER introduce any of the following deprecated, disabled, or insecure patterns:

1. **NEVER use legacy markers:** Do NOT use `google.maps.Marker` or `<map-marker>`. Always use `AdvancedMarkerElement` / `<map-advanced-marker>` with `mapId`.
2. **NEVER use deprecated Places APIs:** Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`. Always use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchByText`, or `Place.searchNearby`. Never listen to `gmp-placeselect`.
3. **NEVER use legacy routing services:** Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`. Always use `Route.computeRoutes`.
4. **NEVER use deprecated visualization/drawing libraries:** Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`. Always use deck.gl `HeatmapLayer` via `GoogleMapsOverlay`.
5. **NEVER use `@googlemaps/js-api-loader` v1:** Do NOT use `new Loader(...).load()`. Always use `setOptions()` + `importLibrary()`.
6. **NEVER use deprecated `PinElement` properties:** Do NOT access `PinElement.element` or `PinElement.glyph`. Pass `PinElement` directly and use `glyphText` / `glyphSrc`.
7. **NEVER use banned wrappers or `gmpx-*` components:** Do NOT install `@googlemaps/extended-component-library`, `google-map-react`, `@react-google-maps/api`, etc.
8. **NEVER hardcode API keys or bind to `0.0.0.0`:** Always load `GOOGLE_MAPS_API_KEY` from `.env` via `/env-config.js` at runtime and bind servers strictly to `127.0.0.1`.
9. **NEVER hallucinate place data:** All shelters, ratings, addresses, and statuses must originate from live Places API (New) calls.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/app.component.ts`](./src/app/app.component.ts)
- **Places, Routes & Geo Services:** [`src/app/services/hazard-intelligence.service.ts`](./src/app/services/hazard-intelligence.service.ts)
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
