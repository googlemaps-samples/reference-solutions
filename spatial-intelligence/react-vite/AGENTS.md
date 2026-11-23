# AGENTS.md — Coding Agent Mandates for `spatial-intelligence` (`react-vite`)

This repository is an enterprise Google Maps Platform React + Vite + TypeScript application. Future coding agents modifying this codebase **MUST** strictly preserve zero-deprecation, security, and SDK compliance standards.

## Modern Google Maps Platform APIs Used

- **React SDK:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap()`, `useMapsLibrary()`).
  - Always alias `Map` as `GoogleMap` when importing alongside code that may reference JavaScript's built-in `Map`, or prefer `Record<string, T>` dictionaries.
- **Usage Attribution:** Always keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` and `mapId="DEMO_MAP_ID"` on `<GoogleMap>`.
- **Markers:** `AdvancedMarker` / `AdvancedMarkerElement` with `<Pin>`.
- **Places API (New):**
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
  - `Place.searchByText()` loaded via `useMapsLibrary('places')`.
- **Elevation API:** `ElevationService.getElevationForLocations()` loaded via `useMapsLibrary('elevation')`.
- **Spatial Drawing:** `terra-draw` + `terra-draw-google-maps-adapter` (`TerraDrawPolygonMode`, `TerraDrawSelectMode`, `TerraDrawRenderMode`).
- **WebGL Data Visualization:** `@deck.gl/google-maps` (`GoogleMapsOverlay`) with `ScatterplotLayer` (`@deck.gl/layers`) and `HexagonLayer` (`@deck.gl/aggregation-layers`), guarded by `isWebGL2Supported()`.
- **Routing (if added later):** Use `Route.computeRoutes()` (`useMapsLibrary('routes')`).

## Strictly Prohibited Deprecated / Legacy APIs & Packages

NEVER introduce any of the following into this project:

- **Prohibited Legacy GMP Classes:**
  - `google.maps.Marker` (use `AdvancedMarker` / `AdvancedMarkerElement`)
  - `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place`)
  - Retired `gmp-placeselect` event (always use `gmp-select`)
  - `google.maps.DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService` (use `Route.computeRoutes()` / Routes API v2)
  - `google.maps.drawing` (use Terra Draw)
  - `google.maps.visualization.HeatmapLayer` (use deck.gl `HeatmapLayer`)
  - `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`)
  - `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- **Prohibited Wrapper Packages:**
  - `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` (`<gmpx-*>`)
- **Security & CORS Mandates:**
  - NEVER hardcode API keys in source files or `.env.example`; always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
  - NEVER call `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` via raw browser `fetch()`.
  - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
  - Keep dev/preview servers bound to `127.0.0.1` (never `0.0.0.0`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/App.tsx`](./src/App.tsx), [`src/components/DeckGlSensorsOverlay.tsx`](./src/components/DeckGlSensorsOverlay.tsx), [`src/components/TerraDrawController.tsx`](./src/components/TerraDrawController.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/AnalyticsSidebar.tsx`](./src/components/AnalyticsSidebar.tsx), [`src/components/PlaceAutocompleteControl.tsx`](./src/components/PlaceAutocompleteControl.tsx)
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
