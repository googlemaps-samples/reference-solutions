# AGENTS.md — Coding Agent Instructions for `nodejs-web`

This project implements the **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** using **Node.js + Express + TypeScript** (`src/server.ts` → `dist/server.js`) and a modern **Google Maps Platform** web frontend (`public/`).

## Mandatory Google Maps Platform APIs (Zero-Deprecation Policy)

Future coding agents modifying this repository **MUST** exclusively use modern Google Maps Platform APIs and patterns:

1. **Maps Initialization & Attribution**
   - Load Maps JS via the official Dynamic Library Import (`google.maps.importLibrary`) or `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`).
   - Always pass `mapId: 'DEMO_MAP_ID'` (or a valid Cloud Map ID) and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
2. **Markers & Pins**
   - Always use `AdvancedMarkerElement` and `PinElement` (`importLibrary('marker')`).
   - Use `PinElement` directly (e.g. `content: pin`) and `glyphText` / `glyphSrc`.
   - **NEVER** use `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
3. **Places & Autocomplete**
   - Always use `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`), or backend proxy calls to Places API (New) (`places.googleapis.com/v1/places:searchText`, `places:searchNearby`, `places/{placeId}`, `places/{photoName}/media`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
   - **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
   - **NEVER** call `place.isOpen()` on the `weekly` channel; inspect `regularOpeningHours.weekdayDescriptions` instead.
4. **Routing & Optimization**
   - Always use Routes API v2 (`https://routes.googleapis.com/directions/v2:computeRoutes`) via `/api/routes/compute` with `X-Goog-FieldMask` (or `Route.computeRoutes` from `importLibrary('routes')`).
   - **NEVER** use `google.maps.DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
5. **Street View & Geometry**
   - Use `StreetViewPanorama` and `StreetViewService` from `importLibrary('streetView')`, and `encoding.decodePath` / `spherical.computeHeading` from `importLibrary('geometry')`.
6. **Time Zone**
   - Use Time Zone API (`maps.googleapis.com/maps/api/timezone/json`) via `/api/timezone` with graceful fallback to `Place.utcOffsetMinutes`.
7. **Security & DOM Safety**
   - **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/`. Use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - **NEVER** bind the Express server to `0.0.0.0`; bind strictly to `127.0.0.1` (or `localhost`).
   - Always preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
   - **NEVER** install banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` / `<gmpx-*>`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`

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
