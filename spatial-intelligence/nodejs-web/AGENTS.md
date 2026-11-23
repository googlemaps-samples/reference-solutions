# AGENTS.md — Coding Agent Mandates for `spatial-intelligence/nodejs-web`

This repository implements an Enterprise Web GIS Workbench using **Node.js + Express + TypeScript** and modern **Google Maps Platform** APIs. All future modifications MUST preserve the zero-deprecation and security rules below.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API Loader v2:** `@googlemaps/js-api-loader` functional `setOptions()` + `importLibrary()` (`core`, `maps`, `marker`, `places`, `elevation`).
- **Map Initialization:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers:** `AdvancedMarkerElement` paired with `PinElement` (passing `PinElement` directly to `content` and using `glyphText` / `glyphSrc`).
- **Autocomplete:** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select`, converting `event.placePrediction.toPlace()`, and calling `place.fetchFields(...)`.
- **GeoJSON & Drawing:** `map.data` (`Data` layer) for NYC district boundary polygons, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter` with `isolatedData: true`) for interactive polygon study zones.
- **High-Density Visualization:** **deck.gl** `GoogleMapsOverlay` (`ScatterplotLayer` and `HexagonLayer`) with WebGL2 availability guards so headless environments emit zero console errors.
- **Places & Elevation BFF Proxies (`src/server.ts`):**
  - `POST /api/places/search` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`.
  - `POST /api/elevation` -> `https://maps.googleapis.com/maps/api/elevation/json` projecting only `elevation`, `location`, `resolution`, and `status`.
- **Routing (if added in future extensions):** MUST use `Route.computeRoutes` (`importLibrary('routes')`) or `routes.googleapis.com/directions/v2:computeRoutes`.

## Forbidden Legacy / Deprecated APIs & Patterns (NEVER Introduce)

1. **NEVER** use `google.maps.Marker` -> use `AdvancedMarkerElement`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` -> use `PlaceAutocompleteElement` (`gmp-select`), `Place.searchByText`, or `Place.searchNearby`.
3. **NEVER** listen to retired `gmp-placeselect` -> always use `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` -> use `Route.computeRoutes` or Routes API v2.
5. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` -> use deck.gl and Terra Draw.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` -> use `setOptions()` + `importLibrary()`.
7. **NEVER** use `PinElement.element` or `PinElement.glyph` -> pass `PinElement` directly and use `glyphText` / `glyphSrc`.
8. **NEVER** install banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
9. **NEVER** call `googleapis.com` REST endpoints directly from client `fetch()` (CORS trap) -> proxy through `src/server.ts`.
10. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/` -> use `document.createElement()`, `textContent`, and `replaceChildren()`.
11. **NEVER** hardcode API keys or bind the Express server to `0.0.0.0` (always bind to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`public/app.js`](./public/app.js), [`scripts/vendor-entry.mjs`](./scripts/vendor-entry.mjs)
- **Places, Routes & Geo Services:** [`public/app.js`](./public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./src/server.ts)
- **App Entry & Config:** [`public/index.html`](./public/index.html)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
node dist/server.js --host 127.0.0.1 --port 4178
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
