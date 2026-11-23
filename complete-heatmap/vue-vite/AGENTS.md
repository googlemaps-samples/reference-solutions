# AGENTS.md — Google Maps Platform Modern Engineering Guidelines (`vue-vite`)

This repository implements the **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using Vue 3, Vite, TypeScript, and **zero-deprecation Google Maps Platform APIs**.

## Modern Google Maps Platform APIs Used

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Map & Attribution:** `google.maps.Map` initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Vue Custom Elements:** `vite.config.ts` configures `compilerOptions.isCustomElement = (tag) => tag.startsWith('gmp-')` for native `<gmp-*>` Web Components.
- **Markers:** `google.maps.marker.AdvancedMarkerElement` paired directly with `google.maps.marker.PinElement` (`glyphText` / `glyphSrc`).
- **Places:** `google.maps.places.Place.searchByText()` (Places API New) with explicit `fields` masks (and `PlaceAutocompleteElement` with `gmp-select` if adding autocomplete).
- **Routes:** `google.maps.routes.Route.computeRoutes()` with `createPolylines()` and `via: true` intermediate perimeter waypoints.
- **Geometry:** `google.maps.geometry.poly.containsLocation()` and `isLocationOnEdge()` for polygon intersection checks.
- **Geocoding & Elevation:** `google.maps.Geocoder` (`importLibrary('geocoding')`) and `google.maps.ElevationService` (`importLibrary('elevation')`).
- **Heatmap:** `deck.gl` `HeatmapLayer` (`@deck.gl/aggregation-layers`) mounted via `GoogleMapsOverlay` (`@deck.gl/google-maps`) with graceful WebGL2 fallback.
- **Weather:** Google Maps Platform Weather API v1 (`https://weather.googleapis.com/v1/currentConditions:lookup`).

## Prohibited Legacy / Deprecated APIs (NEVER Introduce)

Future coding agents **MUST NOT** introduce any of the following deprecated or disabled APIs or banned packages:

1. **NEVER** use `google.maps.Marker` — always use `AdvancedMarkerElement` + `PinElement`.
2. **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
3. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `Place.searchByText`, `Place.searchNearby`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, or `PlaceAutocompleteElement` (`gmp-select`).
4. **NEVER** use `google.maps.DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes`.
5. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing` — always use `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay`.
6. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use `setOptions()` + `importLibrary()`.
7. **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, or `use-places-autocomplete`.
8. **NEVER** hardcode API keys in source files or use `innerHTML` / `outerHTML` / `insertAdjacentHTML`.
9. **NEVER** bind dev/preview servers to `0.0.0.0` — bind to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`

### Key Implementation Files

- **Map & Markers:** [`src/components/HazardMap.vue`](./src/components/HazardMap.vue)
- **Places, Routes & Geo Services:** [`src/services/incidentEnrichment.ts`](./src/services/incidentEnrichment.ts), [`src/services/shelterRouting.ts`](./src/services/shelterRouting.ts), [`src/services/weatherService.ts`](./src/services/weatherService.ts)
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
