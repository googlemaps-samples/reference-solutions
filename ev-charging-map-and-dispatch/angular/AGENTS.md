# AGENTS.md — Google Maps Platform Coding Standards (`angular`)

This project implements **On-Demand Local Services & EV Roadside Dispatch** in **Angular Standalone Components + TypeScript (`@angular/google-maps`)** using strictly modern, non-deprecated Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JS Dynamic Loader:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`)
- **Angular Map Components:** `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`) with `CUSTOM_ELEMENTS_SCHEMA`
- **Maps & Overlays:** `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `google.maps.Circle`, `google.maps.InfoWindow`, `google.maps.Polyline` (via `route.createPolylines`)
- **Markers:** `AdvancedMarkerElement` and `PinElement` (using `glyphText` / `PinElement` directly)
- **Places API (New):** `PlaceAutocompleteElement` (listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`), `Place.searchNearby` (with `evChargeOptions` and `regularOpeningHours`)
- **Routes API:** `RouteMatrix.computeRouteMatrix` and `Route.computeRoutes` (with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`)
- **Geocoding API:** `Geocoder.geocode({ location })` for reverse geocoding

## Strict Prohibitions for Future Agents

1. **NEVER** reintroduce deprecated or disabled Google Maps Platform APIs:
   - Do NOT use `google.maps.Marker` or `<map-marker>` (use `AdvancedMarkerElement` / `<map-advanced-marker>`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, nor listen to `gmp-placeselect` (use `PlaceAutocompleteElement` with `gmp-select` and `Place.searchNearby`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, `<map-directions-renderer>`, `MapDirectionsService`, or `DistanceMatrixService` (use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`).
   - Do NOT use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1 (use `setOptions` + `importLibrary`).
   - Do NOT use `PinElement.element`, `PinElement.glyph`, or beta-only `place.isOpen()` on the `weekly` channel.
   - Do NOT install `@googlemaps/extended-component-library` (`<gmpx-*>`) or `google-map-react`.
2. **Security & Runtime Configuration:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in `environment.ts`, source files, or `.env.example`. Load it at runtime via `serve-dist.mjs` (`/env-config.js`) from `.env` / `process.env.GOOGLE_MAPS_API_KEY`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; construct DOM nodes (e.g. `InfoWindow` content) with `document.createElement` and `textContent`.
   - Bind servers strictly to `127.0.0.1` and include `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
3. **No Fake Place Data:** Never hardcode place names, coordinates, ratings, or opening hours; always fetch live data via Google Maps Platform APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/app.component.ts`](./src/app/app.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/google-maps.service.ts`](./src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./serve-dist.mjs), [`src/app/app.component.ts`](./src/app/app.component.ts)

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
