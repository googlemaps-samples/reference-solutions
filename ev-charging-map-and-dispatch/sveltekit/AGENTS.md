# AGENTS.md — Google Maps Platform Guardrails (SvelteKit)

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using **SvelteKit + TypeScript** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Loader:** `@googlemaps/js-api-loader` v2 functional API (`setOptions` + `importLibrary`) inside Svelte `onMount` only (never during SSR).
- **Map & Overlays (`importLibrary('maps')`):** `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `google.maps.Circle`, `google.maps.Polyline`, `google.maps.InfoWindow`.
- **Markers (`importLibrary('marker')`):** `AdvancedMarkerElement` and `PinElement` (passing `PinElement` directly via `marker.append(pin)` and using `glyphText`, listening to `'click'` on `marker.element` on the `weekly` channel).
- **Places (`importLibrary('places')`):** `PlaceAutocompleteElement` (listening to `'gmp-select'`, calling `event.placePrediction.toPlace()` and `place.fetchFields()`), `Place.searchNearby` with `evChargeOptions` and `regularOpeningHours`.
- **Routes (`importLibrary('routes')`):** `RouteMatrix.computeRouteMatrix` for live driving ETA sorting and `Route.computeRoutes` with `route.createPolylines()` for dispatch route rendering and turn-by-turn steps.
- **Geocoding (`importLibrary('geocoding')`):** `Geocoder.geocode({ location, fulfillOnZeroResults: true })` for reverse geocoding driver pin coordinates.

## Strict Prohibition on Legacy / Deprecated APIs

Future coding agents MUST NEVER introduce any of the following deprecated or disabled APIs or packages:

1. **NEVER** use `google.maps.Marker` -> ALWAYS use `AdvancedMarkerElement`.
2. **NEVER** use `PinElement.element` or `PinElement.glyph` -> ALWAYS pass `PinElement` directly and use `glyphText` / `glyphSrc`.
3. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, and **NEVER** listen to retired `gmp-placeselect` -> ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `Place.searchNearby`, `Place.searchByText`, or `AutocompleteSuggestion.fetchAutocompleteSuggestions`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` -> ALWAYS use `Route.computeRoutes` and `RouteMatrix.computeRouteMatrix`.
5. **NEVER** use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1 -> ALWAYS use v2 `setOptions()` + `importLibrary()`.
6. **NEVER** call beta-only `place.isOpen()` or listen to `gmp-click` when configured on the `v: 'weekly'` channel.
7. **NEVER** install third-party Svelte Google Maps wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`) or `@googlemaps/extended-component-library` (`<gmpx-*>`).
8. **NEVER** hardcode API keys or bypass `$env/dynamic/public` (`PUBLIC_GOOGLE_MAPS_API_KEY`).
9. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` for `InfoWindow` or DOM rendering.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/dispatchService.ts`](./src/lib/dispatchService.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./src/hooks.server.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte), [`svelte.config.js`](./svelte.config.js), [`vite.config.ts`](./vite.config.ts)

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
