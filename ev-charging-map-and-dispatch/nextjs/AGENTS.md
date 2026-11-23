# AGENTS.md — Google Maps Platform Modern API & Security Guidelines

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using **Next.js App Router**, **TypeScript**, and **`@vis.gl/react-google-maps`**.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `marker`, `core`, `geometry`)**:
  - `<APIProvider>` and `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`
  - `<AdvancedMarker>` (`google.maps.marker.AdvancedMarkerElement`) for the draggable driver breakdown pin and clickable EV / auto repair pins
  - `google.maps.Circle` for the configurable 5 km / 10 km / 15 km proximity ring
  - `google.maps.Polyline` + `google.maps.geometry.encoding.decodePath()` for rendering dispatch routes
  - `<InfoWindow>` for marker previews
- **Places API (New)**:
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace()` + `place.fetchFields(...)`
  - Server-side `POST /api/places/nearby` → `https://places.googleapis.com/v1/places:searchNearby` with `X-Goog-FieldMask` (including `places.evChargeOptions` and `places.regularOpeningHours`)
  - Server-side `POST /api/places/search-text` → `https://places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`
- **Routes API (v2)**:
  - Server-side `POST /api/routes/matrix` → `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-FieldMask` for live ETA sorting
  - Server-side `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask` for route polylines and turn-by-turn `navigationInstruction` steps
- **Geocoding API**:
  - Server-side `GET /api/geocode/reverse` → `https://maps.googleapis.com/maps/api/geocode/json` for reverse geocoding driver pin coordinates

## Strict Prohibitions for Future Coding Agents

NEVER introduce deprecated, legacy, or banned Google Maps Platform APIs or packages:

1. **Markers:** NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `AdvancedMarkerElement` / `<AdvancedMarker>` with `mapId="DEMO_MAP_ID"` (or a valid Cloud Map ID). Never use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`, or custom React children in `<AdvancedMarker>`).
2. **Places:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, `Place.searchNearby`, or `Place.searchByText`.
3. **Channel Safety:** NEVER call beta-only `place.isOpen()` on the default `weekly` Maps JS channel — inspect `regularOpeningHours.openNow` from REST responses or `regularOpeningHours.weekdayDescriptions`.
4. **Routing:** NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use Routes API v2 (`computeRoutes` / `computeRouteMatrix`) via BFF `/api/routes/*` or `Route.computeRoutes`.
5. **Visualization & Drawing:** NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. **Banned Wrapper Packages:** NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
7. **Security & Attribution:**
   - NEVER hardcode API keys in source files or `.env.example`.
   - ALWAYS keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`.
   - ALWAYS keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` in `next.config.ts`.
   - NEVER call CORS-restricted Google Maps REST endpoints (`places.googleapis.com`, `routes.googleapis.com`, `maps.googleapis.com/maps/api/geocode`) directly from browser `fetch()` — ALWAYS proxy through Next.js Route Handlers (`/api/...`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/components/DispatchMap.tsx`](./src/components/DispatchMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./src/components/PlaceAutocompleteInput.tsx), [`src/lib/dispatch-client.ts`](./src/lib/dispatch-client.ts)
- **Backend API Proxy:** [`src/app/api/geocode/reverse/route.ts`](./src/app/api/geocode/reverse/route.ts), [`src/app/api/places/nearby/route.ts`](./src/app/api/places/nearby/route.ts), [`src/app/api/places/search-text/route.ts`](./src/app/api/places/search-text/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.ts`](./next.config.ts), [`src/app/page.tsx`](./src/app/page.tsx)

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
