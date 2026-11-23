# Agent Guidelines — Google Maps Platform Zero-Deprecation Mandate

This repository implements **Rideshare Booking, Fare Estimator & Live Driver Tracking** in **Next.js App Router + TypeScript** using exclusively modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`):**
  - `<APIProvider>` with `libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}`
  - `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']} />`
  - `<AdvancedMarker>` (`AdvancedMarkerElement`) for pickup, drop-off, candidate vehicles, and the animated live driver marker
- **Places API (New):**
  - Imperatively mounted `PlaceAutocompleteElement` (`useRef` + `useEffect`) listening to `gmp-select`, calling `event.placePrediction.toPlace()` and `place.fetchFields()`
  - Server-side `POST https://places.googleapis.com/v1/places:searchText` via `/api/places/search` with `X-Goog-FieldMask`
- **Routes API v2:**
  - Server-side `POST https://routes.googleapis.com/directions/v2:computeRoutes` via `/api/routes/compute` with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, and `X-Goog-FieldMask`
  - Server-side `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` via `/api/routes/matrix` with `X-Goog-FieldMask`
- **Maps JS Geometry Library:**
  - `google.maps.geometry.encoding.decodePath()`
  - `google.maps.geometry.spherical.interpolate()` & `computeHeading()`

## Strictly Prohibited Legacy APIs & Patterns

Future coding agents MUST **NEVER** introduce any of the following deprecated, disabled, or insecure APIs/patterns:

1. **Legacy Markers:** NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `AdvancedMarkerElement` / `<AdvancedMarker>` with a valid `mapId`. NEVER use `PinElement.element` or `PinElement.glyph`.
2. **Legacy Places:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, and NEVER listen to `gmp-placeselect` — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `Place`, or Places API (New) REST endpoints.
3. **Legacy Routing:** NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use Routes API (`Route.computeRoutes` or `routes.googleapis.com/directions/v2:computeRoutes` & `distanceMatrix/v2:computeRouteMatrix` with explicit `X-Goog-FieldMask`).
4. **Deprecated Visualization / Drawing / Loaders:** NEVER use `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`, or `@googlemaps/js-api-loader` v1 `new Loader().load()`.
5. **Banned React Wrappers:** NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
6. **Client-Side CORS & Security:** NEVER call `googleapis.com` REST endpoints directly from browser `fetch()`, NEVER hardcode API keys, NEVER use `innerHTML`/`outerHTML`/`document.write`/`insertAdjacentHTML`, and NEVER remove `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
7. **Next.js Output Mode:** NEVER set `output: 'export'` or `output: 'standalone'` in `next.config.mjs` (breaks Route Handlers or `next start --hostname 127.0.0.1 --port <port>`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/components/RideshareMap.tsx`](./src/components/RideshareMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./src/components/PlaceAutocompleteInput.tsx), [`src/components/RideshareWorkspace.tsx`](./src/components/RideshareWorkspace.tsx)
- **Backend API Proxy:** [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.mjs`](./next.config.mjs), [`src/app/page.tsx`](./src/app/page.tsx)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx next start --hostname 127.0.0.1 --port 4173
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
