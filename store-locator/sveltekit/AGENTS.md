# AGENTS.md — Google Maps Platform Guardrails for `store-locator/sveltekit`

This repository implements the **Multi-Branch Store, ATM & Inventory Locator** using **SvelteKit + TypeScript** and modern **Google Maps Platform** APIs. Any coding agent modifying this project MUST preserve strict zero-deprecation, security, and Terms of Service compliance.

## Modern Google Maps Platform APIs Used

- **Bootstrap & Loader:** `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`), guarded inside Svelte `onMount` so SSR never accesses `window` or `document`.
- **Map & Attribution:** `google.maps.Map` (`importLibrary('maps')`) configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers & Clustering:** `AdvancedMarkerElement` (`importLibrary('marker')`) with `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm` + custom `AdvancedMarkerElement` cluster renderer) using `marker.append(...)` and `'click'` listeners.
- **Places API (New):**
  - `Place.searchByText` (`importLibrary('places')`) for live NYC branch discovery, reading `regularOpeningHours?.weekdayDescriptions` on the `weekly` channel.
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions` + `AutocompleteSessionToken` + `Place.fetchFields` for origin autocomplete.
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields()`).
- **Geocoding API:** `Geocoder` (`importLibrary('geocoding')`) for free-text origin fallback.
- **Routes API:** `RouteMatrix.computeRouteMatrix` and `Route.computeRoutes` + `route.createPolylines()` (`importLibrary('routes')`).

## Strictly Forbidden Deprecated / Legacy APIs

Future agents MUST NEVER introduce any of the following:

- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, `Place.fetchFields`)
- Retired `gmp-placeselect` event (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc` or DOM nodes via `marker.append(...)`)
- Beta-only `place.isOpen()` on the default `weekly` channel
- Third-party wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `@googlemaps/extended-component-library` `<gmpx-*>`)
- Hardcoded API keys, `innerHTML` / `{@html ...}`, or raw browser `fetch()` calls to `*.googleapis.com` REST endpoints.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`

### Key Implementation Files

- **Map & Markers:** [`src/lib/components/LocatorMap.svelte`](./src/lib/components/LocatorMap.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/HeaderBar.svelte`](./src/lib/components/HeaderBar.svelte), [`src/lib/maps/places.ts`](./src/lib/maps/places.ts), [`src/lib/maps/routes.ts`](./src/lib/maps/routes.ts)
- **App Entry & Config:** [`src/routes/+page.svelte`](./src/routes/+page.svelte), [`svelte.config.js`](./svelte.config.js), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npm run check
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4174 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
