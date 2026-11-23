# Coding Agent Guidelines — Field Workforce Geofenced Attendance & Site Audit Router (`react-vite`)

This repository implements the **Field Workforce Geofenced Attendance & Site Audit Router** using **React + Vite + TypeScript** and **`@vis.gl/react-google-maps`**.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase **MUST** preserve and exclusively use these modern APIs:

1. **Map & Markers (`@vis.gl/react-google-maps`)**:
   - `<APIProvider>` and `<Map>` (aliased as `Map as GoogleMap` to avoid shadowing JS `Map`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
   - `<AdvancedMarker>` + `<Pin glyphText={...} />` (`AdvancedMarkerElement`).
2. **Geofence Drawing**:
   - `terra-draw` (`TerraDraw`, `TerraDrawPolygonMode`, `TerraDrawSelectMode`) + `terra-draw-google-maps-adapter` (`TerraDrawGoogleMapsAdapter`).
3. **Geofence Containment**:
   - `google.maps.geometry.poly.containsLocation` via `useMapsLibrary('geometry')`.
4. **Reverse Geocoding**:
   - `Geocoder` via `useMapsLibrary('geocoding')`.
5. **Places Discovery & Autocomplete**:
   - `Place.searchByText` via `useMapsLibrary('places')`.
   - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect` listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
6. **Multi-Stop Routing & Waypoint Optimization**:
   - `Route.computeRoutes` (with `optimizeWaypointOrder: true`, `routingPreference: 'TRAFFIC_AWARE'`, explicit `fields` mask, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) and `route.createPolylines()` via `useMapsLibrary('routes')`.

## Strictly Prohibited (Zero-Legacy & Security Rules)

- **NEVER** introduce `google.maps.Marker` or `@vis.gl/react-google-maps` legacy `<Marker>`.
- **NEVER** introduce `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- **NEVER** listen to retired `gmp-placeselect` (always use `gmp-select`).
- **NEVER** introduce `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- **NEVER** introduce `google.maps.drawing` or `google.maps.visualization.HeatmapLayer`.
- **NEVER** use deprecated `PinElement.element` or `PinElement.glyph`.
- **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
- **NEVER** install banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
- **NEVER** call `places.googleapis.com`, `routes.googleapis.com`, `geocode.googleapis.com`, or `addressvalidation.googleapis.com` directly via browser `fetch()`.
- **NEVER** hardcode API keys anywhere in source files or `.env.example`. Always load `VITE_GOOGLE_MAPS_API_KEY` from `.env.local`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `terra-draw`

### Key Implementation Files

- **Map & Markers:** [`src/components/AustinOperationsMap.tsx`](./src/components/AustinOperationsMap.tsx), [`src/hooks/useTerraDraw.ts`](./src/hooks/useTerraDraw.ts)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/PlaceAutocompleteBox.tsx`](./src/components/PlaceAutocompleteBox.tsx)
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
