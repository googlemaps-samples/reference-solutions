# Coding Agent Guidelines — `static-vanilla-js`

This repository implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase **MUST** continue using these modern, non-deprecated APIs:

- **API Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) — NEVER use v1 `new Loader(...).load()`.
- **Map & Layers:** `google.maps.Map` via `importLibrary('maps')` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, plus `BicyclingLayer`, `TrafficLayer`, `TransitLayer`, and `Polyline`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` via `importLibrary('marker')`. Pass `PinElement` directly to `AdvancedMarkerElement` (never use deprecated `PinElement.element` or `PinElement.glyph`).
- **Places API (New):** `Place.searchByText`, `PlaceAutocompleteElement` listening to `'gmp-select'` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
- **Routes API:** `Route.computeRoutes` via `importLibrary('routes')` with explicit `fields`, `computeAlternativeRoutes`, `routeModifiers`, and `requestedReferenceRoutes: ['FUEL_EFFICIENT']` (for `DRIVING` mode).
- **Elevation API:** `ElevationService.getElevationAlongPath` via `importLibrary('elevation')` with downsampled route paths (`samples: 64`).

## Strictly Forbidden Legacy APIs & Patterns

NEVER introduce any of the following deprecated/disabled APIs or insecure patterns:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService` (use `PlaceAutocompleteElement` and `Place`)
- `gmp-placeselect` event (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService` (use `Route.computeRoutes`)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- Raw browser `fetch()` calls to `googleapis.com` endpoints (CORS blocked)
- `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` (use `document.createElement`, `document.createElementNS`, `textContent`, `replaceChildren`)
- Hardcoded API keys anywhere in source or `.env.example`
- Binding `server.mjs` to `0.0.0.0` (must strictly bind to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`app.js`](./app.js)
- **Places, Routes & Geo Services:** [`app.js`](./app.js)
- **App Entry & Config:** [`index.html`](./index.html), [`server.mjs`](./server.mjs)

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
