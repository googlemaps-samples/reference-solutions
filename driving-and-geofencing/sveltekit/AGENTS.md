# Agent Engineering Guidelines — Google Maps Platform (SvelteKit)

This repository implements the **Field Workforce Geofenced Attendance & Site Audit Router** using **SvelteKit + TypeScript** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps` library)**: `google.maps.Map` configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Advanced Markers (`marker` library)**: `AdvancedMarkerElement` and `PinElement` (passing `PinElement` directly as `content` and using `glyphText`; custom worker pins appended via `marker.append(element)`).
- **Dynamic Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Polygon Drawing & Geofencing (`geometry` library + Terra Draw)**: `terra-draw` + `terra-draw-google-maps-adapter` (`TerraDraw`, `TerraDrawPolygonMode`, `TerraDrawSelectMode`, `TerraDrawGoogleMapsAdapter`) and `google.maps.geometry.poly.containsLocation` / `google.maps.geometry.encoding.decodePath`.
- **Places API (New)**: Server-side BFF `POST /api/places/search` calling `https://places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask` (plus `Place.searchByText` client SDK fallback).
- **Routes API (v2)**: Server-side BFF `POST /api/routes/compute` calling `https://routes.googleapis.com/directions/v2:computeRoutes` with `optimizeWaypointOrder: true`, `TRAFFIC_AWARE`, and `X-Goog-FieldMask` requesting `routes.optimizedIntermediateWaypointIndex` (plus `Route.computeRoutes` support).
- **Geocoding API (v4)**: Server-side BFF `GET /api/geocode/reverse` calling `https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}` with `X-Goog-FieldMask` (plus `Geocoder` client SDK fallback).
- **Autocomplete (if extended)**: Always use `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`).

## Strict Zero-Deprecation & Security Rules for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`).
   - Do NOT listen to `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2 REST).
   - Do NOT use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer` (use Terra Draw or deck.gl).
   - Do NOT use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` (use `setOptions()` + `importLibrary()`).
   - Do NOT use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`).
2. **NEVER install banned wrapper packages:**
   - No `svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **SSR & Security:**
   - Guard all browser-only Google Maps calls inside Svelte `onMount`.
   - Read `PUBLIC_GOOGLE_MAPS_API_KEY` from `$env/dynamic/public` (never hardcode API keys).
   - Never use `innerHTML`, `outerHTML`, or raw HTML strings for `InfoWindow` or markers; use `document.createElement()` and `textContent`.
   - Never call `places.googleapis.com`, `routes.googleapis.com`, or `geocode.googleapis.com` directly from browser `fetch()` (always route through SvelteKit `+server.ts` endpoints or official Maps JS SDK libraries).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/geocode/reverse/+server.ts`](./src/routes/api/geocode/reverse/+server.ts), [`src/routes/api/places/search/+server.ts`](./src/routes/api/places/search/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./src/routes/api/routes/compute/+server.ts)
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
