# Agent Engineering Guidelines — `vue-vite` (EV Roadside Dispatch)

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using **Vue 3 + Vite + TypeScript** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used Here

- **Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions` + `importLibrary`) — NEVER use `new Loader(...)`.
- **Map & Overlays**: `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `google.maps.Circle`, `google.maps.InfoWindow`, `google.maps.Polyline`.
- **Markers**: `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` — pass `PinElement` directly to `content`, use `marker.append(el)` for custom DOM badges, and listen to `'click'` on the marker for `weekly` channel compatibility.
- **Places API (New)**: `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) with the `gmp-select` event (`event.placePrediction.toPlace()`), `Place.searchNearby`, and `Place.searchByText` fallback. Compute opening status from `regularOpeningHours.periods` + `utcOffsetMinutes` rather than beta-only `place.isOpen()`.
- **Routes API**: `RouteMatrix.computeRouteMatrix` for multi-destination ETA sorting and `Route.computeRoutes` (`route.createPolylines(...)`) for polyline rendering and turn-by-turn steps.
- **Geocoding API**: `google.maps.Geocoder` for reverse geocoding.

## Strictly Forbidden Legacy / Banned Patterns

Future coding agents modifying this project MUST NEVER introduce:

- `google.maps.Marker`
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
- Retired `gmp-placeselect` event or beta-only `gmp-click` / `place.isOpen()` on `weekly` channel
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/js-api-loader` v1 (`new Loader(...).load()`)
- `PinElement.element` or `PinElement.glyph`
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages
- Direct browser `fetch()` to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode`
- Hardcoded API keys, `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`, or binding servers to `0.0.0.0`

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/App.vue`](./src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./src/App.vue), [`src/services/googleMapsDispatch.ts`](./src/services/googleMapsDispatch.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx vue-tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4175 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
