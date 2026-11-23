# Coding Agent Guidelines — Google Maps Platform (`nodejs-web`)

This project implements the **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** using strictly modern, zero-deprecation Google Maps Platform APIs and secure BFF practices.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`google.maps.importLibrary`):**
  - `core`: `LatLngBounds`
  - `maps`: `Map` (with `mapId: 'DEMO_MAP_ID'`, `clickableIcons: false`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `InfoWindow`, `Polyline`, `TrafficLayer`
  - `marker`: `AdvancedMarkerElement`, `PinElement` (configured with `glyphText`, `background`, `borderColor`, `glyphColor` and attached via `marker.append(pin)`)
  - `places`: `PlaceAutocompleteElement` (listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields(...)`)
  - `routes`: `routes` library loaded alongside server-side Routes API v2 proxies
  - `geometry`: `encoding.decodePath`, `spherical.computeDistanceBetween`
- **Backend-for-Frontend (BFF) REST Proxies (`src/server.ts`):**
  - `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key`, explicit `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`
  - `POST /api/routes/matrix` → `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-Api-Key`, explicit `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`
  - `POST /api/roads/snap` → `https://roads.googleapis.com/v1/snapToRoads` (`interpolate=true`) with `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`
  - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key`, explicit `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`

## Strictly Prohibited (Never Introduce)

1. **Legacy / Deprecated Maps JS APIs:**
   - NEVER use `google.maps.Marker` — use `AdvancedMarkerElement`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
   - NEVER listen to retired `gmp-placeselect` — always listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use Routes API v2 (`computeRoutes` / `computeRouteMatrix` or `Route.computeRoutes`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER access deprecated `PinElement.element` or `PinElement.glyph` — append `PinElement` directly (`marker.append(pin)`) and use `glyphText` / `glyphSrc`.
2. **Banned Wrapper Libraries:**
   - NEVER install or import `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, or `@googlemaps/react-wrapper`.
3. **CORS & Security Violations:**
   - NEVER call `routes.googleapis.com`, `places.googleapis.com`, `roads.googleapis.com`, or `maps.googleapis.com` REST endpoints directly from browser `fetch()`; always route through the Express BFF `/api/*` endpoints.
   - NEVER hardcode any API key in source files or `.env.example`. Always read `process.env.GOOGLE_MAPS_API_KEY`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js`; use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER bind the Express server to `0.0.0.0`; bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
4. **Data Integrity:**
   - NEVER hardcode fake place ratings, fake customer reviews, fake opening hours, or fake Place IDs. All place hubs must come from live Places API (New) calls.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`

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
