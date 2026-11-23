# Agent Guidelines — Real Estate (`react-vite`)

This repository implements the **Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer** in **React + Vite + TypeScript** using `@vis.gl/react-google-maps` and strictly modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **SDK Wrapper:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`)
- **Map Initialization:** Vector map with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`
- **Markers & Clustering:** `AdvancedMarkerElement` (via `<AdvancedMarker>` and `MarkerClusterer` custom `AdvancedMarkerElement` renderer from `@googlemaps/markerclusterer`)
- **Parcel & Spatial Filtering:** `google.maps.Polygon`, `google.maps.geometry.poly.containsLocation`, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`)
- **Places API (New):**
  - `PlaceAutocompleteElement` (mounted imperatively with `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace()` + `place.fetchFields()`)
  - `Place.searchNearby` (5 km nearby schools, groceries, and transit stations)
  - `Place.searchByText` (resolving workplace destinations, with `Geocoder` fallback)
- **Routes API (New):**
  - `RouteMatrix.computeRouteMatrix` (Driving `TRAFFIC_AWARE` and `TRANSIT` commute ETAs)
  - `Route.computeRoutes` (driving route path polyline overlay)
- **Street View:** `StreetViewService.getPanorama` + `StreetViewPanorama`

## Mandatory Zero-Deprecation Rules for Future Agents

1. **NEVER** reintroduce legacy or deprecated APIs:
   - Do **NOT** use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>`.
   - Do **NOT** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement` (`gmp-select`), `Place.searchNearby`, `Place.searchByText`, or `AutocompleteSuggestion`.
   - Do **NOT** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
   - Do **NOT** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
   - Do **NOT** use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer` — use `terra-draw` for drawing.
   - Do **NOT** install or import banned wrappers (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` / `<gmpx-*>`).
2. **NEVER** shadow JavaScript's built-in `Map` constructor in files importing `{ Map }` from `@vis.gl/react-google-maps` — alias as `Map as GoogleMap` and use `Record<string, T>`.
3. **NEVER** hardcode API keys or bypass `VITE_GOOGLE_MAPS_API_KEY` from `.env.local`.
4. **NEVER** hardcode Place ratings, customer reviews, or opening hours from LLM memory; all Place and Route attributes must come from live GMP API responses.
5. **ALWAYS** preserve `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` and explicit non-zero CSS dimensions on `#map-container` and `#street-view-container`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/components/ListingDetailPanel.tsx`](./src/components/ListingDetailPanel.tsx), [`src/components/RealEstateMap.tsx`](./src/components/RealEstateMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/ListingDetailPanel.tsx`](./src/components/ListingDetailPanel.tsx), [`src/components/TopSearchBar.tsx`](./src/components/TopSearchBar.tsx)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.tsx`](./src/App.tsx), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4172 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
