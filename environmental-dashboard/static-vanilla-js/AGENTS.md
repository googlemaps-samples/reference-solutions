# AGENTS.md — Coding Agent Instructions

This repository implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **2D Map**: `google.maps.Map` (`importLibrary('maps')`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers**: `AdvancedMarkerElement` and `PinElement` (`importLibrary('marker')`) using `marker.append(pin)` and `PinElementOptions.glyphText` / `glyphSrc`.
- **Autocomplete & Places**: `PlaceAutocompleteElement` (`importLibrary('places')`) listening to the `gmp-select` event (`event.placePrediction.toPlace().fetchFields(...)`), plus server-side Places API (New) `places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`.
- **Geocoding**: `Geocoder` (`importLibrary('geocoding')`) for map-click reverse geocoding.
- **Overlays**: Native `ImageMapType` (`importLibrary('maps')`) for WebGL-free `US_AQI` heatmap raster tiles via `/api/air-quality/tiles`, and `google.maps.Rectangle` for building solar bounding boxes.
- **Environmental REST APIs (via `server.mjs` BFF)**:
  - Weather API (`weather.googleapis.com/v1/currentConditions:lookup`, `forecast/days:lookup`)
  - Air Quality API (`airquality.googleapis.com/v1/currentConditions:lookup`, `mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`)
  - Pollen API (`pollen.googleapis.com/v1/forecast:lookup`)
  - Solar API (`solar.googleapis.com/v1/buildingInsights:findClosest`)

## Strict Non-Deprecation & Security Rules for Future Agents

1. **NEVER introduce deprecated Google Maps Platform APIs**:
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`).
   - NEVER listen to `gmp-placeselect` (use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1.
   - NEVER use `PinElement.element` or `PinElement.glyph`.
   - NEVER import `@googlemaps/extended-component-library` (`<gmpx-*>`).
2. **Preserve usage attribution**: Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` in `MapOptions`.
3. **Security & DOM Safety**:
   - NEVER hardcode API keys in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js` — always use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - Keep `server.mjs` bound strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`

### Key Implementation Files

- **Map & Markers:** [`app.js`](./app.js)
- **Places, Routes & Geo Services:** [`app.js`](./app.js)
- **Backend API Proxy:** [`server.mjs`](./server.mjs)
- **App Entry & Config:** [`index.html`](./index.html)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
node --check app.js && node --check server.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node server.mjs --host 127.0.0.1 --port 4171
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
