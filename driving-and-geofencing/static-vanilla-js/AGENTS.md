# Agent Instructions — Static Vanilla JS (Driving & Geofencing)

This repository implements **Field Workforce Geofenced Attendance & Site Audit Router** using modern, non-deprecated Google Maps Platform APIs and secure Vanilla JavaScript (zero-bundler ES Modules).

## Modern Google Maps Platform APIs Used

- **`@googlemaps/js-api-loader` (v2):** `setOptions()` and `importLibrary()` (`maps`, `core`, `marker`, `places`, `routes`, `geocoding`, `geometry`).
- **`google.maps.Map`:** Initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **`AdvancedMarkerElement` & `PinElement`:** Used for the worker GPS marker and numbered multi-stop audit site pins (`PinElementOptions.glyphText`).
- **`Place.searchByText` (Places API New):** Used to discover live Austin retail audit sites.
- **`Route.computeRoutes` (Routes API v2):** Used with `optimizeWaypointOrder: true`, `routingPreference: 'TRAFFIC_AWARE'`, `route.createPolylines()`, and `optimizedIntermediateWaypointIndices`.
- **`Geocoder` (Geocoding Library):** Used for reverse geocoding simulated worker coordinates.
- **`google.maps.geometry.poly.containsLocation`:** Used for polygon geofence containment checks across pre-seeded `Polygon` overlays and supervisor-drawn Terra Draw polygons.
- **Terra Draw (`terra-draw` + `terra-draw-google-maps-adapter`):** Used for interactive polygon drawing and editing.

## Strict Prohibitions for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NO `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NO `google.maps.places.PlacesService`, `Autocomplete`, `AutocompleteService`, or `SearchBox` (use `Place`, `PlaceAutocompleteElement` with `gmp-select`, or `AutocompleteSuggestion`).
   - NO `gmp-placeselect` (use `gmp-select`).
   - NO `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / `RouteMatrix`).
   - NO `google.maps.drawing` (use Terra Draw).
   - NO `google.maps.visualization.HeatmapLayer`.
   - NO `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - NO deprecated `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`).
   - NO `@googlemaps/extended-component-library` (`<gmpx-*>`).
2. **Preserve Usage Attribution:** Always retain `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` in `MapOptions`, `SearchByTextRequest`, and `ComputeRoutesRequest`.
3. **Security & DOM Safety:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; always use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - Keep `server.mjs` bound strictly to `127.0.0.1` (never `0.0.0.0`) with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
4. **No Hallucinated Place Data:** Always fetch live place names, addresses, and coordinates at runtime via `Place.searchByText` and `Geocoder`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`

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
