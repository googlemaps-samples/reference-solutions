# Coding Agent Guidelines (`vue-vite`)

This repository is a zero-deprecation **Google Maps Platform** reference implementation built on **Vue 3 + Vite + TypeScript**. Any future changes MUST preserve these standards.

## Modern Google Maps Platform APIs Used

- **Maps Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Vector Map & Overlays:** `Map` (`importLibrary('maps')`) with `mapId: 'DEMO_MAP_ID'`, `clickableIcons: false`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `TrafficLayer`, `Polyline`, and DOM-safe `InfoWindow`.
- **Markers:** `AdvancedMarkerElement` + `PinElement` (`importLibrary('marker')`) using `marker.append(pin)` and `glyphText`.
- **Places:** `Place.searchByText` and `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`, `importLibrary('places')`) listening to the `gmp-select` event (`event.placePrediction.toPlace().fetchFields(...)`). Vue's compiler is configured in `vite.config.ts` with `isCustomElement: (tag) => tag.startsWith('gmp-')`.
- **Routes & Route Matrix:** `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix` (`importLibrary('routes')`) with explicit `fields` masks and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Roads API:** Server-side proxy (`/api/roads/snap` in `vite.config.ts`) calling `https://roads.googleapis.com/v1/snapToRoads` with `interpolate=true` and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`.
- **Geometry:** `spherical.computeDistanceBetween` (`importLibrary('geometry')`).

## Strictly Forbidden Deprecated / Legacy APIs & Patterns

Future coding agents MUST **NEVER** introduce any of the following:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly / use `glyphText`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` / `Place`)
- Retired `gmp-placeselect` event (always use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix`)
- `new Loader(...).load()` from `@googlemaps/js-api-loader` v1 (use `setOptions` + `importLibrary`)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- Banned wrappers: `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`
- Raw browser `fetch()` to CORS-blocked `googleapis.com` REST endpoints (keep REST calls in server/Vite middleware)
- Hardcoded API keys, `innerHTML`/`outerHTML`/`document.write`/`insertAdjacentHTML`, or binding servers to `0.0.0.0` (always bind `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client + Local Proxy (Vite Middleware)
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/roads/snap`
- **Deploy Note:** `/api/*` routes are served by Vite dev/preview middleware in `vite.config.ts`; port them to serverless/backend endpoints before deploying `dist/` to static hosting.

### Key Implementation Files

- **Map & Markers:** [`src/components/FleetMapCanvas.vue`](./src/components/FleetMapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/TopCommandBar.vue`](./src/components/TopCommandBar.vue), [`src/services/dispatchService.ts`](./src/services/dispatchService.ts), [`src/services/roadsService.ts`](./src/services/roadsService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./vite.config.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue)

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
