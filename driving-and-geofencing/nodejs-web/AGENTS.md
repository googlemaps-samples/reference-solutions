# AGENTS.md — Google Maps Platform Modern API & Security Guidelines

This repository implements **Field Workforce Geofenced Attendance & Site Audit Router** (`nodejs-web`) using exclusively modern, zero-deprecation Google Maps Platform APIs and secure Backend-for-Frontend (BFF) practices.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API Loader v2:** `@googlemaps/js-api-loader` functional `setOptions()` and `importLibrary()` (`core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `geometry`).
- **Usage Attribution & Vector Map ID:** `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `mapId: 'DEMO_MAP_ID'`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` (with `glyphText`, `background`, `borderColor`, `glyphColor`).
- **Places UI & Discovery:**
  - `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`).
  - Server-side **Places API (New)** Text Search (`https://places.googleapis.com/v1/places:searchText`) via `POST /api/places/search` with `X-Goog-FieldMask`.
- **Routing & Waypoint Optimization:**
  - Server-side **Routes API v2** (`https://routes.googleapis.com/directions/v2:computeRoutes`) via `POST /api/routes/compute` with `optimizeWaypointOrder: true`, `TRAFFIC_AWARE`, and `X-Goog-FieldMask`.
- **Reverse Geocoding:**
  - Server-side **Geocoding API v4** (`https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}`) via `GET /api/geocode/reverse` with `X-Goog-FieldMask`, with `Geocoder` from `importLibrary('geocoding')` as JS fallback.
- **Polygon Drawing & Geofencing:**
  - **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`) for interactive polygon geofence drawing and editing.
  - `google.maps.geometry.poly.containsLocation` for point-in-polygon geofence verification and `google.maps.geometry.encoding.decodePath` for route polylines.

## Strict Prohibition for Future Coding Agents

Future agents modifying this codebase **MUST NEVER** introduce any deprecated, disabled, or insecure patterns:

1. **NEVER** use `google.maps.Marker` — always use `AdvancedMarkerElement`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, or `Place.searchByText` / Places API (New).
3. **NEVER** listen to retired `gmp-placeselect` — always use `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) or `Route.computeRoutes`.
5. **NEVER** use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer` — use Terra Draw for drawing.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use `setOptions()` + `importLibrary()`.
7. **NEVER** use deprecated `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
8. **NEVER** install banned wrappers (`@react-google-maps/api`, `google-map-react`, `@googlemaps/extended-component-library` `<gmpx-*>`, etc.).
9. **NEVER** hardcode API keys or use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`.
10. **NEVER** bind the local server to `0.0.0.0` — always bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`public/app.js`](./public/app.js)
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
