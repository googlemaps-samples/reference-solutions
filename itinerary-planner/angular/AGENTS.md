# Coding Agent Guidelines — Google Maps Platform (Angular)

This repository implements the **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** in Angular Standalone Components (`@angular/google-maps` + `@googlemaps/js-api-loader` v2).

## Modern Google Maps Platform APIs Used

- **Bootstrap & Library Loading:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()` for `core`, `maps`, `marker`, `places`, `routes`, `streetView`, `geometry`).
- **Map & Attribution:** `@angular/google-maps` `<google-map>` (`GoogleMap`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers:** `@angular/google-maps` `<map-advanced-marker>` (`MapAdvancedMarker`) backed by `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`).
- **Places Discovery & Search:** Places API (New) via `google.maps.places.Place` (`Place.searchByText`, `Place.searchNearby`, `place.fetchFields`, `photo.getURI()`) and `google.maps.places.PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()`).
- **Multi-Stop Routing & Optimization:** Routes API via `google.maps.routes.Route.computeRoutes` (`optimizeWaypointOrder: true`, explicit `fields` mask) rendered with `<map-polyline>` (`MapPolyline`).
- **Time Zone Hub:** Time Zone API (`maps.googleapis.com/maps/api/timezone/json` proxied via `/api/timezone` in `serve-dist.mjs`) with graceful `Place.utcOffsetMinutes` fallback.
- **Street View:** `google.maps.StreetViewService.getPanorama` and `google.maps.StreetViewPanorama`.

## Strict Zero-Deprecation & Security Rules

Future coding agents editing this repository **MUST NEVER**:
1. Use `google.maps.Marker` or `<map-marker>` (always use `AdvancedMarkerElement` / `<map-advanced-marker>`).
2. Use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event (always use `PlaceAutocompleteElement` with `gmp-select`, `Place.searchByText`, `Place.searchNearby`, `place.fetchFields`).
3. Use `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`, `<map-directions-renderer>`, or `MapDirectionsService` (always use `Route.computeRoutes`).
4. Use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` or `@googlemaps/extended-component-library` (`<gmpx-*>`).
5. Use deprecated `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`).
6. Call `place.isOpen()` on the `weekly` Maps JS channel (inspect `regularOpeningHours?.weekdayDescriptions` or explicitly opt into `v: 'beta'`).
7. Hardcode any API key in source files, `environment.ts`, or `.env.example`, or bind `serve-dist.mjs` to `0.0.0.0` (always bind to `127.0.0.1`).
8. Remove `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` or collapse map container CSS height below `300px`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/timezone`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/components/street-view-panel/street-view-panel.component.ts`](./src/app/components/street-view-panel/street-view-panel.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/places-discovery.service.ts`](./src/app/services/places-discovery.service.ts), [`src/app/services/routes-planner.service.ts`](./src/app/services/routes-planner.service.ts), [`src/app/services/timezone.service.ts`](./src/app/services/timezone.service.ts)
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
