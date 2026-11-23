# AGENTS.md — Google Maps Platform Engineering Guardrails

This SvelteKit application is built with **zero-deprecation, modern Google Maps Platform APIs** and strict security hygiene. Future coding agents modifying this repository MUST follow these rules.

## Modern Google Maps Platform APIs Used

- **Maps JS Loader (`@googlemaps/js-api-loader` v2):** `setOptions()` + `importLibrary('core' | 'maps' | 'marker' | 'places' | 'routes' | 'geometry')` inside Svelte `onMount`.
- **Usage Attribution:** `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` configured on both `setOptions()` and `new google.maps.Map(...)`.
- **Markers:** `AdvancedMarkerElement` and `PinElement` (`glyphText`, `marker.append(element)`) with `mapId: 'DEMO_MAP_ID'`.
- **Places:** `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`), `Place.searchByText`, and server proxy `places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`.
- **Routes:** `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, and server proxies `routes.googleapis.com/directions/v2:computeRoutes` (with `TRAFFIC_AWARE_OPTIMAL`, `FUEL_CONSUMPTION`, `FUEL_EFFICIENT`) and `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-FieldMask`.
- **Geometry:** `geometry.encoding.decodePath` and `geometry.spherical.computeDistanceBetween` / `computeHeading`.

## Strictly Forbidden Deprecated / Legacy APIs & Patterns

NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or retired `gmp-placeselect` (use `PlaceAutocompleteElement` + `gmp-select` and `Place`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/js-api-loader` v1 (`new Loader(...).load()`)
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`)
- Third-party Svelte map wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`) or `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Hardcoded API keys, `innerHTML` / `outerHTML`, or `0.0.0.0` server bindings
- Client-side `fetch()` directly to `*.googleapis.com` (always use `/api/...` server proxies or official Maps JS SDK libraries)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./src/lib/maps.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/places/search/+server.ts`](./src/routes/api/places/search/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./src/routes/api/routes/matrix/+server.ts)
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
