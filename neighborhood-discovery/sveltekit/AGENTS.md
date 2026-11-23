# Agent Guidelines — Google Maps Platform (SvelteKit)

This repository implements the **Hyperlocal Neighborhood Directory & Spot Mapper** using **SvelteKit + TypeScript** and modern **Google Maps Platform** SDKs.

## Modern Google Maps Platform APIs Used

- **`@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`)** — Loaded strictly inside `onMount` in the browser.
- **`google.maps.Map`** — 2D vector map configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **`google.maps.marker.AdvancedMarkerElement` & `PinElement`** — Uses `PinElement` directly (`glyphText`, `background`, `borderColor`, `glyphColor`) with `marker.append(pin)` and standard `'click'` listeners (weekly-channel safe).
- **`google.maps.places.PlaceAutocompleteElement`** — Listens to `gmp-select` and calls `event.placePrediction.toPlace().fetchFields(...)`.
- **`google.maps.places.Place`** — Uses `Place.searchNearby`, `Place.searchByText`, and `place.fetchFields` with `regularOpeningHours.weekdayDescriptions`.
- **`google.maps.Geocoder`** — Forward address geocoding and map-click reverse geocoding.
- **Dynamic Env Config** — Reads `PUBLIC_GOOGLE_MAPS_API_KEY` from `$env/dynamic/public`.

## Hard Rules for Future Coding Agents

1. **NEVER** introduce deprecated or disabled Google Maps APIs:
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchNearby`, `Place.searchByText`, `Place.fetchFields`).
   - Do NOT listen to retired `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - Do NOT use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - Do NOT use deprecated `PinElement.element` or `PinElement.glyph`.
   - Do NOT call beta-only `Place.prototype.isOpen()` when using `v: 'weekly'`.
2. **NEVER** install banned third-party or legacy wrappers (`@googlemaps/extended-component-library` / `<gmpx-*>`, `svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`).
3. **NEVER** make raw browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` (CORS-blocked). Always use Maps JS `importLibrary()` classes on client-only apps.
4. **NEVER** hardcode API keys or use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
5. **NEVER** hardcode fake/LLM-generated place ratings, reviews, or opening hours; all place data must come from live Google Maps Platform API responses.
6. **ALWAYS** keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and guard browser-only Google Maps code inside `onMount`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./src/lib/maps.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
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
