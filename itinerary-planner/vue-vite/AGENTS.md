# Coding Agent Instructions — Google Maps Platform (`vue-vite`)

This repository is a **Vue 3 + Vite + TypeScript** Google Maps Platform sample implementing the **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub**.

## Modern Google Maps Platform APIs Used

Always preserve and extend using ONLY these current, non-deprecated APIs:

1. **Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`).
2. **Attribution & Map ID**: `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` on `<gmp-*>` custom elements).
3. **Markers**: `AdvancedMarkerElement` and `PinElement` from `importLibrary('marker')`.
   - Use `PinElementOptions.glyphText` / `glyphSrc`.
   - Compose via `marker.append(pin)` and listen with `marker.addEventListener('click', ...)` on the `weekly` channel.
4. **Places API (New)**:
   - `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
   - `Place.searchByText()`, `Place.searchNearby()`, `Place.fetchFields()`, `Photo.getURI()`, and `place.regularOpeningHours?.weekdayDescriptions`.
   - Configured in `vite.config.ts` via `isCustomElement: (tag) => tag.startsWith('gmp-')`.
5. **Routes API**:
   - `Route.computeRoutes()` from `importLibrary('routes')` with explicit `fields` mask, `optimizeWaypointOrder`, and `route.createPolylines()`.
6. **Street View**:
   - `StreetViewService.getPanorama()` and `StreetViewPanorama` from `importLibrary('streetView')`.
7. **Time Zone API**:
   - `https://maps.googleapis.com/maps/api/timezone/json` with graceful fallback to `Place.utcOffsetMinutes`.

## Prohibited Legacy / Banned APIs & Patterns

**NEVER** introduce any of the following deprecated, disabled, or banned symbols/patterns:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, `Place.fetchFields`, `AutocompleteSuggestion`)
- `gmp-placeselect` event (retired; use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `new Loader(...)` from `@googlemaps/js-api-loader` v1
- `PinElement.element`, `PinElement.glyph`, `AdvancedMarkerElement.content`, or `marker.addListener(...)`
- `place.isOpen()` on the `weekly` channel (inspect `place.regularOpeningHours?.weekdayDescriptions` instead)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or React/Svelte wrapper packages
- Direct browser `fetch()` to CORS-blocked REST endpoints (`places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, `maps.googleapis.com/maps/api/geocode`)
- Hardcoded API keys or LLM-hallucinated place ratings, reviews, or opening hours
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`
- Binding dev/preview servers to `0.0.0.0` (always bind to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/MapAndStreetView.vue`](./src/components/MapAndStreetView.vue)
- **Places, Routes & Geo Services:** [`src/services/placesService.ts`](./src/services/placesService.ts), [`src/services/routesService.ts`](./src/services/routesService.ts), [`src/services/timezoneService.ts`](./src/services/timezoneService.ts)
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
