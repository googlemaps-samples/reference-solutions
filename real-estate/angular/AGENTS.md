# Coding Agent Guidelines — Real Estate Explorer (Angular)

This repository implements the **Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer** using **Angular Standalone Components + TypeScript (`@angular/google-maps`)** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Bootstrap & Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), never `new Loader().load()`.
- **Map & Angular Components:** `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`, `MapMarkerClusterer`, `MapPolygon`, `MapPolyline`) configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers & Clustering:** `AdvancedMarkerElement` (via `<map-advanced-marker>`) with custom HTML price-pill elements and `@googlemaps/markerclusterer` (`MapMarkerClusterer` with custom `AdvancedMarkerElement` cluster renderer).
- **Places API (New):**
  - `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`)
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions` + `AutocompleteSessionToken`
  - `Place.searchNearby` (5 km radius nearby schools, groceries, transit with explicit `fields`)
  - `Place.searchByText` (with explicit `fields`)
- **Routes API:**
  - `RouteMatrix.computeRouteMatrix` (traffic-aware `DRIVING` and `TRANSIT` commute ETAs with explicit `fields`)
  - `Route.computeRoutes` (route polyline path with explicit `fields`)
- **Street View & Geometry & Geocoding:**
  - `StreetViewService` + `StreetViewPanorama` (`importLibrary('streetView')`)
  - `google.maps.geometry.poly.containsLocation` & `spherical.computeDistanceBetween` (`importLibrary('geometry')`)
  - `Geocoder` (`importLibrary('geocoding')`)
- **Polygon Drawing:** `terra-draw` + `terra-draw-google-maps-adapter` (`TerraDrawGoogleMapsAdapter`).

## Strict Prohibitions for Future Agents

NEVER introduce any of the following deprecated, disabled, or banned APIs/patterns:
- NEVER use `google.maps.Marker` or Angular `<map-marker>` — always use `AdvancedMarkerElement` / `<map-advanced-marker>`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, or the retired `gmp-placeselect` event.
- NEVER use `DirectionsService`, `DirectionsRenderer`, `<map-directions-renderer>`, `MapDirectionsService`, or `DistanceMatrixService`.
- NEVER use `google.maps.drawing` (`DrawingManager`) or `google.maps.visualization.HeatmapLayer` (`<map-heatmap-layer>`).
- NEVER use `@googlemaps/extended-component-library` (`<gmpx-*>`).
- NEVER use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
- NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`; load runtime config via `/env-config.js` served by `serve-dist.mjs`.
- NEVER bind `serve-dist.mjs` to `0.0.0.0` (keep loopback `127.0.0.1` only) and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html), [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/components/listing-detail/listing-detail.component.ts`](./src/app/components/listing-detail/listing-detail.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/google-maps.service.ts`](./src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./serve-dist.mjs), [`src/app/app.component.ts`](./src/app/app.component.ts)

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
