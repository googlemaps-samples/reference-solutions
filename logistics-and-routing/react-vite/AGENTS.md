# Coding Agent Instructions (`react-vite`)

This project is built strictly on modern, zero-deprecation Google Maps Platform APIs and `@vis.gl/react-google-maps`.

## Approved Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`):**
  - `<APIProvider>` with `libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}`
  - `<Map>` (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`, `clickableIcons={false}`)
  - `<AdvancedMarker>`, `<Pin glyphText="..." />`, and `<InfoWindow>`
  - `google.maps.Polyline` and `google.maps.TrafficLayer`
  - `google.maps.geometry.spherical.computeDistanceBetween`
- **Places API (New):**
  - `Place.searchByText` for live Dallas logistics hub discovery
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
- **Routes API (Maps JS `routes` library):**
  - `Route.computeRoutes` with explicit `fields` mask (including `optimizedIntermediateWaypointIndices`)
  - `RouteMatrix.computeRouteMatrix` with explicit `fields` mask
- **Roads API (Server-side BFF Proxy in `vite.config.ts`):**
  - `POST /api/roads/snap` -> `https://roads.googleapis.com/v1/snapToRoads` with `interpolate=true` and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`

## Strictly Prohibited Legacy APIs & Wrappers

Future coding agents **MUST NEVER** introduce any of the following:

1. `google.maps.Marker` or `<Marker>` (use `AdvancedMarkerElement` / `<AdvancedMarker>`).
2. `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
3. `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
4. `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
5. `PinElement.element` or `PinElement.glyph` (use `PinElement` / `<Pin>` with `glyphText` or `glyphSrc`).
6. Banned React wrapper packages (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
7. Direct client-side `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, `roads.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode`.
8. Hardcoded API keys in source files or `.env.example`, or binding local servers to `0.0.0.0`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client + Local Proxy (Vite Middleware)
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/roads/snap`
- **Deploy Note:** `/api/*` routes are served by Vite dev/preview middleware in `vite.config.ts`; port them to serverless/backend endpoints before deploying `dist/` to static hosting.

### Key Implementation Files

- **Map & Markers:** [`src/components/VehicleMarkers.tsx`](./src/components/VehicleMarkers.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceSearchBar.tsx`](./src/components/PlaceSearchBar.tsx), [`src/services/roadsService.ts`](./src/services/roadsService.ts), [`src/services/routingService.ts`](./src/services/routingService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./vite.config.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.tsx`](./src/App.tsx)

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
