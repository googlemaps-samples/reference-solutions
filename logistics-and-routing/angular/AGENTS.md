# Coding Agent Instructions (`angular`)

This project is an **Angular 22 Standalone Components** application using `@angular/google-maps` and `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`) for the **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** (`logistics-and-routing`).

## Approved Modern Google Maps Platform APIs Used Here

- **Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) loading `core`, `maps`, `marker`, `places`, `routes`, `geometry`.
- **Map & Markers:** `@angular/google-maps` `<google-map>`, `<map-advanced-marker>` (`AdvancedMarkerElement`), `<map-polyline>`, `<map-traffic-layer>`, `<map-info-window>`, with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Places API (New):** `Place.searchByText` and `PlaceAutocompleteElement` listening to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields(...)`.
- **Routes API:** `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix` with explicit `fields` masks and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Roads API:** `https://roads.googleapis.com/v1/snapToRoads` called server-side via [`serve-dist.mjs`](./serve-dist.mjs) (`POST /api/roads/snap`) with `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`.

## Strict Prohibitions for Future Edits

NEVER introduce any deprecated or banned Google Maps Platform APIs or patterns:

1. **NEVER** use `google.maps.Marker` or `<map-marker>` — ALWAYS use `AdvancedMarkerElement` / `<map-advanced-marker>`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, or `Place.searchNearby`.
3. **NEVER** listen to `gmp-placeselect` — ALWAYS listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, `<map-directions-renderer>`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
5. **NEVER** use `google.maps.visualization.HeatmapLayer`, `<map-heatmap-layer>`, or `google.maps.drawing`.
6. **NEVER** use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1.
7. **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages.
8. **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in `src/` or `.env.example`, NEVER use `innerHTML`/`outerHTML`/`document.write`, and ALWAYS bind local servers strictly to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.html`](./src/app/app.html)
- **Places, Routes & Geo Services:** [`src/app/app.ts`](./src/app/app.ts), [`src/app/services/telematics-api.service.ts`](./src/app/services/telematics-api.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./serve-dist.mjs)

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
