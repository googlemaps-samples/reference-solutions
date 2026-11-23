# AGENTS.md — Coding Agent Instructions

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and strictly modern, non-deprecated Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- `@googlemaps/js-api-loader` **v2** functional API (`setOptions` + `importLibrary`) — NEVER use deprecated v1 `new Loader(...).load()`.
- `Map` (`importLibrary('maps')`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- `AdvancedMarkerElement` and `PinElement` (`importLibrary('marker')`) using `marker.append(pin)` — NEVER use deprecated `google.maps.Marker`, `PinElement.element`, `PinElement.glyph`, or `AdvancedMarkerElement.content`.
- `PlaceAutocompleteElement` (`importLibrary('places')`) listening to `gmp-select` and calling `event.placePrediction.toPlace()` + `place.fetchFields()` — NEVER use deprecated `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
- `Place.searchNearby` (`importLibrary('places')`) for discovering `electric_vehicle_charging_station` and `car_repair` places with `evChargeOptions` and `regularOpeningHours`. On the `weekly` channel, derive open/closed status from `regularOpeningHours.periods` — NEVER call beta-only `place.isOpen()` unless `v: 'beta'` is configured.
- `RouteMatrix.computeRouteMatrix` and `Route.computeRoutes` (`importLibrary('routes')`) with `createPolylines()` and `legs[0].steps` — NEVER use deprecated `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- `Geocoder` (`importLibrary('geocoding')`) for reverse-geocoding breakdown coordinates.

## Security & Server Mandates

- NEVER hardcode `GOOGLE_MAPS_API_KEY` or any API key in source files or `.env.example`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js` or any client script. Always use `document.createElement()`, `textContent`, and `replaceChildren()`.
- NEVER bind `server.mjs` to `0.0.0.0`; bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
- NEVER call `routes.googleapis.com`, `places.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser `fetch()` (CORS-blocked); always use Maps JS SDK `importLibrary(...)` wrappers.
- NEVER install or import banned wrapper packages (`@googlemaps/extended-component-library`, `<gmpx-*>`, `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`app.js`](./app.js)
- **Places, Routes & Geo Services:** [`app.js`](./app.js)
- **App Entry & Config:** [`index.html`](./index.html), [`server.mjs`](./server.mjs)

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
