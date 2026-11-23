# Coding Agent Guidelines — Google Maps Platform (`static-vanilla-js`)

This repository implements **Rideshare Booking, Fare Estimator & Live Driver Tracking** using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

Future coding agents MUST preserve these modern, non-deprecated APIs and patterns:

1. **Maps JavaScript API Loader (`@googlemaps/js-api-loader` v2):**
   - Use `setOptions({ key, v: 'weekly', internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'], ... })` and `importLibrary(...)`.
   - Always include attribution ID `gmp_git_agentsamples_v1.0.0`.
2. **2D Vector Map & Markers (`maps`, `marker`):**
   - Initialize `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
   - Use `AdvancedMarkerElement` and `PinElement` (with `glyphText` / `glyphSrc` — never `PinElement.element` or `PinElement.glyph`).
3. **Places API (New) (`places` + REST proxy `/api/places/search`):**
   - Use `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
   - Use `Place.searchByText` or server-proxied `https://places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask`.
4. **Routes API v2 (`routes` + REST proxies `/api/routes/compute` & `/api/routes/matrix`):**
   - Use `Route.computeRoutes` or server-proxied `https://routes.googleapis.com/directions/v2:computeRoutes` with `routingPreference: 'TRAFFIC_AWARE_OPTIMAL'`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, and explicit `X-Goog-FieldMask`.
   - Use server-proxied `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-FieldMask` for candidate driver ETA evaluation.
5. **Geometry Library (`geometry`):**
   - Use `encoding.decodePath()` and `spherical.computeDistanceBetween()` / `spherical.computeHeading()` / `spherical.interpolate()`.

## Strictly Forbidden Legacy / Banned APIs & Security Anti-Patterns

- **NEVER** use `google.maps.Marker` (use `AdvancedMarkerElement`).
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- **NEVER** use `@googlemaps/extended-component-library` (`<gmpx-*>`) or `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
- **NEVER** use `PinElement.element` or `PinElement.glyph`.
- **NEVER** call `routes.googleapis.com` or `places.googleapis.com` directly from browser `fetch()` (always route through `server.mjs` `/api/...` or use the Maps JS SDK libraries).
- **NEVER** hardcode API keys or use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` (use `document.createElement`, `textContent`, `replaceChildren`).
- **NEVER** bind `server.mjs` to `0.0.0.0` (always bind strictly to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

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
