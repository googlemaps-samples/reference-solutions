# Coding Agent Guidelines — Google Maps Platform (Static Vanilla JS)

This project implements an **Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics** application using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used
- **Maps JavaScript API Loader v2 (`@googlemaps/js-api-loader`):** Uses `setOptions()` and `importLibrary()` exclusively.
- **2D / Vector Map (`google.maps.Map`):** Configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Advanced Markers (`AdvancedMarkerElement`, `PinElement`):** Uses `PinElement` directly (`glyphText`) and attaches standard DOM `'click'` listeners on the marker element on the `weekly` channel.
- **Places API (New):** Uses `PlaceAutocompleteElement` (listening to `'gmp-select'`, calling `event.placePrediction.toPlace()` + `place.fetchFields()`) and `Place.searchByText()`, plus a `/api/places/search` BFF proxy in `server.mjs` with `X-Goog-FieldMask`.
- **Elevation API:** Uses `ElevationService` (`importLibrary('elevation')`) on the client and `/api/elevation` BFF proxy in `server.mjs`.
- **GeoJSON Data Layer (`map.data`):** Renders NYC district boundary polygons styled dynamically by capacity metrics and smoothly zooms with `map.fitBounds()`.
- **Custom Study Zone Drawing:** Uses `terra-draw` + `terra-draw-google-maps-adapter` instead of the deprecated Drawing library.
- **High-Density Visualization:** Uses `deck.gl` (`GoogleMapsOverlay`, `ScatterplotLayer`, `HexagonLayer`) with explicit WebGL2 availability checks so headless/software environments never emit uncaught console errors.

## Strict Zero-Deprecation & Security Prohibitions
Future coding agents **MUST NEVER** introduce any of the following deprecated, disabled, or insecure patterns:
- **NEVER** use `google.maps.Marker` (use `AdvancedMarkerElement`).
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`).
- **NEVER** listen to retired `gmp-placeselect` (always use `gmp-select`).
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` (use `deck.gl` and `terra-draw`).
- **NEVER** use `@googlemaps/js-api-loader` v1 (`new Loader(...).load()`).
- **NEVER** use `PinElement.element` or `PinElement.glyph`.
- **NEVER** use `@googlemaps/extended-component-library` (`<gmpx-*>`).
- **NEVER** call `places.googleapis.com` or `maps.googleapis.com/maps/api/elevation` directly from browser `fetch()` (use Maps JS SDK libraries or `/api/*` endpoints on `server.mjs`).
- **NEVER** hardcode API keys or use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` (use `document.createElement()`, `textContent`, and `replaceChildren()`).
- **NEVER** bind `server.mjs` to `0.0.0.0` (always bind strictly to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`

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
