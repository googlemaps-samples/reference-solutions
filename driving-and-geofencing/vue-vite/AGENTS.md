# AGENTS.md — Google Maps Platform Modern Engineering Guidelines (`vue-vite`)

This repository implements the **Field Workforce Geofenced Attendance & Site Audit Router** using Vue 3, Vite, TypeScript, and modern Google Maps Platform Web APIs.

## Modern Google Maps Platform APIs Used

All future changes **MUST** preserve and build exclusively on these current-generation APIs:

1. **Dynamic Library Loader (`@googlemaps/js-api-loader` v2):**
   - Use `setOptions()` + `importLibrary('maps' | 'marker' | 'places' | 'routes' | 'geocoding' | 'geometry' | 'core')`.
   - Always include `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` on `MapOptions` and supported request payloads.
   - Always pass `mapId: 'DEMO_MAP_ID'` (or a valid Cloud Map ID) when rendering `AdvancedMarkerElement`.
2. **Markers (`marker` library):**
   - Use `AdvancedMarkerElement` and `PinElement` (with `glyphText` / `glyphSrc` and `marker.append(el)`).
   - On `v: 'weekly'`, register click handlers via `marker.addListener('click', ...)` (not beta-only `gmp-click`).
3. **Places API (New) (`places` library):**
   - Use `Place.searchByText`, `Place.searchNearby`, `PlaceAutocompleteElement` (`gmp-select` event), or `AutocompleteSuggestion.fetchAutocompleteSuggestions` with explicit `fields`.
4. **Routes API (`routes` library):**
   - Use `Route.computeRoutes` with `optimizeWaypointOrder: true`, `fields: [..., 'optimizedIntermediateWaypointIndices']`, and `route.createPolylines()`.
5. **Geocoding & Geometry (`geocoding` and `geometry` libraries):**
   - Use `Geocoder.geocode({ location })` for reverse geocoding and `google.maps.geometry.poly.containsLocation` for polygon geofence checks.
6. **Polygon Drawing:**
   - Use `terra-draw` + `terra-draw-google-maps-adapter`.
7. **Vue Custom Elements (`vite.config.ts`):**
   - Keep `isCustomElement: (tag) => tag.startsWith('gmp-')` configured in `@vitejs/plugin-vue`.

## Strictly Forbidden Deprecated / Legacy APIs & Wrappers

Future coding agents **MUST NEVER** introduce any of the following deprecated, disabled, or banned symbols:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` / `Place` / `AutocompleteSuggestion`)
- `gmp-placeselect` event (use `gmp-select`)
- `google.maps.DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.drawing` / `DrawingManager` (use `terra-draw` + `terra-draw-google-maps-adapter`)
- `google.maps.visualization.HeatmapLayer`
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages
- Direct browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` (CORS-blocked)
- Hardcoded API keys or LLM-fabricated place reviews, ratings, or opening hours

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/App.vue`](./src/App.vue), [`src/services/googleMapsService.ts`](./src/services/googleMapsService.ts)
- **Places, Routes & Geo Services:** [`src/App.vue`](./src/App.vue), [`src/services/googleMapsService.ts`](./src/services/googleMapsService.ts)
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
