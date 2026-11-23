# Coding Agent Mandates — Google Maps Platform (`vue-vite`)

This repository is a **zero-deprecation** Vue 3 + Vite + TypeScript Google Maps Platform sample (`Hyperlocal Neighborhood Directory & Spot Mapper`). All future edits MUST preserve these strict API, security, and framework rules.

## Modern Google Maps Platform APIs Used

- **Bootstrap Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
- **Map & Overlay:** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, plus `google.maps.Circle` (`clickable: false`).
- **Markers:** `AdvancedMarkerElement` and `PinElement` (`glyphText`, `glyphColor`, `background`, `borderColor`, passed directly as `content: pin`) with standard `'click'` listeners (safe on the `weekly` channel).
- **Places API (New):**
  - `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
  - `Place.searchNearby(...)`, `Place.searchByText(...)`, and `place.fetchFields(...)`.
  - Inspect `place.regularOpeningHours?.weekdayDescriptions` on the `weekly` channel.
- **Geocoding:** `google.maps.Geocoder` (`importLibrary('geocoding')`) for forward and reverse geocoding.
- **Future Routing (if added):** Always use `Route.computeRoutes` (`importLibrary('routes')`).

## Strictly Forbidden Deprecated / Legacy APIs & Patterns

NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchNearby`, `Place.searchByText`, `Place.fetchFields`)
- `gmp-placeselect` event (always use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`
- `new Loader(...).load()` from `@googlemaps/js-api-loader` v1
- `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`)
- `place.isOpen()` on the `weekly` channel (beta-only; throws runtime error on `weekly`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages
- Raw browser `fetch()` to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode`
- `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` DOM sinks
- Hardcoded API keys anywhere in code or `.env.example` (always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`)
- Binding dev/preview servers to `0.0.0.0` (always bind to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/MapCanvas.vue`](./src/components/MapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/HeaderBar.vue`](./src/components/HeaderBar.vue), [`src/services/googleMaps.ts`](./src/services/googleMaps.ts)
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
