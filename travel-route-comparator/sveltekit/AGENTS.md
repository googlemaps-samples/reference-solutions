# AGENTS.md — SvelteKit Travel Route Comparator Guardrails

This project implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using **SvelteKit + TypeScript** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

1. **Loader (`@googlemaps/js-api-loader` v2)**:
   - Use functional `setOptions()` and `importLibrary()` inside browser-only `onMount`.
   - Load `'core'`, `'maps'`, `'marker'`, `'places'`, `'routes'`, and `'elevation'`.
2. **Maps JavaScript API**:
   - `google.maps.Map` initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
   - `google.maps.Polyline` and `google.maps.BicyclingLayer`.
3. **Marker Library**:
   - `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (passing `PinElement` directly and using `glyphText`).
4. **Places API (New)**:
   - `google.maps.places.Place.searchByText` for resolving locations dynamically at runtime.
   - `google.maps.places.PlaceAutocompleteElement` listening to `'gmp-select'` and resolving `event.placePrediction.toPlace().fetchFields(...)`.
5. **Routes API (JS SDK)**:
   - `google.maps.routes.Route.computeRoutes` with explicit `fields`, `computeAlternativeRoutes`, `routeModifiers` (`avoidTolls`, `avoidHighways`), `ReferenceRoute.FUEL_EFFICIENT`, and `ComputeRoutesExtraComputation` (`TOLLS`, `FUEL_CONSUMPTION`).
6. **Elevation API (JS SDK)**:
   - `google.maps.ElevationService.getElevationAlongPath` with `samples: 64`.

## Strictly Forbidden Deprecated APIs & Anti-Patterns

Future coding agents modifying this repository **MUST NEVER** introduce any of the following:

- **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement` + `PinElement`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement` (`gmp-select`) and `Place.searchByText`.
- **NEVER** listen to retired `gmp-placeselect` — use `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` / `RouteMatrix`.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — use v2 `setOptions()` + `importLibrary()`.
- **NEVER** install legacy Svelte wrapper packages (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`) or `@googlemaps/extended-component-library` (`<gmpx-*>`).
- **NEVER** call `routes.googleapis.com`, `places.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser `fetch()` (CORS-blocked).
- **NEVER** hardcode API keys or use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`.
- **NEVER** hardcode fake place coordinates, reviews, ratings, or opening hours in code — resolve live via Google Maps Platform APIs.
- **ALWAYS** keep `PUBLIC_GOOGLE_MAPS_API_KEY` loaded via `$env/dynamic/public` and guard Google Maps SDK initialization inside `onMount`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/elevation.ts`](./src/lib/maps/elevation.ts), [`src/lib/maps/places.ts`](./src/lib/maps/places.ts), [`src/lib/maps/routes.ts`](./src/lib/maps/routes.ts)
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
