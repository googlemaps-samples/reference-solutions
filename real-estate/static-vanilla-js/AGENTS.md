# AGENTS.md — Google Maps Platform Modern API Mandates

This repository is a standalone **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** sample for the **Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer**.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase **MUST** continue using these modern, current APIs and patterns:

1. **Dynamic Loading (`@googlemaps/js-api-loader` v2):**
   - `setOptions({ key, v: 'weekly', language: 'en', region: 'US' })`
   - `importLibrary('core' | 'maps' | 'marker' | 'places' | 'routes' | 'streetView' | 'geometry' | 'geocoding')`
   - Never use the deprecated v1 `new Loader(...).load()` class.
2. **Vector Maps & Usage Attribution:**
   - `google.maps.Map` initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
3. **Markers & Clustering:**
   - `google.maps.marker.AdvancedMarkerElement` (via `marker.append(domNode)`) + `@googlemaps/markerclusterer` (`MarkerClusterer` with a custom `AdvancedMarkerElement` renderer).
   - **NEVER** use `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
4. **Places API (New):**
   - `google.maps.places.PlaceAutocompleteElement` listening to `'gmp-select'` (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
   - `google.maps.places.Place.searchNearby(...)` and `Place.searchByText(...)` with explicit `fields` arrays and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
   - **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
5. **Routes API (JS SDK):**
   - `google.maps.routes.RouteMatrix.computeRouteMatrix(...)` with explicit `fields` masks for driving (`TRAFFIC_AWARE`) and transit (`TRANSIT`) commute ETAs.
   - `google.maps.routes.Route.computeRoutes(...)` with `route.createPolylines(...)`.
   - **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
6. **Drawing & Spatial Filtering:**
   - `terra-draw` (`TerraDraw`, `TerraDrawPolygonMode`, `TerraDrawSelectMode`) + `terra-draw-google-maps-adapter` (`TerraDrawGoogleMapsAdapter`) + `google.maps.geometry.poly.containsLocation`.
   - **NEVER** use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer`.
7. **Web & Server Security:**
   - **NEVER** hardcode API keys in source files or `.env.example`.
   - **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; always use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - Keep `server.mjs` strictly bound to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`

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
