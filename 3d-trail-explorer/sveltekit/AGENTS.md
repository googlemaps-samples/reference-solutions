# AGENTS.md — Google Maps Platform Modern API Mandate (SvelteKit)

This repository implements **Lake Tahoe 3D Trail Explorer** using **SvelteKit + TypeScript** and strictly modern Google Maps Platform APIs.

## Active Google Maps Platform APIs & Classes Used

- **Bootstrap & Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary` inside Svelte `onMount`).
- **Usage Attribution:** `gmp_git_agentsamples_v1.0.0` configured via `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` on `<gmp-map-3d>`.
- **3D Maps (`maps3d` library):**
  - `Map3DElement` (`<gmp-map-3d>`) with `flyCameraTo()`, `HYBRID` / `SATELLITE` mode, and `gmp-headingchange` / `gmp-tiltchange` / `gmp-rangechange` events.
  - `Polyline3DElement` with `strokeColor: 'rgb(255, 0, 0)'`, `altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`.
  - `Marker3DInteractiveElement` listening to `gmp-click`.
  - `PopoverElement` anchored to interactive 3D markers.
- **Markers (`marker` library):**
  - `PinElement` with `glyphText`, passed directly to `marker.append(pinElement)` (also `AdvancedMarkerElement` when rendering 2D markers).
- **Places (`places` library & BFF REST):**
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - `Place.searchByText` (Places API New) and server-side BFF proxies `/api/places/search` (`places.googleapis.com/v1/places:searchText`) and `/api/places/autocomplete` (`places.googleapis.com/v1/places:autocomplete`) with `X-Goog-FieldMask`.
- **Elevation (`elevation` library & BFF REST):**
  - `ElevationService.getElevationAlongPath` and server-side BFF proxy `/api/elevation/profile` (`maps.googleapis.com/maps/api/elevation/json`).
- **Routes (if routing is added):**
  - Use `Route.computeRoutes` (`importLibrary('routes')`) or `routes.googleapis.com/directions/v2:computeRoutes` via a server BFF endpoint.

## Non-Negotiable Rules for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement` or `Marker3DInteractiveElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, or Places API New REST via BFF).
   - NEVER listen to retired `gmp-placeselect` (always use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - NEVER use `PinElement.element` or `PinElement.glyph` (use `glyphText` / `glyphSrc` and pass `PinElement` directly).
2. **NEVER install banned wrapper packages:**
   - NEVER install `svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, `@googlemaps/extended-component-library`, or React wrappers.
3. **NEVER hardcode API keys or expose server keys:**
   - Read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public`.
4. **NEVER touch `window` or `document` during SSR:**
   - Guard all Maps JS API loading inside Svelte's `onMount` lifecycle.
5. **NEVER call Google REST APIs directly from browser `fetch()`:**
   - Route REST calls through `/api/...` SvelteKit server routes (`+server.ts`).
6. **NEVER bind servers to `0.0.0.0`:**
   - Always bind to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/elevation/profile/+server.ts`](./src/routes/api/elevation/profile/+server.ts), [`src/routes/api/places/autocomplete/+server.ts`](./src/routes/api/places/autocomplete/+server.ts), [`src/routes/api/places/search/+server.ts`](./src/routes/api/places/search/+server.ts)
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
