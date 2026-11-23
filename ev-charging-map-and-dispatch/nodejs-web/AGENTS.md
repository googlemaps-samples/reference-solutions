# AGENTS.md — Engineering & Google Maps Platform Guardrails

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using a **Node.js + Express + TypeScript** BFF server (`src/server.ts`) and an interactive web frontend (`public/`).

## Modern Google Maps Platform APIs Used

All mapping, location discovery, routing, and geocoding features in this project use **only modern, supported Google Maps Platform APIs**:

- **Maps JavaScript API (Dynamic Library Import via `google.maps.importLibrary`):**
  - `Map` (`maps` library) initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - `Circle`, `Polyline`, `InfoWindow` (`maps` library)
  - `AdvancedMarkerElement` and `PinElement` (`marker` library) using `marker.append(pin)` and `PinElementOptions.glyphText`
  - `PlaceAutocompleteElement` (`places` library) listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`)
  - `LatLngBounds` (`core` library) and `encoding.decodePath` (`geometry` library)
- **Places API (New) (REST via BFF `/api/places/nearby` and `/api/places/search-text`):**
  - `https://places.googleapis.com/v1/places:searchNearby`
  - `https://places.googleapis.com/v1/places:searchText`
  - Explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers, requesting `places.evChargeOptions`, `places.regularOpeningHours`, `places.rating`, `places.userRatingCount`, and `places.googleMapsUri`
- **Routes API v2 (REST via BFF `/api/routes/matrix` and `/api/routes/compute`):**
  - `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
  - `https://routes.googleapis.com/directions/v2:computeRoutes`
  - Explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers
- **Geocoding API (REST via BFF `/api/geocode/reverse`):**
  - `https://maps.googleapis.com/maps/api/geocode/json` for reverse geocoding driver breakdown coordinates

## Strict Prohibitions for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` — use `AdvancedMarkerElement` + `PinElement`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement` (`gmp-select`) or Places API (New).
   - NEVER listen to the retired `gmp-placeselect` event — always listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use Routes API v2 (`computeRoutes` / `computeRouteMatrix`) or JS `Route.computeRoutes`.
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, or `@googlemaps/react-wrapper`.
   - NEVER use deprecated `PinElement.element` or `PinElement.glyph` — append `PinElement` directly via `marker.append(pin)` and use `glyphText` / `glyphSrc`.
   - NEVER call beta-only `place.isOpen()` or `gmp-click` when loading the `v: "weekly"` channel — inspect `regularOpeningHours` and use `marker.addListener("click", ...)`.
2. **NEVER weaken security or compliance rules:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js` — use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER bind the Express server to `0.0.0.0` — bind strictly to `127.0.0.1` (or `localhost`).
   - ALWAYS keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` response headers enabled.
   - ALWAYS preserve `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]` and `?utm_campaign=gmp_git_agentsamples_v1.0.0` on Google Maps Platform documentation URLs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

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
