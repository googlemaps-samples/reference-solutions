# Agent Guidelines (`vue-vite` — Real Estate Explorer)

This standalone Vue 3 + Vite + TypeScript application strictly uses **modern, non-deprecated Google Maps Platform APIs**. Any future AI coding agent modifying this repository **MUST** preserve these standards and **NEVER** reintroduce legacy or disabled APIs.

## Modern Google Maps Platform APIs Used

- **Bootstrap Loader:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`).
- **Vector Map & Attribution:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (plus `solutionChannel: 'gmp_git_agentsamples_v1.0.0'`).
- **Markers & Clustering:** `AdvancedMarkerElement` (`importLibrary('marker')`) using `marker.append(htmlElement)` for custom HTML price-pill markers and `PinElement` with `glyphText`, clustered via `@googlemaps/markerclusterer`.
- **Places API (New):**
  - `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) listening to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields(...)`.
  - `Place.searchNearby(...)` for 5 km nearby schools, groceries, and transit stations.
  - `Place.searchByText(...)` and `AutocompleteSuggestion.fetchAutocompleteSuggestions(...)` with `AutocompleteSessionToken` for workplace resolution.
- **Routes API:**
  - `RouteMatrix.computeRouteMatrix(...)` (`importLibrary('routes')`) with explicit `fields` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` for Driving (`TRAFFIC_AWARE`) and Transit ETAs.
  - `Route.computeRoutes(...)` (`importLibrary('routes')`) for rendering the commute route polyline.
- **Parcel Geometry & Polygon Drawing:**
  - `google.maps.Polygon` for cadastral parcel lot outlines.
  - `terra-draw` + `terra-draw-google-maps-adapter` for interactive search-area polygon drawing, paired with `google.maps.geometry.poly.containsLocation()`.
- **Street View:** `StreetViewPanorama` & `StreetViewService` (`importLibrary('streetView')`) + `geometry.spherical.computeHeading`.

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

- **NEVER** use `google.maps.Marker` — always use `AdvancedMarkerElement` with `mapId`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- **NEVER** listen to retired `gmp-placeselect` — always use `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix`.
- **NEVER** use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer` — always use `terra-draw` for drawing.
- **NEVER** use `@googlemaps/js-api-loader` v1 (`new Loader(...).load()`).
- **NEVER** use `PinElement.element` or `PinElement.glyph`.
- **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper libraries.
- **NEVER** hardcode API keys or use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`.
- **NEVER** hardcode fake customer reviews, ratings, or opening hours — always fetch live Places data at runtime.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/components/ListingDetailPanel.vue`](./src/components/ListingDetailPanel.vue), [`src/components/PropertyMap.vue`](./src/components/PropertyMap.vue)
- **Places, Routes & Geo Services:** [`src/components/TopFilterBar.vue`](./src/components/TopFilterBar.vue), [`src/services/placesService.ts`](./src/services/placesService.ts), [`src/services/routesService.ts`](./src/services/routesService.ts)
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
