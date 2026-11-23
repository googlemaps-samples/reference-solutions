# Coding Agent Guidelines — NYC Store, Kiosk & ATM Locator (`react-vite`)

This project adheres strictly to the **Google Maps Platform Zero-Deprecation & Security Mandate**. Future coding agents modifying this repository MUST follow these rules.

## Modern Google Maps Platform APIs Used

- **React Map SDK**: `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`)
- **Markers & Clustering**: `AdvancedMarkerElement` (`mapId="DEMO_MAP_ID"`) + `@googlemaps/markerclusterer` (`MarkerClusterer`, `SuperClusterAlgorithm`) with a custom `AdvancedMarkerElement` cluster renderer
- **Places API (New)**:
  - `Place.searchByText()` with explicit `fields` masks and `regularOpeningHours.weekdayDescriptions`
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `AutocompleteSessionToken` + `Place.fetchFields()` (or imperatively mounted `PlaceAutocompleteElement` via `useRef` + `useEffect` listening to `gmp-select`)
- **Routes API (JS SDK)**:
  - `RouteMatrix.computeRouteMatrix()`
  - `Route.computeRoutes()` + `route.createPolylines()`
- **Geocoding**: `Geocoder` from `useMapsLibrary('geocoding')`
- **Usage Attribution**: `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` on `<Map>` and SDK requests

## Strictly Prohibited (Never Introduce)

- NEVER use `google.maps.Marker` or `@vis.gl/react-google-maps` legacy `<Marker>`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- NEVER listen to retired `gmp-placeselect` (use `gmp-select` if mounting `PlaceAutocompleteElement`).
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
- NEVER call `place.isOpen()` on the default `weekly` channel (it is beta-only and throws at runtime). Inspect `regularOpeningHours.weekdayDescriptions` instead.
- NEVER call Maps REST endpoints (`places.googleapis.com`, `routes.googleapis.com`, `maps.googleapis.com/maps/api/geocode`) directly via browser `fetch()` (CORS trap).
- NEVER hardcode API keys or shadow the global JS `Map` constructor in files importing `{ Map }` from `@vis.gl/react-google-maps`.
- NEVER hardcode fake place names, ratings, reviews, or opening hours — always fetch live data from Google Maps Platform APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`

### Key Implementation Files

- **Map & Markers:** [`src/components/MapCanvas.tsx`](./src/components/MapCanvas.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/HeaderBar.tsx`](./src/components/HeaderBar.tsx), [`src/hooks/useNycBranches.ts`](./src/hooks/useNycBranches.ts), [`src/hooks/useRouteMatrix.ts`](./src/hooks/useRouteMatrix.ts)
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
