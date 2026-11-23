# Coding Agent Guidelines — Google Maps Platform (Angular)

This Angular application strictly adheres to the **Zero-Deprecation Google Maps Platform Mandate**. Any coding agent modifying or extending this repository MUST maintain full compliance with the rules below.

## Modern Google Maps Platform APIs Used

- **Bootstrap & Dynamic Loading:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary('core' | 'maps' | 'marker' | 'places' | 'elevation')`).
- **Angular Map Component:** `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`) with `schemas: [CUSTOM_ELEMENTS_SCHEMA]` for `<gmp-*>` web components.
- **Map Initialization & Attribution:** `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` passed in `google.maps.MapOptions`.
- **Markers:** `MapAdvancedMarker` / `AdvancedMarkerElement` (never legacy `google.maps.Marker` or `<map-marker>`).
- **Places Search & Autocomplete:**
  - `Place.searchByText()` (`importLibrary('places')`) with explicit `fields`.
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
- **Elevation:** `ElevationService` (`importLibrary('elevation')`).
- **GeoJSON Zones:** `google.maps.Data` (`map.data.addGeoJson`).
- **Drawing Tools:** `terra-draw` + `terra-draw-google-maps-adapter` (`isolatedData: true`).
- **Large-Scale Point/Hex Visualization:** `@deck.gl/google-maps` (`GoogleMapsOverlay`) with `@deck.gl/layers` (`ScatterplotLayer`) and `@deck.gl/aggregation-layers` (`HexagonLayer`), guarded by `WebGL2` availability checks.

## Strictly Forbidden Legacy / Deprecated APIs & Packages

NEVER introduce any of the following:

- `google.maps.Marker` or `<map-marker>`
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
- `gmp-placeselect` (retired event — always use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use `Route.computeRoutes` or Routes API v2)
- `google.maps.drawing` (always use Terra Draw)
- `google.maps.visualization.HeatmapLayer` (always use `@deck.gl/aggregation-layers` `HeatmapLayer` with `GoogleMapsOverlay`)
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or banned wrapper packages (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`)
- Hardcoded API keys in source files, `environment.ts`, or `.env.example` (always inject `GOOGLE_MAPS_API_KEY` at runtime via `serve-dist.mjs` `/env-config.js`)
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` (use `document.createElement`, `textContent`, `replaceChildren`)
- Binding local servers to `0.0.0.0` (strictly bind to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/spatial-gis.service.ts`](./src/app/services/spatial-gis.service.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/spatial-gis.service.ts`](./src/app/services/spatial-gis.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./src/app/app.component.ts)

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
