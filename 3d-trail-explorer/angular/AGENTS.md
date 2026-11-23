# Agent Instructions — Lake Tahoe 3D Trail Explorer (Angular)

This repository implements the **Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route** using **Angular Standalone Components + TypeScript** and modern, zero-deprecation **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Dynamic API Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Photorealistic 3D Maps (`maps3d` library):**
  - `Map3DElement` (`<gmp-map-3d>`) with `mode` (`'HYBRID'` / `'SATELLITE'`), `flyCameraTo()`, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`).
  - `Polyline3DElement` with `path`, `strokeColor: 'rgb(255, 0, 0)'`, `altitudeMode: 'RELATIVE_TO_GROUND'`, and `extruded: true`.
  - `Marker3DInteractiveElement` + `PopoverElement` listening to `gmp-click`.
- **Markers (`marker` library & `@angular/google-maps`):**
  - `PinElement` using `glyphText` (NEVER `.glyph` or `.element`).
  - `AdvancedMarkerElement` / `<map-advanced-marker>` (`MapAdvancedMarker` from `@angular/google-maps`) with `mapId: 'DEMO_MAP_ID'`.
- **Places API (New) (`places` library):**
  - `PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`.
  - `Place.searchByText()` with explicit `fields`.
- **Elevation API (`elevation` library):**
  - `ElevationService.getElevationAlongPath()` and `ElevationService.getElevationForLocations()`.

## Strict Prohibitions for Future Agents

NEVER introduce any of the following deprecated, disabled, or insecure patterns:
- NEVER use `google.maps.Marker` or `@angular/google-maps` `<map-marker>`. Always use `AdvancedMarkerElement` / `MapAdvancedMarker` or `Marker3DInteractiveElement`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- NEVER listen to the retired `gmp-placeselect` event; always listen to `gmp-select`.
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use `Route.computeRoutes` / Routes API v2).
- NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
- NEVER use deprecated `Polyline3DElement.coordinates` (use `path`), `Map3DElement.defaultUIDisabled` (use `defaultUIHidden`), or `PinElement.element` / `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`).
- NEVER install `@googlemaps/extended-component-library` (`<gmpx-*>`).
- NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files, `environment.ts`, or `.env.example`. Always inject at runtime via `serve-dist.mjs` (`/env-config.js`) reading `.env`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; always build DOM nodes via `document.createElement()` and `textContent`.
- NEVER bind `serve-dist.mjs` to `0.0.0.0`; bind strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/components/trail-map-2d/trail-map-2d.component.ts`](./src/app/components/trail-map-2d/trail-map-2d.component.ts), [`src/app/components/trail-map-3d/trail-map-3d.component.ts`](./src/app/components/trail-map-3d/trail-map-3d.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/trail-geospatial.service.ts`](./src/app/services/trail-geospatial.service.ts)
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
