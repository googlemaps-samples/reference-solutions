# Coding Agent Guidelines (`static-vanilla-js`)

This repository is a standalone **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** Google Maps Platform reference sample for **Single-Venue Storefront, Booking & Get Directions Hub**.

## Approved Modern Google Maps Platform APIs in This Project

Future coding agents modifying this codebase MUST use only the modern APIs below:

- **Loader:** `@googlemaps/js-api-loader` v2 (`setOptions(...)` + `importLibrary(...)`) via browser import map (`/node_modules/@googlemaps/js-api-loader/dist/index.js`).
- **Map & Attribution:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` (or a valid Cloud Map ID) and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` (`glyphText`, `glyphSrc`, `marker.append(...)`).
- **Overlays:** `google.maps.Circle` (`importLibrary('maps')`).
- **Places (New):** `Place.searchByText`, `place.fetchFields(...)`, and `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`, listening to the `gmp-select` event with `event.placePrediction.toPlace()`).
- **Routes:** `Route.computeRoutes(...)` (`importLibrary('routes')`) with `travelMode` (`DRIVING`, `TRANSIT`, `WALKING`) and `route.createPolylines(...)`.
- **Street View & Geometry:** `StreetViewService.getPanorama`, `StreetViewPanorama`, `spherical.computeHeading`, and `spherical.computeDistanceBetween`.

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

NEVER introduce any of the following deprecated, disabled, or insecure symbols:

- **Legacy Markers:** `google.maps.Marker`, `PinElement.element`, `PinElement.glyph`.
- **Legacy Places:** `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, `gmp-placeselect`, `place_changed`.
- **Legacy Routing:** `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`.
- **Legacy Visualization / Drawing:** `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`.
- **Legacy Loader / Wrappers:** `new Loader(...).load()`, `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`.
- **Client-Side CORS Traps:** Never `fetch()` `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser JS.
- **Security Violations:**
  - Never hardcode any API key in source files or `.env.example`.
  - Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; use `document.createElement()`, `textContent`, and `replaceChildren()`.
  - Never bind `server.mjs` to `0.0.0.0`; bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
  - Never hardcode fake business reviews, ratings, or opening hours.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
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
