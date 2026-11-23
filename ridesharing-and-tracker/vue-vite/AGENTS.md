# Coding Agent Guidelines — Ridesharing & Live Driver Tracker (`vue-vite`)

This repository implements the Los Angeles Rideshare Booking, Fare Estimator & Live Driver Tracking sample using **Vue 3 + Vite + TypeScript** and modern, zero-deprecation **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Map & Attribution:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` (using `PinElementOptions.glyphText` / `marker.append(...)`) from `importLibrary('marker')`.
- **Places:** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) with the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`), and `Place.searchByText(...)` from `importLibrary('places')`.
- **Routes:** `Route.computeRoutes(...)` (with `RoutingPreference.TRAFFIC_AWARE_OPTIMAL`, `ReferenceRoute.FUEL_EFFICIENT`, `ComputeRoutesExtraComputation.FUEL_CONSUMPTION`, `vehicleInfo.emissionType`) and `RouteMatrix.computeRouteMatrix(...)` from `importLibrary('routes')`.
- **Geometry:** `spherical.computeDistanceBetween`, `spherical.computeHeading`, and `spherical.interpolate` from `importLibrary('geometry')`.
- **Vue Custom Elements:** `vite.config.ts` configures `compilerOptions.isCustomElement = (tag) => tag.startsWith('gmp-')`.

## Strictly Prohibited Legacy APIs & Patterns

Future coding agents modifying this repository **MUST NEVER** introduce any of the following deprecated, disabled, or unsafe patterns:

1. **NEVER** use `google.maps.Marker` (use `AdvancedMarkerElement`).
2. **NEVER** use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`, and attach with `marker.append(...)`).
3. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, or `Place.searchNearby`).
4. **NEVER** listen to `gmp-placeselect` (use `gmp-select`).
5. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`).
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` (use `setOptions` + `importLibrary`).
7. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
8. **NEVER** install or import `@googlemaps/extended-component-library` (`<gmpx-*>`).
9. **NEVER** call `routes.googleapis.com`, `places.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser `fetch()` (CORS-blocked).
10. **NEVER** hardcode API keys, use `innerHTML` / `outerHTML` / `insertAdjacentHTML`, or bind dev/preview servers to `0.0.0.0`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/composables/useRideshareMap.ts`](./src/composables/useRideshareMap.ts)
- **Places, Routes & Geo Services:** [`src/composables/useRideshareMap.ts`](./src/composables/useRideshareMap.ts), [`src/utils/drivers.ts`](./src/utils/drivers.ts)
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
