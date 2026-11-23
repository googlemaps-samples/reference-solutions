# AGENTS.md — Google Maps Platform Engineering Guardrails

This `react-vite` project uses modern, zero-deprecation Google Maps Platform SDKs and `@vis.gl/react-google-maps`. Future coding agents modifying this repository **MUST** follow these rules:

## Modern APIs Used in This Project

- **React Wrapper:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `useMap`, `useMapsLibrary`)
- **Attribution & Map ID:** `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']} />`
- **Markers:** `AdvancedMarkerElement` via `<AdvancedMarker>` + `<Pin glyphText="..." />`
- **Places Search & Autocomplete:**
  - `Place.searchByText` (`importLibrary('places')` / `useMapsLibrary('places')`)
  - Imperatively mounted `PlaceAutocompleteElement` (`useRef` + `useEffect`) listening to `'gmp-select'` -> `event.placePrediction.toPlace()` -> `place.fetchFields()`
- **Routing:** `Route.computeRoutes` (`useMapsLibrary('routes')`) with `fields`, `computeAlternativeRoutes`, `routeModifiers`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, and `extraComputations`
- **Elevation:** `ElevationService.getElevationAlongPath` (`useMapsLibrary('elevation')`)
- **Map Overlays:** `google.maps.Polyline` and `google.maps.BicyclingLayer` (`useMapsLibrary('maps')`)

## Strictly Prohibited Legacy APIs & Patterns

- **NEVER** use `google.maps.Marker` or `@vis.gl/react-google-maps` `<Marker>`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `'gmp-placeselect'` event.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** install or import banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
- **NEVER** call `places.googleapis.com` or `routes.googleapis.com` directly from browser `fetch()` (CORS-blocked). Always use Maps JS SDK libraries (`places`, `routes`, `elevation`) in this client-only stack.
- **NEVER** shadow JavaScript's global `Map` constructor when importing `{ Map }` from `@vis.gl/react-google-maps` (keep `import { Map as GoogleMap }` and use `Record<K, V>` instead of `new Map()`).
- **NEVER** hardcode API keys in source files or `.env.example`. Always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- **NEVER** remove the beta path advisory when `WALKING` or `BICYCLING` routes are displayed.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/RouteMap.tsx`](./src/components/RouteMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlacePicker.tsx`](./src/components/PlacePicker.tsx), [`src/services/mapsService.ts`](./src/services/mapsService.ts)
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
