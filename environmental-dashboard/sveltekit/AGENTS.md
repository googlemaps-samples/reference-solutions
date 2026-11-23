# Agent Engineering Guidelines — Environmental Dashboard (SvelteKit)

This repository implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** in **SvelteKit + TypeScript** using strictly modern, non-deprecated Google Maps Platform APIs and secure server-side BFF proxies.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API Loader v2 (`@googlemaps/js-api-loader`)**: `setOptions()` + `importLibrary()` guarded inside Svelte `onMount`.
- **2D Vector Map (`google.maps.Map`)**: Initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers**: `AdvancedMarkerElement` and `PinElement` (using `glyphText` and `marker.append(pinElement)`).
- **Places Search & Autocomplete**: `PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`, plus server-side `places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask`.
- **Reverse Geocoding**: `google.maps.Geocoder` from `importLibrary('geocoding')`.
- **Raster Heatmap Overlay**: Native `google.maps.ImageMapType` proxied via `/api/air-quality/tiles` (no WebGL dependency).
- **Environmental REST APIs (Server BFF Proxies with `X-Goog-Api-Key` & `X-Goog-FieldMask`)**:
  - Weather API (`weather.googleapis.com/v1/currentConditions:lookup`, `forecast/days:lookup`)
  - Air Quality API (`airquality.googleapis.com/v1/currentConditions:lookup`, `mapTypes/US_AQI/heatmapTiles`)
  - Pollen API (`pollen.googleapis.com/v1/forecast:lookup`)
  - Solar API (`solar.googleapis.com/v1/buildingInsights:findClosest`)
- **Routing (if added in future extensions)**: Always use `Route.computeRoutes` (`importLibrary('routes')`) or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`).

## Strict Prohibitions for Future Coding Agents

NEVER introduce deprecated, disabled, or legacy Google Maps Platform APIs or wrappers:

1. **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement` with a valid `mapId`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or `Place`.
3. **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` or Routes API v2.
5. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use `setOptions()` + `importLibrary()`.
7. **NEVER** use `PinElement.element` or `PinElement.glyph` — use `PinElement` directly with `glyphText` / `glyphSrc`.
8. **NEVER** install banned wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `@googlemaps/extended-component-library`).
9. **NEVER** call CORS-blocked Google REST APIs directly from browser `fetch()` or hardcode API keys in source files; use `$env/dynamic/public` (`PUBLIC_GOOGLE_MAPS_API_KEY`) and SvelteKit `+server.ts` BFF proxies.
10. **NEVER** bind local dev/preview servers to `0.0.0.0`; bind to `127.0.0.1` and retain `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` in `src/hooks.server.ts`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`

### Key Implementation Files

- **Map & Markers:** [`src/lib/components/GoogleMapPanel.svelte`](./src/lib/components/GoogleMapPanel.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/GoogleMapPanel.svelte`](./src/lib/components/GoogleMapPanel.svelte), [`src/lib/components/HeaderBar.svelte`](./src/lib/components/HeaderBar.svelte), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/air-quality/current/+server.ts`](./src/routes/api/air-quality/current/+server.ts), [`src/routes/api/air-quality/tiles/+server.ts`](./src/routes/api/air-quality/tiles/+server.ts), [`src/routes/api/places/search-text/+server.ts`](./src/routes/api/places/search-text/+server.ts), [`src/routes/api/pollen/forecast/+server.ts`](./src/routes/api/pollen/forecast/+server.ts), [`src/routes/api/solar/building-insights/+server.ts`](./src/routes/api/solar/building-insights/+server.ts), [`src/routes/api/weather/current/+server.ts`](./src/routes/api/weather/current/+server.ts), [`src/routes/api/weather/forecast/+server.ts`](./src/routes/api/weather/forecast/+server.ts)
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
