# AGENTS.md — Coding Agent Guardrails

This repository is the **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** implementation of the **Hyperlocal Neighborhood Directory & Spot Mapper** (`neighborhood-discovery`).

## Modern Google Maps Platform APIs Used Here

Always preserve and extend using ONLY these current APIs:

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions(...)` + `importLibrary(...)`).
- **Maps & Overlays (`maps`, `core`):** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `InfoWindow`, `Circle`, `LatLngBounds`.
- **Markers (`marker`):** `AdvancedMarkerElement` and `PinElement` (with `glyphText`, `background`, `borderColor`, `glyphColor`). Attach standard `'click'` listeners for `v: 'weekly'` channel compatibility.
- **Places API (New) (`places`):**
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `'gmp-select'` and calling `event.placePrediction.toPlace().fetchFields(...)`.
  - `Place.searchNearby(...)`, `Place.searchByText(...)`, `place.fetchFields(...)`.
  - Inspect `place.regularOpeningHours?.weekdayDescriptions` on the `weekly` channel instead of calling `place.isOpen()`.
- **Geocoding (`geocoding`):** `Geocoder.geocode({ address })` and `Geocoder.geocode({ location })`.

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

Future coding agents MUST NEVER introduce any of the following:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`
- Retired `gmp-placeselect` event (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- Deprecated `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`)
- Calling `Place.prototype.isOpen()` on the `weekly` channel
- Any `@googlemaps/extended-component-library` (`<gmpx-*>`) or banned wrapper packages
- Raw browser `fetch()` to `googleapis.com` REST endpoints (CORS blocked)
- Hardcoded API keys, fabricated/LLM-memorized place data, or `0.0.0.0` server bindings
- Unsafe DOM sinks (`innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`) — always use `document.createElement()`, `textContent`, and `replaceChildren()`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
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
