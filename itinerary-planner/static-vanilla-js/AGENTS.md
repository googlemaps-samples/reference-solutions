# Agent Coding Guidelines — `static-vanilla-js`

This standalone repository implements the **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase **MUST** use only these modern APIs and patterns:

1. **Loader (`@googlemaps/js-api-loader` v2)**:
   - Use `setOptions({ key, v: 'weekly', ... })` and `importLibrary(...)` via the `<script type="importmap">` in `index.html`.
   - **NEVER** use the deprecated `new Loader(...).load()` API.
2. **2D Map & Usage Attribution**:
   - Use `new Map(el, { mapId: 'DEMO_MAP_ID', internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'], ... })`.
   - Always keep explicit non-zero CSS dimensions (`min-height: 520px`) on `#map-container`.
3. **Markers**:
   - Use `AdvancedMarkerElement` and `PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`) appended via `marker.append(pin)`.
   - Listen to standard `'click'` on `AdvancedMarkerElement` when on the `weekly` channel (do not use `gmp-click` without `v: 'beta'`).
   - **NEVER** use deprecated `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
4. **Places API (New)**:
   - Use `PlaceAutocompleteElement` listening for `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields(...)`), `Place.searchByText`, and `Place.searchNearby`.
   - Use `regularOpeningHours?.weekdayDescriptions` on `weekly` (do not call beta-only `place.isOpen()` on `weekly`).
   - **NEVER** use deprecated `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
5. **Routes API**:
   - Use `Route.computeRoutes(...)` and `route.createPolylines(...)` from `importLibrary('routes')`.
   - **NEVER** use deprecated `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
6. **Street View & Time Zone**:
   - Use `StreetViewService.getPanorama` and `StreetViewPanorama` from `importLibrary('streetView')`.
   - Proxy Time Zone REST requests (`maps.googleapis.com/maps/api/timezone/json`) through `/api/timezone` in `server.mjs` to avoid client CORS issues and API key exposure in browser REST URLs.

## Security & Architecture Rules

- **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in any source file or `.env.example`.
- **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js` or `index.html`; always use `document.createElement()`, `textContent`, and `replaceChildren()`.
- **NEVER** bind `server.mjs` to `0.0.0.0`; strictly bind to `127.0.0.1` and retain `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
- **NEVER** install or import banned legacy wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
- **NEVER** hardcode fake ratings, reviews, or opening hours; all place data must come from live Places API (New) responses.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/timezone`

### Key Implementation Files

- **Map & Markers:** [`app.js`](./app.js)
- **Places, Routes & Geo Services:** [`app.js`](./app.js)
- **Backend API Proxy:** [`server.mjs`](./server.mjs)
- **App Entry & Config:** [`index.html`](./index.html)

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
