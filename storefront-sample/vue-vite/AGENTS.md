# Agent Guidelines for `vue-vite` Storefront Sample

This repository implements the **Single-Venue Storefront, Booking & Get Directions Hub** in **Vue 3 + Vite + TypeScript**. Future coding agents modifying this project MUST follow these strict Google Maps Platform and security rules.

## Modern Google Maps Platform APIs Used

- **Bootstrap**: `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`) on `v: 'weekly'`.
- **Map & Overlays**: `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) and `google.maps.Circle` for the 3.5 km home-visit coverage radius.
- **Markers**: `google.maps.marker.AdvancedMarkerElement` (custom DOM element appended via `marker.append(...)`) and `google.maps.marker.PinElement` (passed directly as `content: pinElement`, using `glyphText`).
- **Places API (New)**:
  - `Place.searchByText()` + `place.fetchFields()` for live clinic storefront details, photos (`photo.getURI()`), reviews, and weekly hours.
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) configured natively via Vite's `isCustomElement: (tag) => tag.startsWith('gmp-')`, listening to the `gmp-select` event and resolving via `event.placePrediction.toPlace()`.
- **Routes API**: `Route.computeRoutes()` (`importLibrary('routes')`) with `route.createPolylines()` for `DRIVING`, `TRANSIT`, and `WALKING`.
- **Street View & Geometry**: `StreetViewService.getPanorama()`, `StreetViewPanorama`, and `spherical.computeHeading()`.

## Strict Prohibitions (Zero-Legacy Mandate)

NEVER introduce any of the following deprecated, disabled, or non-compliant APIs or patterns:

1. **NEVER** use `google.maps.Marker` — always use `AdvancedMarkerElement`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or `Place`.
3. **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes`.
5. **NEVER** use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` — always use `setOptions()` + `importLibrary()`.
6. **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
7. **NEVER** call beta-only `place.isOpen()` on the `weekly` channel — inspect `regularOpeningHours.periods` as implemented in `src/utils/hours.ts`.
8. **NEVER** install `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages.
9. **NEVER** call Google Maps Platform REST endpoints (`places.googleapis.com`, `routes.googleapis.com`) directly via browser `fetch()` (CORS trap).
10. **NEVER** hardcode API keys, use `innerHTML`/`outerHTML`/`insertAdjacentHTML`, or hallucinate fake place reviews, ratings, or hours.
11. **NEVER** bind dev/preview servers to `0.0.0.0` — bind strictly to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/StorefrontMapPane.vue`](./src/components/StorefrontMapPane.vue)
- **Places, Routes & Geo Services:** [`src/components/DirectionsPlannerCard.vue`](./src/components/DirectionsPlannerCard.vue), [`src/services/placesAndRoutes.ts`](./src/services/placesAndRoutes.ts)
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
