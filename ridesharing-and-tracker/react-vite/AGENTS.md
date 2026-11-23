# Agent Coding Guidelines — Google Maps Platform (`react-vite`)

This repository implements **Rideshare Booking, Fare Estimator & Live Driver Tracking** using **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** and **exclusively modern, zero-deprecation Google Maps Platform APIs**.

## Modern APIs Used in This Project

- **SDK Wrapper:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `useMap`, `useMapsLibrary`)
- **Map & Attribution:** `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']} />` with explicit non-zero CSS height (`min-height: 560px`)
- **Markers:** `<AdvancedMarker>` / `google.maps.marker.AdvancedMarkerElement`
- **Places Search & Autocomplete:**
  - Imperatively mounted `google.maps.places.PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields(...)`)
  - `google.maps.places.Place.searchByText()` for pre-seeded location resolution
- **Routing & Matrix:**
  - `google.maps.routes.Route.computeRoutes()` with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, and `vehicleInfo.emissionType`
  - `google.maps.routes.RouteMatrix.computeRouteMatrix()` for live candidate driver ETA ranking
- **Geometry:** `google.maps.geometry.spherical` for smooth driver marker interpolation and heading calculation

## Strict Prohibitions for Coding Agents

NEVER introduce any of the following deprecated, disabled, or banned APIs/packages:

1. **Legacy Markers:** NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `AdvancedMarkerElement` / `<AdvancedMarker>` with `mapId`.
2. **Legacy Places:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, or `Place` class methods (`Place.searchByText`, `Place.searchNearby`).
3. **Legacy Routes:** NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
4. **Legacy Visualization/Drawing:** NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
5. **Banned React Wrappers:** NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
6. **Global `Map` Shadowing:** NEVER shadow JavaScript's `Map` constructor when importing `{ Map }` from `@vis.gl/react-google-maps`; alias as `Map as GoogleMap` and use `Record<K, V>`.
7. **Web Component JSX Props:** NEVER pass objects/arrays to GMP Web Components via JSX attributes; mount imperatively with `useRef` + `useEffect`.
8. **Security & Keys:** NEVER hardcode any API key in source files or `.env.example`. Always load from `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` (`.env.local`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/RideshareMap.tsx`](./src/components/RideshareMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./src/components/PlaceAutocompleteInput.tsx), [`src/services/mapsService.ts`](./src/services/mapsService.ts)
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
