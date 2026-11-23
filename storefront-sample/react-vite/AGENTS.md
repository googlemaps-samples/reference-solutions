# Coding Agent Guidelines (`react-vite`)

This standalone project implements **Single-Venue Storefront, Booking & Get Directions Hub** using **React + Vite + TypeScript** and **`@vis.gl/react-google-maps`**.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`** (`APIProvider`, `Map as GoogleMap`, `AdvancedMarker`, `InfoWindow`, `useAdvancedMarkerRef`, `useMap`, `useMapsLibrary`)
- **`AdvancedMarkerElement`** via `<AdvancedMarker>` on `<GoogleMap mapId="DEMO_MAP_ID">`
- **Usage Attribution:** `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<GoogleMap>`, `Place.searchByText`, `Route.computeRoutes`, and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` on `PlaceAutocompleteElement`
- **Places API (New):**
  - `Place.searchByText()` (`importLibrary('places')` / `useMapsLibrary('places')`)
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
- **Routes API (JS SDK):**
  - `Route.computeRoutes()` (`useMapsLibrary('routes')`) with explicit `fields` mask (`['path', 'durationMillis', 'distanceMeters', 'localizedValues', 'viewport', 'description', 'warnings']`) and `route.createPolylines()`
- **Street View & Geometry (Maps JS API):**
  - `StreetViewService.getPanorama()` + `StreetViewPanorama` (`useMapsLibrary('streetView')`)
  - `geometry.spherical.computeDistanceBetween()` & `computeHeading()` (`useMapsLibrary('geometry')`)
- **Overlays:** `google.maps.Circle` (`useMapsLibrary('maps')`) for the 5,000 m home-visit coverage radius

## Strict Prohibitions for Future Agents

1. **NEVER** reintroduce deprecated or disabled Google Maps Platform APIs:
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement` / `<AdvancedMarker>`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` and `Place.searchByText`).
   - NEVER listen to the retired `gmp-placeselect` event (always use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `Place.prototype.isOpen()` on the default `weekly` channel (inspect `regularOpeningHours.periods` instead).
   - NEVER use `PinElement.element` or `PinElement.glyph`.
2. **NEVER** install or import banned React wrapper packages (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
3. **NEVER** make direct browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` (client-side CORS trap). Always use the Maps JS SDK libraries.
4. **NEVER** shadow JavaScript's built-in `Map` constructor when importing `{ Map }` from `@vis.gl/react-google-maps` (import as `Map as GoogleMap` and use `Record<K, V>` for dictionaries).
5. **NEVER** hardcode API keys or LLM-hallucinated place ratings, hours, or reviews. Always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` and fetch place data at runtime.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/ClinicMapViewport.tsx`](./src/components/ClinicMapViewport.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/ClinicMapViewport.tsx`](./src/components/ClinicMapViewport.tsx), [`src/components/DirectionsPanel.tsx`](./src/components/DirectionsPanel.tsx)
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
