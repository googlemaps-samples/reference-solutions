# Agent Coding Guidelines — NYC Spatial Intelligence (`vue-vite`)

This standalone Vue 3 + Vite + TypeScript sample uses **modern, non-deprecated Google Maps Platform APIs**. Any future coding agents modifying this repository MUST follow these mandates:

## Modern Google Maps Platform APIs Used

- **Dynamic Loader (`@googlemaps/js-api-loader` v2):** `setOptions()` + `importLibrary('core' | 'maps' | 'marker' | 'places' | 'elevation')`
- **Map Initialization:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Markers & Pins:** `AdvancedMarkerElement` and `PinElement` (using `glyphText` / `glyphSrc` and `marker.append(pin)`, listening to `'click'` on the `weekly` channel)
- **Places API (New):**
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`
  - `Place.searchByText()` for live civic infrastructure hubs
- **Elevation API:** `ElevationService.getElevationForLocations()`
- **Drawing & Overlays:**
  - `TerraDraw` + `TerraDrawGoogleMapsAdapter` (replacing legacy `google.maps.drawing`)
  - `@deck.gl/google-maps` `GoogleMapsOverlay` with `ScatterplotLayer` and `HexagonLayer` (replacing legacy `google.maps.visualization.HeatmapLayer`)

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

- **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly via `marker.append(pin)` and use `glyphText` / `glyphSrc`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`.
- **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` or Routes API v2.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
- **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`).
- **NEVER** call `googleapis.com` REST endpoints via client-side `fetch()` (CORS violation).
- **NEVER** hardcode API keys in source files or `.env.example`, and never use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/composables/useGisWorkbench.ts`](./src/composables/useGisWorkbench.ts)
- **Places, Routes & Geo Services:** [`src/components/AnalyticsSidebar.vue`](./src/components/AnalyticsSidebar.vue), [`src/composables/useGisWorkbench.ts`](./src/composables/useGisWorkbench.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx vue-tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4175 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
