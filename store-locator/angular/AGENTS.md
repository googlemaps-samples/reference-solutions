# Coding Agent Instructions — Angular Store Locator

This project is an **Angular Standalone Components + TypeScript (`@angular/google-maps`)** implementation of the Multi-Branch Store, ATM & Inventory Locator.

## Mandatory Google Maps Platform APIs & Conventions

Future coding agents modifying this repository **MUST** exclusively use modern, zero-deprecation Google Maps Platform APIs and patterns:

1. **Dynamic Loading (`@googlemaps/js-api-loader` v2):**
   - Use `setOptions()` + `importLibrary()` (`core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `geometry`).
   - **NEVER** use the deprecated v1 `new Loader(...).load()` API.
2. **Angular Maps & Markers (`@angular/google-maps` + `AdvancedMarkerElement`):**
   - Use `GoogleMap` (`<google-map>`) and `MapAdvancedMarker` (`<map-advanced-marker>`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
   - Use `google.maps.marker.AdvancedMarkerElement` with `marker.append(domElement)` (never deprecated `PinElement.element` or `PinElement.glyph`).
   - **NEVER** use legacy `google.maps.Marker` or `<map-marker>`.
   - Cluster dense markers with `@googlemaps/markerclusterer` (`MarkerClusterer`, `SuperClusterAlgorithm`, and a custom `AdvancedMarkerElement` cluster renderer).
3. **Places API (New):**
   - Use `Place.searchByText`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `AutocompleteSessionToken`, and `Place.fetchFields`.
   - **NEVER** use deprecated `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event (use `gmp-select` if using `PlaceAutocompleteElement`).
   - On the `weekly` Maps JS channel, read `place.regularOpeningHours?.weekdayDescriptions` — **NEVER** call beta-only `place.isOpen()`.
4. **Routes API:**
   - Use `RouteMatrix.computeRouteMatrix` and `Route.computeRoutes` (`route.createPolylines()`).
   - **NEVER** use deprecated `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
5. **Security & Runtime Configuration:**
   - **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in `environment.ts`, source files, or `.env.example`.
   - Keep runtime key injection via `serve-dist.mjs` (`/env-config.js`), bound strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
   - **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; build all custom marker and `InfoWindow` DOM nodes with `document.createElement()` and `textContent`.
   - **NEVER** hardcode fake Place names, ratings, reviews, or opening hours.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/components/locator-map/locator-map.component.html`](./src/app/components/locator-map/locator-map.component.html), [`src/app/components/locator-map/locator-map.component.ts`](./src/app/components/locator-map/locator-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/services/places.service.ts`](./src/app/services/places.service.ts), [`src/app/services/routes.service.ts`](./src/app/services/routes.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./serve-dist.mjs), [`src/app/app.component.ts`](./src/app/app.component.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit && node --check serve-dist.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node serve-dist.mjs --host 127.0.0.1 --port 4176
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
