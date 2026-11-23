# Coding Agent Guardrails — Google Maps Platform (SvelteKit)

This project implements the **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** in SvelteKit + TypeScript using **only modern, non-deprecated Google Maps Platform APIs**.

## Approved Modern APIs & Patterns Used Here

- **Bootstrap & Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) guarded inside Svelte `onMount`.
- **Map & Attribution:** `google.maps.Map` (`importLibrary('maps')`) with `mapId: 'DEMO_MAP_ID'`, `clickableIcons: false`, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` (`importLibrary('marker')`) using `PinElement.glyphText` and `marker.append(...)`.
- **Places (New):** `Place.searchByText`, `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`), and REST BFF proxy `/api/places/search` (`places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`).
- **Routes API v2:** `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix` (`importLibrary('routes')`), `encoding.decodePath` (`importLibrary('geometry')`), and REST BFF proxies `/api/routes/compute` and `/api/routes/matrix` with explicit `X-Goog-FieldMask` headers.
- **Roads API:** REST BFF proxy `/api/roads/snap` (`roads.googleapis.com/v1/snapToRoads?interpolate=true`).
- **Environment & Security:** Read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public`. Build InfoWindow and marker DOM nodes using `document.createElement` and `textContent`.

## Strictly Forbidden Legacy / Banned APIs & Patterns

Future coding agents **MUST NEVER** introduce any of the following:

1. `google.maps.Marker` (use `AdvancedMarkerElement`).
2. `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or `Place.searchByText`).
3. `gmp-placeselect` event name (use `gmp-select`).
4. `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix` or Routes API v2 REST).
5. `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
7. `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`).
8. Third-party Svelte/extended wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, `@googlemaps/extended-component-library` / `<gmpx-*>`).
9. Direct browser `fetch()` to `routes.googleapis.com`, `places.googleapis.com`, or `roads.googleapis.com` (always route REST calls through `/api/...` SvelteKit server routes or use official Maps JS SDK classes).
10. Hardcoded API keys, `innerHTML` / `outerHTML`, or `0.0.0.0` server bindings.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/lib/components/DispatchMap.svelte`](./src/lib/components/DispatchMap.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/TopCommandBar.svelte`](./src/lib/components/TopCommandBar.svelte), [`src/lib/maps/services.ts`](./src/lib/maps/services.ts)
- **Backend API Proxy:** [`src/routes/api/places/search/+server.ts`](./src/routes/api/places/search/+server.ts), [`src/routes/api/roads/snap/+server.ts`](./src/routes/api/roads/snap/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./src/routes/api/routes/matrix/+server.ts)
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
