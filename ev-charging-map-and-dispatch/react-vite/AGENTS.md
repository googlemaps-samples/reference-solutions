# AGENTS.md — Google Maps Platform Engineering Guardrails

This `react-vite` sample implements **On-Demand Local Services & EV Roadside Dispatch** using strictly modern, non-deprecated Google Maps Platform APIs via `@vis.gl/react-google-maps` and `@types/google.maps`.

## Modern Google Maps Platform APIs Used

- **Maps & Markers:**
  - `APIProvider`, `Map` (aliased as `GoogleMap` to avoid shadowing JS global `Map`), `Circle`, `Polyline`, `InfoWindow`
  - `AdvancedMarker` (`AdvancedMarkerElement`) & `Pin` (`PinElement` with `glyphText`)
  - Mandatory attributes on `<Map>`: `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`
- **Places API (New):**
  - `PlaceAutocompleteElement` imperatively mounted via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
  - `Place.searchNearby` (with `Place.searchByText` fallback) requesting `evChargeOptions` and `regularOpeningHours`
  - Weekly-channel-safe opening hours evaluation via `regularOpeningHours.periods` / `weekdayDescriptions` (never beta-only `place.isOpen()`)
- **Routes API:**
  - `RouteMatrix.computeRouteMatrix` (`importLibrary('routes')`) for live driving ETA sorting
  - `Route.computeRoutes` (`importLibrary('routes')`) for active route polyline and turn-by-turn steps
- **Geocoding API:**
  - `Geocoder` (`importLibrary('geocoding')`) for reverse geocoding driver pin coordinates

## Strict Prohibitions for Future Coding Agents

NEVER introduce any deprecated, legacy, or banned APIs/packages into this project:

- **NEVER** use `google.maps.Marker` or `<Marker>` — always use `<AdvancedMarker>` (`AdvancedMarkerElement`).
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement`, `Place.searchNearby`, `Place.searchByText`, or `AutocompleteSuggestion`.
- **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — use `<Pin glyphText="..." />` or `PinElementOptions.glyphText`.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** install or import banned wrappers: `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
- **NEVER** call Google Maps REST endpoints directly via browser `fetch()` (CORS violation); always use Maps JS SDK `importLibrary` / `useMapsLibrary` wrappers.
- **NEVER** shadow JavaScript's global `Map` constructor when importing `Map` from `@vis.gl/react-google-maps` (alias as `GoogleMap` and use `Record<K, V>` for dictionaries).
- **NEVER** hardcode API keys in source files or `.env.example`, and never call beta-only `place.isOpen()` on the default `weekly` channel.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/DispatchMap.tsx`](./src/components/DispatchMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/HeaderBar.tsx`](./src/components/HeaderBar.tsx), [`src/services/reverseGeocode.ts`](./src/services/reverseGeocode.ts), [`src/services/routeDispatch.ts`](./src/services/routeDispatch.ts), [`src/services/routeMatrix.ts`](./src/services/routeMatrix.ts)
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
