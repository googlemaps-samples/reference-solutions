# Coding Agent Guidelines — Google Maps Platform (Angular)

This repository implements the Los Angeles Rideshare Booking, Fare Estimator & Live Driver Tracking sample in **Angular Standalone Components + TypeScript (`@angular/google-maps`)** using exclusively modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **`@googlemaps/js-api-loader` (v2):** `setOptions()` + `importLibrary()` loading `core`, `maps`, `marker`, `places`, `routes`, and `geometry` with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **`@angular/google-maps`:** `GoogleMap` (`mapId: 'DEMO_MAP_ID'`), `MapAdvancedMarker` (`AdvancedMarkerElement`), `MapPolyline`, and `MapInfoWindow`.
- **Places API (New):** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>` with `gmp-select` event, `event.placePrediction.toPlace()`, and `place.fetchFields()`) and `Place.searchByText()`.
- **Routes API:** `Route.computeRoutes()` (`TRAFFIC_AWARE_OPTIMAL`, `FUEL_EFFICIENT`, `FUEL_CONSUMPTION`, `vehicleInfo.emissionType`) and `RouteMatrix.computeRouteMatrix()`.
- **Geometry Library:** `google.maps.geometry.spherical.interpolate`, `computeHeading`, and `computeDistanceBetween`.

## Strict Prohibitions for Future Edits

NEVER introduce any deprecated or legacy Google Maps Platform APIs, retired events, or banned wrapper packages:

- NEVER use `google.maps.Marker` or legacy `<map-marker>` — ALWAYS use `MapAdvancedMarker` / `AdvancedMarkerElement` with `mapId: 'DEMO_MAP_ID'`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or `Place.searchByText` / `Place.searchNearby`.
- NEVER listen to the retired `gmp-placeselect` event — ALWAYS listen to `gmp-select`.
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes()` and `RouteMatrix.computeRouteMatrix()` (or Routes API v2 REST via backend proxy).
- NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — ALWAYS use v2 `setOptions()` + `importLibrary()`.
- NEVER use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
- NEVER install or import `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, or `@googlemaps/react-wrapper`.
- NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`, NEVER use `innerHTML`/`outerHTML`/`document.write`/`insertAdjacentHTML`, and NEVER bind `serve-dist.mjs` to `0.0.0.0` (always bind to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/components/rideshare-map/rideshare-map.component.ts`](./src/app/components/rideshare-map/rideshare-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/place-autocomplete-input/place-autocomplete-input.component.ts`](./src/app/components/place-autocomplete-input/place-autocomplete-input.component.ts), [`src/app/services/rideshare-routing.service.ts`](./src/app/services/rideshare-routing.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./src/app/app.component.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit && node --check serve-dist.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node serve-dist.mjs --host 127.0.0.1 --port 4176
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
