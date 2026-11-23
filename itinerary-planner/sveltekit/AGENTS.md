# Agent Guidelines — SvelteKit Itinerary Planner

This repository implements the **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** using **SvelteKit + TypeScript** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`)
- `google.maps.Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- `google.maps.marker.AdvancedMarkerElement` + `google.maps.marker.PinElement` (`glyphText`, `background`, `borderColor`)
- `google.maps.places.PlaceAutocompleteElement` listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields()`)
- `google.maps.places.Place.searchByText()` & `Place.searchNearby()` (Places API New)
- `google.maps.routes.Route.computeRoutes()` (`optimizeWaypointOrder`, `createPolylines()`)
- `google.maps.StreetViewService` & `google.maps.StreetViewPanorama`
- Time Zone API (`maps.googleapis.com/maps/api/timezone/json`) via SvelteKit server endpoint `/api/timezone` with `Place.utcOffsetMinutes` / `Place.timeZone` fallback

## Mandatory Rules for Future Coding Agents

1. **Zero Deprecated APIs:** NEVER introduce:
   - `google.maps.Marker` (use `AdvancedMarkerElement`)
   - `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`)
   - Retired `gmp-placeselect` event (always use `gmp-select`)
   - `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes`)
   - `@googlemaps/js-api-loader` v1 `new Loader(...).load()` (use `setOptions` + `importLibrary`)
   - Deprecated `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`)
   - Beta-only `place.isOpen()` or `gmp-click` when running on the `weekly` channel
2. **Zero Banned Wrapper Packages:** NEVER install `svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **SSR Safety:** Guard all `window`, `document`, and Google Maps JS SDK calls inside Svelte `onMount`.
4. **No Hardcoded Keys or Hallucinated Place Data:** Read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` and always fetch real places, ratings, hours, and photos from Google Maps Platform APIs at runtime.
5. **Security & Attribution:** Keep `gmp_git_agentsamples_v1.0.0` in `internalUsageAttributionIds`, avoid `innerHTML` / `outerHTML` / `document.write`, bind Vite to `127.0.0.1`, and preserve security headers in `src/hooks.server.ts`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/timezone`

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./src/lib/maps.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/timezone/+server.ts`](./src/routes/api/timezone/+server.ts)
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
