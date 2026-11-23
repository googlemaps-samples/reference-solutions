# Agent Guidelines — Google Maps Platform (Angular Standalone)

This repository implements the **Single-Venue Storefront, Booking & Get Directions Hub** in **Angular Standalone Components + TypeScript (`@angular/google-maps`)** using strictly modern, non-deprecated Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Loader**: `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`).
- **Map & Markers**: `@angular/google-maps` `GoogleMap`, `MapAdvancedMarker` (`google.maps.marker.AdvancedMarkerElement`), `MapCircle`, `MapPolyline`, and `MapInfoWindow`, configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Places API (New)**: `Place.searchByText()` with explicit camelCase `fields`, `Photo.getURI()`, and `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` -> `event.placePrediction.toPlace().fetchFields(...)`.
- **Routes API**: `Route.computeRoutes()` via `importLibrary('routes')` with explicit `fields` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Street View & Geometry**: `StreetViewService.getPanorama()`, `StreetViewPanorama`, and `geometry.spherical.computeHeading()`.

## Strict Prohibitions for Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs**:
   - NEVER use `google.maps.Marker` or `@angular/google-maps` `<map-marker>` — ALWAYS use `<map-advanced-marker>` / `AdvancedMarkerElement`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, or `Place.searchByText` / `Place.fetchFields`.
   - NEVER listen to the retired `gmp-placeselect` event — ALWAYS listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, `MapDirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes`.
   - NEVER use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1 — ALWAYS use v2 `setOptions()` + `importLibrary()`.
   - NEVER use `@googlemaps/extended-component-library` (`<gmpx-*>`) or `PinElement.element` / `PinElement.glyph`.
   - NEVER call beta-only `place.isOpen()` on the `weekly` channel — derive open/closed status from `regularOpeningHours.periods` and `utcOffsetMinutes` (or explicitly switch to `v: 'beta'`).
2. **Security & Privacy**:
   - NEVER hardcode API keys in source files or `.env.example`; inject at runtime via `serve-dist.mjs` (`/env-config.js`) reading `GOOGLE_MAPS_API_KEY`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
   - NEVER bind local servers to `0.0.0.0`; bind strictly to `127.0.0.1`.
   - NEVER send protected health information (PHI) to Google Maps Platform APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/components/clinic-map/clinic-map.component.ts`](./src/app/components/clinic-map/clinic-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/directions-planner/directions-planner.component.ts`](./src/app/components/directions-planner/directions-planner.component.ts), [`src/app/services/google-maps.service.ts`](./src/app/services/google-maps.service.ts)
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
