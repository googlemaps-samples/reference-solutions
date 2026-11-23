# AGENTS.md — Coding Agent Mandates for `complete-heatmap/sveltekit`

This repository implements the **Miami Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using **SvelteKit + TypeScript** and modern, zero-deprecation **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs in Use

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Map & Attribution:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers & Pins:** `AdvancedMarkerElement` and `PinElement` (`glyphText`, `glyphColor`, `background`, `borderColor`), with standard `'click'` listeners on `weekly` channel.
- **Heatmap:** `HeatmapLayer` (`@deck.gl/aggregation-layers`) rendered via `GoogleMapsOverlay` (`@deck.gl/google-maps`) with automatic non-WebGL2 fallback for headless environments.
- **Places API (New):** `Place.searchByText` (with explicit `fields` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) and `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
- **Routes API:** `Route.computeRoutes` (with explicit `fields`, `via` intermediates for flood-zone bypass, and `createPolylines()`).
- **Geocoding & Elevation:** `Geocoder.geocode` (`geocoding` library) and `ElevationService.getElevationForLocations` (`elevation` library).
- **Geometry:** `google.maps.geometry.poly.containsLocation` (`geometry` library).
- **Weather API:** `https://weather.googleapis.com/v1/currentConditions:lookup`.

## Strict Prohibitions for Future Agents

1. **NEVER** reintroduce deprecated or disabled Google Maps Platform APIs:
   - `google.maps.Marker` (use `AdvancedMarkerElement`)
   - `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`)
   - `gmp-placeselect` event (use `gmp-select`)
   - `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`)
   - `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` (use deck.gl `HeatmapLayer` via `GoogleMapsOverlay` or Terra Draw)
   - `@googlemaps/js-api-loader` v1 `new Loader(...).load()` (use `setOptions` + `importLibrary`)
   - `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`)
2. **NEVER** install banned Svelte/React wrapper packages (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, `@googlemaps/extended-component-library`).
3. **NEVER** hardcode API keys in source files or `.env.example`. Always read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public`.
4. **NEVER** touch `window` or `document` during SvelteKit SSR — guard all Google Maps and deck.gl initialization inside `onMount` / browser checks.
5. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` — construct DOM nodes for `InfoWindow` using `document.createElement()` and `textContent`.
6. **NEVER** bind dev/preview servers to `0.0.0.0` — keep `127.0.0.1` in `vite.config.ts` and scripts.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`

### Key Implementation Files

- **Map & Markers:** [`src/lib/maps/heatmapOverlay.ts`](./src/lib/maps/heatmapOverlay.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/gmpClient.ts`](./src/lib/maps/gmpClient.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./src/hooks.server.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte), [`svelte.config.js`](./svelte.config.js), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npm run check
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4174 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
