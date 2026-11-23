# Coding Agent Guidelines — Lake Tahoe 3D Trail Explorer (`static-vanilla-js`)

This repository implements a **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** Google Maps Platform Photorealistic 3D Trail Explorer. Future coding agents modifying this codebase **MUST** preserve the modern, zero-deprecation, and security architecture below.

## Modern Google Maps Platform APIs Used

1. **Loader (`@googlemaps/js-api-loader` v2)**:
   - Use `setOptions()` and `importLibrary()` exclusively.
   - **NEVER** reintroduce the deprecated `new Loader(...).load()` v1 API.
2. **Photorealistic 3D Maps (`importLibrary('maps3d')`)**:
   - `Map3DElement` (`<gmp-map-3d>`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`.
   - `Polyline3DElement` with `path`, `strokeColor`, `strokeWidth`, `altitudeMode: 'RELATIVE_TO_GROUND'`, and `extruded: true` (do not use deprecated `coordinates`).
   - `Marker3DInteractiveElement` (listening to `gmp-click`) and `PopoverElement`.
   - Camera animations via `map3d.flyCameraTo({ endCamera, durationMillis })`.
3. **Markers (`importLibrary('marker')`)**:
   - `PinElement` with `glyphText`, `glyphColor`, `background`, and `borderColor` (or `AdvancedMarkerElement` if adding 2D markers).
   - **NEVER** use deprecated `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
4. **Places API (New) (`importLibrary('places')`)**:
   - `PlaceAutocompleteElement` listening to `gmp-select` (never retired `gmp-placeselect`), calling `event.placePrediction.toPlace()` and `place.fetchFields(...)`.
   - `Place.searchByText` for text landmark queries.
   - **NEVER** use deprecated `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
5. **Elevation & Routing**:
   - `ElevationService.getElevationAlongPath` and `ElevationService.getElevationForLocations` via `importLibrary('elevation')`.
   - If adding routing in future features, **ALWAYS** use `Route.computeRoutes` via `importLibrary('routes')` (never `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`).

## Security & Runtime Mandates

- **No Hardcoded Keys**: Keep `GOOGLE_MAPS_API_KEY` in `.env` and serve it to the client solely via `/env-config.js` in `server.mjs`.
- **Loopback Server Binding**: `server.mjs` must bind strictly to `127.0.0.1` and retain `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and path traversal protections.
- **No Unsafe DOM Sinks**: **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js` or `index.html`. Always construct DOM nodes with `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()`.
- **Map Container Dimensions**: Keep explicit non-zero CSS height (`min-height: 520px`, `height: 100%`) on `#map-3d-container` and `gmp-map-3d`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`index.html`](./index.html)
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
