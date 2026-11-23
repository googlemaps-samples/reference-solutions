# AGENTS.md — Google Maps Platform Engineering Guardrails

This standalone sample (`static-vanilla-js`) implements the **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using zero-bundler ES modules and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used
- **Maps JavaScript API** (`@googlemaps/js-api-loader` v2 `setOptions()` + `importLibrary()`):
  - `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`)
  - `Polygon`, `Polyline`, `Circle`, `InfoWindow`
- **Advanced Markers** (`importLibrary('marker')`):
  - `AdvancedMarkerElement`
  - `PinElement` (using `glyphText` / `background` / `borderColor` / `glyphColor` — NEVER deprecated `.element` or `.glyph`)
- **Places API (New)** (`importLibrary('places')`):
  - `Place.searchByText()`
  - `PlaceAutocompleteElement` listening to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields()`
- **Routes API** (`importLibrary('routes')`):
  - `Route.computeRoutes()` with explicit `fields` mask and `route.createPolylines()`
- **Geocoding API** (`importLibrary('geocoding')`):
  - `Geocoder` (`geocoder.geocode({ location })`) for reverse geocoding
- **Elevation API** (`importLibrary('elevation')`):
  - `ElevationService` (`elevationService.getElevationForLocations(...)`)
- **Geometry Library** (`importLibrary('geometry')`):
  - `poly.containsLocation()` and `poly.isLocationOnEdge()` for flood-polygon intersection checks
- **Weather API (REST)**:
  - `https://weather.googleapis.com/v1/currentConditions:lookup`
- **Data Visualization**:
  - `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay` (with graceful WebGL2 fallback for headless environments)

## Mandatory Rules for Future Coding Agents
1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`).
   - Do NOT listen to retired `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` (use `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay`).
   - Do NOT use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` (always use v2 `setOptions()` + `importLibrary()`).
   - Do NOT call `place.isOpen()` on the `weekly` channel (use `regularOpeningHours` / `businessStatus`, or switch to `v: 'beta'`).
   - Do NOT install banned wrappers (`@googlemaps/extended-component-library` / `<gmpx-*>`, `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`).
2. **Security & DOM Safety:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js`. Use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - `server.mjs` must bind strictly to `127.0.0.1` and serve `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
3. **Attribution & Compliance:**
   - Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` in `Map` options.
   - Keep `?utm_campaign=gmp_git_agentsamples_v1.0.0` on all Google Maps / Cloud documentation URLs.
   - Do NOT hardcode fake place ratings, reviews, or opening hours.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`

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
