# AGENTS.md — Google Maps Platform Guardrails (`vue-vite`)

This repository is a standalone Vue 3 + Vite + TypeScript Google Maps Platform sample implementing a Multi-Branch Store, ATM & Inventory Locator for New York City.

## Modern Google Maps Platform APIs Used

- **Bootstrap Loader (`@googlemaps/js-api-loader` v2):** `setOptions()` and `importLibrary()` (`core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `geometry`).
- **Map Custom Element:** `<gmp-map>` (`google.maps.MapElement`) with `map-id="DEMO_MAP_ID"` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`, configured in `vite.config.ts` via `compilerOptions.isCustomElement`.
- **Markers & Clustering:** `google.maps.marker.AdvancedMarkerElement` (DOM composed via `marker.append()` / `marker.replaceChildren()`) with `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm` + custom `AdvancedMarkerElement` cluster renderer).
- **Places API (New):**
  - `Place.searchByText` for live NYC branch discovery
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions` + `AutocompleteSessionToken` + `Place.fetchFields` for starting location autocomplete
  - `Place.regularOpeningHours.weekdayDescriptions` for opening hours (never `place.isOpen()` on the `weekly` channel)
- **Routes API (JS SDK):**
  - `RouteMatrix.computeRouteMatrix` for multi-branch road ETA & distance ranking (`internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`)
  - `Route.computeRoutes` + `route.createPolylines()` for drawing the active route polyline
- **Geocoding API (JS SDK):** `Geocoder.geocode` fallback for manual address submission.

## Mandatory Prohibitions for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` -> always use `AdvancedMarkerElement` with `mapId: "DEMO_MAP_ID"` (or Cloud Map ID).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` -> always use `AutocompleteSuggestion`, `Place.searchByText`, `Place.searchNearby`, `Place.fetchFields`, or `PlaceAutocompleteElement` (`gmp-select`).
   - NEVER listen to retired `gmp-placeselect` -> always use `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` -> always use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` -> always use v2 `setOptions()` + `importLibrary()`.
   - NEVER use `PinElement.element` or `PinElement.glyph` -> pass `PinElement` directly with `glyphText` / `glyphSrc`, or append custom HTML via `marker.append(...)`.
   - NEVER install or import `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, or `use-places-autocomplete`.
2. **NEVER call beta-only `place.isOpen()` on the `weekly` channel.**
3. **NEVER hardcode API keys or fake/hallucinated Place reviews, ratings, or opening hours.**
4. **NEVER call Google Maps REST endpoints (`places.googleapis.com`, `routes.googleapis.com`, `maps.googleapis.com/maps/api/geocode`) directly from browser `fetch()`** — use the Maps JS SDK libraries loaded via `importLibrary()`.
5. **NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`** — construct marker and InfoWindow DOM elements via `document.createElement()`, `textContent`, and `replaceChildren()`.
6. **ALWAYS keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` / `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` intact.**

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`

### Key Implementation Files

- **Map & Markers:** [`src/components/LocatorMap.vue`](./src/components/LocatorMap.vue), [`src/composables/useStoreLocator.ts`](./src/composables/useStoreLocator.ts)
- **Places, Routes & Geo Services:** [`src/composables/useStoreLocator.ts`](./src/composables/useStoreLocator.ts)
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
