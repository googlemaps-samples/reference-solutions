# Agent Guidelines — Google Maps Platform Real Estate Explorer (`nodejs-web`)

This repository implements the San Francisco Real Estate, Parcel Polygon & Commute Explorer using **strictly modern, zero-deprecation Google Maps Platform APIs** and secure Backend-for-Frontend (BFF) patterns.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):** `google.maps.importLibrary` loading `core`, `maps`, `marker`, `places`, `streetView`, `geometry`.
- **Map Initialization:** Vector map with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers & Clustering:** `google.maps.marker.AdvancedMarkerElement` (appending custom HTML price-pill elements via `marker.append(...)`) combined with `@googlemaps/markerclusterer` using a custom `AdvancedMarkerElement` cluster renderer.
- **Autocomplete Widget:** `google.maps.places.PlaceAutocompleteElement` listening to the **`gmp-select`** event, converting `event.placePrediction.toPlace()`, and calling `place.fetchFields(...)`.
- **Street View:** `google.maps.StreetViewPanorama` and `google.maps.StreetViewService` (`getPanorama`).
- **Parcel & Area Geometry:** `google.maps.Polygon`, `google.maps.Polyline`, `google.maps.geometry.poly.containsLocation`, and `google.maps.geometry.encoding.decodePath`.
- **Drawing Library Replacement:** `terra-draw` and `terra-draw-google-maps-adapter`.
- **Server-Side Places API (New) Proxies (`src/server.ts`):**
  - `POST /api/places/search-text` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
  - `POST /api/places/nearby` -> `https://places.googleapis.com/v1/places:searchNearby` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
- **Server-Side Routes API v2 Proxies (`src/server.ts`):**
  - `POST /api/routes/matrix` -> `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
  - `POST /api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.

## Non-Negotiable Rules for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` -> always use `AdvancedMarkerElement`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` -> always use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or `Place` (Places API New).
   - NEVER listen to retired `gmp-placeselect` -> always listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` -> always use `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix` or the server-side Routes API v2 proxy endpoints.
   - NEVER use `google.maps.drawing` -> always use `terra-draw` + `terra-draw-google-maps-adapter`.
   - NEVER use `google.maps.visualization.HeatmapLayer`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` or `@googlemaps/extended-component-library` (`<gmpx-*>`).
   - NEVER use `PinElement.element` or `PinElement.glyph`.
2. **Preserve Usage Attribution & Map Configuration:**
   - Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `mapId: 'DEMO_MAP_ID'` on the map configuration.
3. **Preserve Security & Compliance Mandates:**
   - NEVER hardcode API keys in any source file or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js`; use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER call `googleapis.com` Places/Routes REST endpoints directly from browser `fetch()`; always route through `/api/...` in `src/server.ts`.
   - NEVER bind the Express server to `0.0.0.0`; bind strictly to `127.0.0.1`.
   - Keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers enabled on all responses.
   - NEVER hardcode fake Google Places ratings, reviews, or opening hours; all amenity data must come from live Places API (New) calls.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

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
