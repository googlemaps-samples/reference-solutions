# AGENTS.md — Google Maps Platform Guardrails (`sveltekit`)

This project implements the **Single-Venue Storefront, Booking & Get Directions Hub** in SvelteKit + TypeScript using **current, non-deprecated** Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) — NEVER use v1 `new Loader(...).load()`
- `google.maps.Map` (`v: "weekly"`, `mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`)
- `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (`glyphText` / `glyphSrc` — NEVER `PinElement.element` or `PinElement.glyph`)
- `google.maps.Circle` (3.5 km San Francisco home-visit service-area overlay)
- `google.maps.places.Place.searchByText` & `Place.fetchFields` (Places API New)
- `google.maps.places.PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace().fetchFields()`)
- `google.maps.routes.Route.computeRoutes` & `route.createPolylines()` (`DRIVING`, `TRANSIT`, `WALKING`)
- `google.maps.StreetViewService.getPanorama`, `google.maps.StreetViewPanorama`, and `google.maps.geometry.spherical.computeHeading`

## Hard Rules for Future Coding Agents

1. **NEVER** introduce deprecated or disabled Google Maps Platform APIs:
   - No `google.maps.Marker`
   - No `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
   - No retired `gmp-placeselect` event (always use `gmp-select`)
   - No `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
   - No `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
   - No `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy Svelte map wrappers (`svelte-google-maps`, `@beyonk/svelte-google-maps`)
2. **Channel Safety:** Do NOT call `Place.prototype.isOpen()` on `v: "weekly"`; compute open-now status from `regularOpeningHours.periods` and `utcOffsetMinutes`.
3. **SSR Safety & Secrets:** Guard all `window`/`document`/Google Maps calls inside Svelte `onMount`, read `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public`, and NEVER hardcode API keys.
4. **DOM Security:** Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; construct custom marker DOM with `document.createElement`, `createElementNS`, and `textContent`.
5. **No Hallucinated Place Data & ToS:** Always fetch clinic ratings, reviews, hours, and photos live from Places API (New) and preserve Google Maps attribution links. Never send HIPAA/medical records to GMP APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/lib/maps/google-maps.ts`](./src/lib/maps/google-maps.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/google-maps.ts`](./src/lib/maps/google-maps.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
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
