# AGENTS.md — Coding Agent Guardrails

This project is a zero-deprecation Google Maps Platform web application built with Static HTML and Vanilla ES Modules (`static-vanilla-js`).

## Modern Google Maps Platform APIs Used

- **Bootstrap & Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), configured with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `v: 'weekly'`.
- **Map & Markers:** `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`), `google.maps.marker.AdvancedMarkerElement`, and `@googlemaps/markerclusterer` (`MarkerClusterer`, `SuperClusterAlgorithm`).
- **Places API (New):** `Place.searchByText`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `AutocompleteSessionToken`, and `place.fetchFields`.
- **Routes API:** `RouteMatrix.computeRouteMatrix` and `Route.computeRoutes` (`route.createPolylines()`).
- **Geocoding:** `google.maps.Geocoder` fallback for manual address entry.

## Forbidden Legacy / Deprecated APIs & Patterns

Future coding agents **MUST NEVER** introduce any of the following:

1. `google.maps.Marker` — use `AdvancedMarkerElement` instead.
2. `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event — use `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchByText`, `Place.fetchFields`, or `PlaceAutocompleteElement` (`gmp-select`).
3. `google.maps.DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
4. `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
5. `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
6. `PinElement.element` or `PinElement.glyph` — use `PinElement` directly (`glyphText` / `glyphSrc`) or `marker.append(domElement)`.
7. Beta-only `place.isOpen()` on the `weekly` channel — read `place.regularOpeningHours?.weekdayDescriptions` instead.
8. Raw client-side `fetch()` to `googleapis.com` REST endpoints (blocked by CORS).
9. `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in client code — use `document.createElement()`, `textContent`, and `replaceChildren()`.
10. Hardcoded API keys or binding `server.mjs` to `0.0.0.0` (must bind strictly to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`

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
