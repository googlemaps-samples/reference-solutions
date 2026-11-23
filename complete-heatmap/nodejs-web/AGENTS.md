# AGENTS.md — Coding Agent Instructions for `complete-heatmap/nodejs-web`

This project implements the **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using **Node.js + Express + TypeScript** and modern, zero-deprecation **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`weekly` channel via dynamic `importLibrary`):**
  - `Map` (`core` / `maps`) configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` and `PinElement` (`marker`) using `marker.append(pin)` / `marker.replaceChildren(pin)` and DOM `marker.addEventListener('click', ...)`
  - `PlaceAutocompleteElement` (`places`) listening to `'gmp-select'`, calling `event.placePrediction.toPlace()` and `place.fetchFields(...)`
  - `Polygon`, `Polyline`, `InfoWindow`, `OverlayView` (`maps`)
  - `geometry.poly.containsLocation` and `geometry.encoding.decodePath` (`geometry`)
- **deck.gl Integration:**
  - `deck.HeatmapLayer` (`@deck.gl/aggregation-layers`) + `deck.GoogleMapsOverlay` (`@deck.gl/google-maps`) with automatic 2D Canvas `OverlayView` fallback when WebGL2 is unavailable (e.g., headless Chromium).
- **Backend-for-Frontend (BFF) Proxy Endpoints (`src/server.ts`):**
  - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key`, `X-Goog-FieldMask`, and `intermediates` (`via: true`)
  - `GET /api/geocode/reverse` → `https://maps.googleapis.com/maps/api/geocode/json`
  - `GET /api/elevation` → `https://maps.googleapis.com/maps/api/elevation/json`
  - `GET /api/weather/current` → `https://weather.googleapis.com/v1/currentConditions:lookup`

## Non-Negotiable Rules for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement` + `PinElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` with `gmp-select`, `Place`, or Places API New REST via `/api/places/search`).
   - NEVER listen to `gmp-placeselect` (use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2 via `/api/routes/compute`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` (use deck.gl `HeatmapLayer` via `GoogleMapsOverlay`).
   - NEVER use `PinElement.element`, `PinElement.glyph`, `AdvancedMarkerElement.content`, or `AdvancedMarkerElement.addListener` (use `PinElement` directly, `glyphText`/`glyphSrc`, `marker.append()`/`replaceChildren()`, and DOM `addEventListener('click', ...)`).
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader().load()` or banned wrappers (`@react-google-maps/api`, `google-map-react`, `@googlemaps/extended-component-library` `<gmpx-*>`).
2. **Preserve Mandatory Attribution & Map Dimensions:**
   - Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `mapId: 'DEMO_MAP_ID'`.
   - Keep explicit non-zero CSS height on `#map-container` (`min-height: 540px`).
3. **Preserve Security & Compliance:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER call `googleapis.com` REST endpoints directly from browser JS (route through `/api/*` BFF endpoints).
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js` (use `document.createElement`, `textContent`, and `replaceChildren`).
   - Keep the Express server bound strictly to `127.0.0.1` (NEVER `0.0.0.0`) with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
   - NEVER hardcode fake place names, ratings, or hours from LLM memory; fetch live place data at runtime.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`

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
