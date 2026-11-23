# AGENTS.md — Google Maps Platform Engineering Rules (`angular`)

This repository implements **Hyperlocal Neighborhood Directory & Spot Mapper** using **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used Here

- **Loader:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()` for `'maps'`, `'marker'`, `'places'`, `'geocoding'`, `'core'`)
- **Map & Overlays:** `@angular/google-maps` (`GoogleMap` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `MapCircle`, `MapAdvancedMarker`)
- **Markers:** `google.maps.marker.AdvancedMarkerElement` + `google.maps.marker.PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`) with weekly-channel `mapClick` (`'click'`) events
- **Places API (New):**
  - `<gmp-place-autocomplete>` (`PlaceAutocompleteElement` with `CUSTOM_ELEMENTS_SCHEMA`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields()`)
  - `Place.searchNearby()`
  - `Place.searchByText()`
  - `place.fetchFields()` (inspecting `regularOpeningHours.weekdayDescriptions`, `reviews`, `photos`, `priceLevel`, `rating`, `userRatingCount`)
- **Geocoding API:** `google.maps.Geocoder` (`geocoder.geocode({ address })` and `geocoder.geocode({ location })`)
- **Routes (if extended):** `Route.computeRoutes` via `importLibrary('routes')`
- **Usage Attribution:** `gmp_git_agentsamples_v1.0.0` configured on `MapOptions`, `PlaceAutocompleteElement`, and `Place` search requests

## Mandatory Rules for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` or `<map-marker>` -> ALWAYS use `AdvancedMarkerElement` / `<map-advanced-marker>`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` -> ALWAYS use `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`), `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchNearby`, `Place.searchByText`, or `place.fetchFields()`.
   - NEVER listen to retired `gmp-placeselect` -> ALWAYS listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` -> ALWAYS use `Route.computeRoutes` (`importLibrary('routes')`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` -> ALWAYS use `setOptions()` + `importLibrary()`.
   - NEVER use deprecated `PinElement.element` or `PinElement.glyph` -> pass `PinElement` directly to `[content]` and configure `glyphText` / `glyphSrc`.
   - NEVER call beta-only `place.isOpen()` or `gmp-click` when loading the `v: 'weekly'` channel.
2. **NEVER install or import banned wrapper libraries:**
   - Do NOT install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy non-Angular wrappers.
3. **Security & Compliance:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in `environment.ts`, HTML, or TypeScript files. Always inject via `serve-dist.mjs` (`/env-config.js`) from `.env`.
   - NEVER call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com` REST endpoints directly from browser `fetch()` (CORS-blocked).
   - NEVER fabricate place ratings, reviews, or opening hours in source code; always fetch live data from Google Maps Platform APIs.
   - Keep `serve-dist.mjs` bound strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.ts`](./src/app/app.ts), [`src/app/services/google-maps-loader.service.ts`](./src/app/services/google-maps-loader.service.ts)
- **Places, Routes & Geo Services:** [`src/app/components/header-bar.component.ts`](./src/app/components/header-bar.component.ts), [`src/app/services/google-maps-loader.service.ts`](./src/app/services/google-maps-loader.service.ts), [`src/app/services/neighborhood-discovery.service.ts`](./src/app/services/neighborhood-discovery.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./serve-dist.mjs)

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
