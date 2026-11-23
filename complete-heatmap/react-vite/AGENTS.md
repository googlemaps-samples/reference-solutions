# AGENTS.md — Coding Agent Instructions for `react-vite`

This repository implements the **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** using **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`**: `<APIProvider>`, `<Map as GoogleMap>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`
- **Maps JavaScript API (`maps`, `core`, `marker`, `geometry`)**:
  - `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - `AdvancedMarkerElement` / `<AdvancedMarker>` + `<Pin>`
  - `google.maps.Polygon`, `google.maps.Polyline`, `google.maps.Circle` (WebGL2 fallback), `google.maps.geometry.poly.containsLocation`
- **deck.gl Heatmap (`@deck.gl/aggregation-layers`, `@deck.gl/google-maps`)**:
  - `HeatmapLayer` rendered via `GoogleMapsOverlay` (with graceful 2D fallback when WebGL2 is unavailable)
- **Places API (New) (`places`)**:
  - `Place.searchByText` (using `regularOpeningHours` on the `weekly` channel)
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening strictly to `gmp-select` and calling `event.placePrediction.toPlace()` + `place.fetchFields()`
- **Routes API (`routes`)**:
  - `Route.computeRoutes` with `intermediates: [{ location, via: true }]` for flood-polygon bypass routing
- **Geocoding API (`geocoding`)**: `Geocoder.geocode({ location })`
- **Elevation API (`elevation`)**: `ElevationService.getElevationForLocations({ locations })`
- **Weather API (REST v1)**: `https://weather.googleapis.com/v1/currentConditions:lookup`

## Strict Zero-Deprecation & Security Rules for Future Agents

1. **NEVER** introduce deprecated or disabled Google Maps Platform APIs:
   - NO `google.maps.Marker` (use `AdvancedMarkerElement` / `<AdvancedMarker>`)
   - NO `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or retired `gmp-placeselect` (use `PlaceAutocompleteElement` + `gmp-select`, `Place.searchByText`, `Place.searchNearby`, `AutocompleteSuggestion`)
   - NO `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`)
   - NO `google.maps.visualization.HeatmapLayer` (use deck.gl `HeatmapLayer` + `GoogleMapsOverlay`)
   - NO `google.maps.drawing`
   - NO `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly / use `glyphText` / `glyphSrc` or `<Pin>`)
   - NO `place.isOpen()` on the default `weekly` channel
2. **NEVER** install banned wrappers (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` `<gmpx-*>`).
3. **NEVER** shadow the global JavaScript `Map` constructor in files importing `Map` from `@vis.gl/react-google-maps` (alias as `GoogleMap` and use `Record<K, V>` for dictionaries).
4. **NEVER** hardcode API keys in source files or `.env.example`; read strictly from `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
5. **ALWAYS** preserve `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>` and keep `VITE_GOOGLE_MAPS_API_KEY` out of version control.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`

### Key Implementation Files

- **Map & Markers:** [`src/components/map/DeckGlHeatmapOverlay.tsx`](./src/components/map/DeckGlHeatmapOverlay.tsx), [`src/components/map/EvacuationRouteLayer.tsx`](./src/components/map/EvacuationRouteLayer.tsx), [`src/components/map/ShelterMarkers.tsx`](./src/components/map/ShelterMarkers.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./src/components/PlaceAutocompleteInput.tsx), [`src/services/enrichmentService.ts`](./src/services/enrichmentService.ts), [`src/services/routingService.ts`](./src/services/routingService.ts), [`src/services/shelterService.ts`](./src/services/shelterService.ts), [`src/services/weatherService.ts`](./src/services/weatherService.ts)
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
