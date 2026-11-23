# Coding Agent Guidelines — Google Maps Platform (`nodejs-web`)

This project is built exclusively on **modern, non-deprecated Google Maps Platform APIs** and strict security practices. Future coding agents modifying this repository **MUST** obey all rules below.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):** Loaded via inline `importLibrary()` bootstrap (`maps`, `marker`, `places`, `core`), initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Advanced Markers:** `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (using `PinElementOptions.glyphText`, `background`, `borderColor`, `glyphColor`; passing the `PinElement` instance directly to `AdvancedMarkerElement`).
- **Places API (New) Web Component:** `google.maps.places.PlaceAutocompleteElement` (`<gmp-place-autocomplete>`), listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Places API (New) REST via Express BFF (`src/server.ts`):**
  - `POST https://places.googleapis.com/v1/places:searchNearby` (`/api/places/nearby`)
  - `POST https://places.googleapis.com/v1/places:searchText` (`/api/places/search`)
  - `GET https://places.googleapis.com/v1/places/{placeId}` (`/api/places/details`)
  - `GET https://places.googleapis.com/v1/{photoName}/media` (`/api/places/photo`)
  - All requests include explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **Geocoding API REST via Express BFF (`src/server.ts`):**
  - `GET https://maps.googleapis.com/maps/api/geocode/json` (`/api/geocode`) for forward and reverse geocoding.
- **Routing (if added in the future):** Use `Route.computeRoutes` (`importLibrary("routes")`) or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`).

## Strictly Forbidden Legacy / Deprecated APIs & Anti-Patterns

- **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or Places API (New).
- **NEVER** listen to retired `gmp-placeselect` — listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` or Routes API v2.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` or `glyphSrc`.
- **NEVER** call `place.isOpen()` on the default `weekly` channel (it is beta-only); inspect `regularOpeningHours.weekdayDescriptions` or `regularOpeningHours.openNow` from the REST payload instead.
- **NEVER** install or use `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, or `use-places-autocomplete`.
- **NEVER** call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from client-side `fetch()` (CORS trap); always proxy through `/api/...` on the Node/Express BFF.
- **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in frontend DOM code — use `document.createElement()`, `textContent`, and `replaceChildren()`.
- **NEVER** hardcode `GOOGLE_MAPS_API_KEY` or bind the Express server to `0.0.0.0` (always bind to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`

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
