# Agent Guidelines — Angular Travel Route Comparator

This repository implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs in Use

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Map & Markers:** `@angular/google-maps` `GoogleMap`, `MapAdvancedMarker` (`google.maps.marker.AdvancedMarkerElement`), `PinElement` (passing `PinElement` directly to `[content]` with `glyphText`), `MapPolyline`, `MapBicyclingLayer`, `MapTransitLayer`, `MapTrafficLayer`, configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Places API (New):** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>` with `CUSTOM_ELEMENTS_SCHEMA`) listening to the `gmp-select` event (`event.placePrediction.toPlace()` → `place.fetchFields()`), plus `Place.searchByText()` for seeded Denver/Boulder lookups.
- **Routes API:** `Route.computeRoutes()` via `importLibrary('routes')` with explicit `fields`, `routeModifiers`, `computeAlternativeRoutes`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Elevation API:** `ElevationService.getElevationAlongPath()` via `importLibrary('elevation')` with 64 path samples.
- **Runtime Secrets:** `GOOGLE_MAPS_API_KEY` is read from `.env` by `serve-dist.mjs` and served at `/env-config.js`. Never hardcode API keys in `src/` or `environment.ts`.

## Forbidden Deprecated / Legacy APIs (NEVER Introduce)

Future coding agents **MUST NOT** introduce any of the following deprecated, disabled, or banned symbols/packages:

- `google.maps.Marker` or `<map-marker>` (use `MapAdvancedMarker` / `AdvancedMarkerElement`)
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or `gmp-placeselect` (use `PlaceAutocompleteElement` + `gmp-select`, `AutocompleteSuggestion`, `Place.searchByText`, `Place.fetchFields`)
- `DirectionsService`, `DirectionsRenderer`, `MapDirectionsService`, `MapDirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `new Loader(...)` from `@googlemaps/js-api-loader` v1 (use `setOptions` + `importLibrary`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Direct client-side `fetch()` calls to `routes.googleapis.com`, `places.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com`
- `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`
- Binding servers to `0.0.0.0` (always bind strictly to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html)
- **Places, Routes & Geo Services:** [`src/app/components/place-picker/place-picker.component.ts`](./src/app/components/place-picker/place-picker.component.ts), [`src/app/services/route-comparator.service.ts`](./src/app/services/route-comparator.service.ts)
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
