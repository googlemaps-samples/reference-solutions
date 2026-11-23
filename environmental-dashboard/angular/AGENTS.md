# Agent Guidelines — Environmental Dashboard (`angular`)

This standalone repository implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** using **Angular Standalone Components**, **TypeScript**, **`@angular/google-maps`**, and **`@googlemaps/js-api-loader` (`setOptions` + `importLibrary`)**.

## Modern Google Maps Platform APIs in Use

- **Maps JavaScript API (v2 Loader)**: `@googlemaps/js-api-loader` functional `setOptions()` and `importLibrary('maps' | 'marker' | 'places' | 'geocoding')`
- **Angular Map Wrapper**: `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`, `MapRectangle`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Markers & Pins**: `AdvancedMarkerElement` (`<map-advanced-marker>`) and `PinElement` (`glyphText`, `glyphColor`, `background`, `borderColor`)
- **Places API (New)**: `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`, plus server-side `places:searchText` with `X-Goog-FieldMask`
- **Geocoding**: `google.maps.Geocoder` (`importLibrary('geocoding')`) for map-click reverse geocoding
- **Air Quality Tile Overlay**: Native `google.maps.ImageMapType` proxied via `/api/air-quality/tiles` (no WebGL dependency)
- **Environmental Web Services (via `serve-dist.mjs` BFF)**:
  - Weather API: `currentConditions:lookup`, `forecast/days:lookup`
  - Air Quality API: `currentConditions:lookup`, `mapTypes/US_AQI/heatmapTiles`
  - Pollen API: `forecast:lookup`
  - Solar API: `buildingInsights:findClosest`

## Strict Zero-Deprecation Rules for Future Coding Agents

1. **NEVER** replace `MapAdvancedMarker` / `AdvancedMarkerElement` with deprecated `google.maps.Marker` or `<map-marker>`.
2. **NEVER** use deprecated `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event. Always use `PlaceAutocompleteElement` with `gmp-select`, `AutocompleteSuggestion`, or `Place.searchByText`.
3. **NEVER** use deprecated `PinElement.element` or `PinElement.glyph`; pass `PinElement` directly to `content` and use `glyphText` / `glyphSrc`.
4. **NEVER** use deprecated `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`; always use `Route.computeRoutes` or Routes API v2.
5. **NEVER** use deprecated `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`; always use v2 `setOptions()` + `importLibrary()`.
7. **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy third-party map wrappers.
8. **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in source files, `environment.ts`, or `.env.example`. Always inject it at runtime via `/env-config.js` and `serve-dist.mjs` (bound strictly to `127.0.0.1`).
9. **ALWAYS** preserve `CUSTOM_ELEMENTS_SCHEMA` on components mounting `<gmp-*>` Web Components and keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` on `MapOptions`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/components/environmental-map/environmental-map.component.ts`](./src/app/components/environmental-map/environmental-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/environmental-map/environmental-map.component.ts`](./src/app/components/environmental-map/environmental-map.component.ts), [`src/app/components/header-bar/header-bar.component.ts`](./src/app/components/header-bar/header-bar.component.ts), [`src/app/services/environmental-api.service.ts`](./src/app/services/environmental-api.service.ts), [`src/app/services/maps-loader.service.ts`](./src/app/services/maps-loader.service.ts)
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
