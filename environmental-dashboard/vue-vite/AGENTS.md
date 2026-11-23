# Agent Guidelines — Google Maps Platform Zero-Deprecation Mandate

This repository implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** in **Vue 3 + Vite + TypeScript** using strictly modern, non-deprecated Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JS Loader (`@googlemaps/js-api-loader` v2)**: `setOptions()` + `importLibrary('maps' | 'marker' | 'places' | 'geocoding')`
- **2D Vector Map**: `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Markers**: `AdvancedMarkerElement` + `PinElement` (passing `PinElement` directly and using `glyphText` / `glyphSrc`)
- **Places API (New)**: `PlaceAutocompleteElement` (listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields()`) and `Place.searchByText()`
- **Geocoding**: `google.maps.Geocoder` via `importLibrary('geocoding')`
- **Raster Heatmaps**: `google.maps.ImageMapType` for `US_AQI` tiles (WebGL-free)
- **Routes (if added later)**: `Route.computeRoutes` via `importLibrary('routes')`
- **Environmental REST APIs**:
  - Weather API (`weather.googleapis.com/v1/currentConditions:lookup`, `forecast/days:lookup`)
  - Air Quality API (`airquality.googleapis.com/v1/currentConditions:lookup`, `mapTypes/US_AQI/heatmapTiles`)
  - Pollen API (`pollen.googleapis.com/v1/forecast:lookup`)
  - Solar API (`solar.googleapis.com/v1/buildingInsights:findClosest`)

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

Future coding agents **MUST NEVER** introduce any of the following:

1. `google.maps.Marker` (use `AdvancedMarkerElement`)
2. `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event (use `PlaceAutocompleteElement` + `gmp-select`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`)
3. `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2)
4. `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
5. `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
6. `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`)
7. `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper libraries
8. Raw client-side `fetch()` to `routes.googleapis.com`, `places.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` (CORS-blocked; use Maps JS SDK libraries on client-only apps)
9. Hardcoding any API keys in source files or `.env.example`, or omitting `gmp_git_agentsamples_v1.0.0` attribution

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/MapCanvas.vue`](./src/components/MapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/MapCanvas.vue`](./src/components/MapCanvas.vue), [`src/components/TopHeaderBar.vue`](./src/components/TopHeaderBar.vue), [`src/services/environmentalApi.ts`](./src/services/environmentalApi.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx vue-tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4175 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
