# Coding Agent Guidelines — Hyperlocal Neighborhood Directory & Spot Mapper (`react-vite`)

This repository is a standalone **React + Vite + TypeScript** sample built with `@vis.gl/react-google-maps` and the modern Google Maps Platform JavaScript API.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`**: `<APIProvider>`, `<Map>` (aliased as `GoogleMap` to avoid shadowing global `Map`), `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `<Circle>`, `useMap()`, `useMapsLibrary()`.
- **Map ID & Attribution**: `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>` and `PlaceAutocompleteElement`.
- **Places API (New)**:
  - `Place.searchNearby` (`useMapsLibrary('places')`) for 5 km radius neighborhood discovery.
  - `Place.fetchFields` for live ratings, `priceLevel`, `regularOpeningHours`, `reviews`, `photos`, `websiteURI`, `internationalPhoneNumber`, and `googleMapsURI`.
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Geocoding API**: `Geocoder` (`useMapsLibrary('geocoding')`) for forward address geocoding and map-click reverse geocoding.
- **Routing (if extended in future)**: Use `Route.computeRoutes` (`useMapsLibrary('routes')`).

## Mandatory Zero-Deprecation & Security Rules

Future coding agents modifying this codebase **MUST NEVER**:

1. **Never introduce deprecated or disabled Google Maps Platform APIs**:
   - NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `AdvancedMarkerElement` / `<AdvancedMarker>` + `<Pin>`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchNearby`, `Place.searchByText`, and `Place.fetchFields`.
   - NEVER listen to retired `gmp-placeselect` — ALWAYS listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes` or Routes API v2.
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use deprecated `PinElement.element` or `PinElement.glyph` — pass `<Pin>` React children or `glyphText` / `glyphSrc`.
   - NEVER call beta-only `Place.prototype.isOpen()` or `gmp-click` on the default `weekly` channel — inspect `regularOpeningHours.weekdayDescriptions` and `periods` instead.
2. **Never install banned wrapper packages**:
   - NEVER use `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **Never shadow global `Map` constructor**:
   - Import `{ Map as GoogleMap }` or use `Record<string, T>` instead of `new Map()`.
4. **Never make raw browser `fetch()` calls to `googleapis.com` REST endpoints** (CORS trap) or hardcode API keys in source files / `.env.example`.
5. **Never fabricate place data**: All ratings, hours, reviews, coordinates, and addresses must come from live Google Maps Platform API responses or user input (for session-scoped Community Spots).
6. **Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`**.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/NeighborhoodMap.tsx`](./src/components/NeighborhoodMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/HeaderBar.tsx`](./src/components/HeaderBar.tsx), [`src/utils/placeMapper.ts`](./src/utils/placeMapper.ts)
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
