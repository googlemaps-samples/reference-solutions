# AGENTS.md — Coding Agent Guardrails

This repository is a zero-deprecation **Google Maps Platform** reference sample (`static-vanilla-js`) for **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard**.

## Modern Google Maps Platform APIs Used

- **Maps JS Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`)
- **Vector Map & Attribution:** `google.maps.Map` with `mapId: "DEMO_MAP_ID"`, `clickableIcons: false`, and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
- **Markers:** `AdvancedMarkerElement` and `PinElement` (using `glyphText` and `marker.append(pin)`)
- **Places:** `PlaceAutocompleteElement` (`gmp-select` event -> `event.placePrediction.toPlace()` -> `place.fetchFields()`), `Place.searchByText`, and Places API (New) `places:searchText` via `/api/places/search`
- **Routes:** Routes API v2 (`directions/v2:computeRoutes` & `distanceMatrix/v2:computeRouteMatrix`) via `/api/routes/compute` and `/api/routes/matrix`, plus `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix` fallback
- **Roads:** Roads API `v1/snapToRoads` (`interpolate=true`) via `/api/roads/snap`
- **Geometry:** `geometry.encoding.decodePath`

## Strict Prohibitions for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event (use `PlaceAutocompleteElement` + `gmp-select`, `Place.searchByText`, `AutocompleteSuggestion`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use Routes API v2 / `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix`).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - Do NOT use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - Do NOT access deprecated `PinElement.element`, `PinElement.glyph`, or `AdvancedMarkerElement.content` (use `PinElement` directly with `glyphText`/`glyphSrc` and `marker.append(pin)`).
   - Do NOT install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages.
2. **Security & Server Hygiene:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; build DOM nodes exclusively with `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER bind `server.mjs` to `0.0.0.0`; bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
   - NEVER expose `googleapis.com` REST endpoints via raw browser `fetch()`; keep REST calls routed through `/api/*` in `server.mjs`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`

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
