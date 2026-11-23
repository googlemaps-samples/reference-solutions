# AGENTS.md — Google Maps Platform & Security Guidelines (SvelteKit)

This repository implements **Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics** using **SvelteKit + TypeScript** and **zero-deprecation** Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API Loader v2 (`@googlemaps/js-api-loader`)**:
  - Uses functional `setOptions()` + `importLibrary('core' | 'maps' | 'marker' | 'places' | 'elevation')`.
  - Guarded inside Svelte's `onMount` lifecycle so SSR never accesses `window` or `document`.
  - Reads `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` (never hardcoded).
- **2D/Vector Map (`google.maps.Map`)**:
  - Initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
  - Uses `map.data.addGeoJson()` for district capacity choropleth layers and `map.fitBounds()` for zoom-on-select.
- **Markers (`AdvancedMarkerElement` & `PinElement`)**:
  - Uses `google.maps.marker.AdvancedMarkerElement` with `PinElement` (`glyphText`) appended via `marker.append(pin)`.
- **Places Autocomplete & Search**:
  - Client-side autocomplete uses `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` and calling `event.placePrediction.toPlace()` + `place.fetchFields()`.
  - Server-side seed/reference search routes through `POST /api/places/search` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`.
- **Elevation Profiling**:
  - Server-side elevation sampling routes through `POST /api/elevation` -> `https://maps.googleapis.com/maps/api/elevation/json`, projecting only `elevation`, `location`, `resolution`, and `status`.
- **Drawing & Large-Scale Visualization**:
  - Drawing uses `terra-draw` + `terra-draw-google-maps-adapter` (replaces deprecated `google.maps.drawing`).
  - Point/hexagon analytics use `@deck.gl/google-maps` (`GoogleMapsOverlay`) with `ScatterplotLayer` and `HexagonLayer`, protected by a safe `WebGL2` availability check.

## Strict Prohibition on Legacy / Deprecated APIs

Future coding agents **MUST NEVER** introduce any of the following deprecated or disabled APIs or banned packages:

1. **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement` (`gmp-select`), `Place`, or Places API (New) REST via BFF.
3. **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes()` or Routes API v2.
5. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` — use deck.gl and Terra Draw.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use v2 `setOptions()` + `importLibrary()`.
7. **NEVER** use deprecated `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly (`marker.append(pin)`) and configure `glyphText` / `glyphSrc`.
8. **NEVER** install third-party Svelte wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`) or `@googlemaps/extended-component-library` (`<gmpx-*>`).
9. **NEVER** hardcode API keys, use `innerHTML`/`document.write`, or call `googleapis.com` REST endpoints directly from client-side `fetch()` (CORS violation).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`src/lib/maps/deckLayers.ts`](./src/lib/maps/deckLayers.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/elevation/+server.ts`](./src/routes/api/elevation/+server.ts), [`src/routes/api/places/search/+server.ts`](./src/routes/api/places/search/+server.ts)
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
