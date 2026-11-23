# AGENTS.md — Google Maps Platform Guardrails for `sveltekit`

This standalone SvelteKit + TypeScript application enforces the **Zero-Legacy Google Maps Platform Mandate** and secure SvelteKit BFF patterns. Future coding agents modifying this repository MUST adhere to all rules below.

## Modern Google Maps Platform APIs Used

- **Maps Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions` + `importLibrary`) — NEVER use `new Loader(...).load()`.
- **Map Initialization:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers & Clustering:** `google.maps.marker.AdvancedMarkerElement` (attaching custom HTML pills via `marker.append(el)`) + `@googlemaps/markerclusterer` (`MarkerClusterer` with an `AdvancedMarkerElement` custom cluster renderer).
- **Places API (New):**
  - `google.maps.places.PlaceAutocompleteElement` listening to `gmp-select` (and calling `event.placePrediction.toPlace().fetchFields(...)`).
  - `Place.searchNearby` / `Place.searchByText` and server BFF endpoints `/api/places/nearby` (`places.googleapis.com/v1/places:searchNearby`) and `/api/places/search-text` (`places.googleapis.com/v1/places:searchText`) with explicit `X-Goog-FieldMask` headers.
- **Routes API v2:**
  - `RouteMatrix.computeRouteMatrix` / `Route.computeRoutes` and server BFF endpoints `/api/routes/matrix` (`routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`) and `/api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes`) with explicit `X-Goog-FieldMask` headers.
- **Parcel & Spatial Filtering:** `google.maps.Polygon`, `google.maps.Polyline`, `google.maps.geometry.poly.containsLocation`, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`).
- **Street View & Geocoding:** `google.maps.StreetViewPanorama`, `google.maps.StreetViewService`, and `google.maps.Geocoder`.

## Forbidden Legacy APIs & Wrapper Packages (NEVER Introduce)

1. NEVER use `google.maps.Marker` — always use `AdvancedMarkerElement`.
2. NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, or the retired `gmp-placeselect` event.
3. NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
4. NEVER use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer`.
5. NEVER use `PinElement.element` or `PinElement.glyph` — use `PinElement` directly with `glyphText` / `glyphSrc`.
6. NEVER install or import third-party Svelte Google Maps wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`) or `@googlemaps/extended-component-library` (`<gmpx-*>`).
7. NEVER hardcode API keys in source files or `.env.example`. Always read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` (`env.PUBLIC_GOOGLE_MAPS_API_KEY`).
8. NEVER touch `window`, `document`, or Google Maps JS SDK globals during SSR — keep all browser map initialization strictly inside `onMount` (or guarded by `browser`).
9. NEVER call `places.googleapis.com` or `routes.googleapis.com` directly from browser `fetch()` — route through SvelteKit `+server.ts` endpoints or use the Maps JS SDK libraries.
10. NEVER bind servers to `0.0.0.0` — keep `127.0.0.1`, and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` on all `/api/*` endpoints.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/lib/components/ListingDetailPanel.svelte`](./src/lib/components/ListingDetailPanel.svelte), [`src/lib/components/RealEstateMap.svelte`](./src/lib/components/RealEstateMap.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/TopFilterBar.svelte`](./src/lib/components/TopFilterBar.svelte), [`src/lib/maps/services.ts`](./src/lib/maps/services.ts)
- **Backend API Proxy:** [`src/routes/api/places/nearby/+server.ts`](./src/routes/api/places/nearby/+server.ts), [`src/routes/api/places/search-text/+server.ts`](./src/routes/api/places/search-text/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./src/routes/api/routes/matrix/+server.ts)
- **App Entry & Config:** [`src/routes/+page.svelte`](./src/routes/+page.svelte), [`svelte.config.js`](./svelte.config.js), [`vite.config.ts`](./vite.config.ts)

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
