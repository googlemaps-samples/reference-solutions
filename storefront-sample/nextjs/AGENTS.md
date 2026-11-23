# AGENTS.md — Coding Agent Guardrails for `storefront-sample/nextjs`

This Next.js App Router application uses strictly modern, non-deprecated Google Maps Platform APIs and `@vis.gl/react-google-maps`. Future coding agents editing this repository MUST preserve these standards.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`**: `<APIProvider version="weekly">`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`.
- **Maps JavaScript API**:
  - `AdvancedMarkerElement` (via `<AdvancedMarker>` and `<Pin glyphText="..." />`)
  - `PlaceAutocompleteElement` (mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`)
  - `Place.searchByText` (Places API New JS SDK fallback)
  - `Route.computeRoutes` (Routes API JS SDK fallback)
  - `StreetViewService.getPanorama` & `StreetViewPanorama`
  - `google.maps.Circle`, `google.maps.Polyline`, `google.maps.geometry.encoding.decodePath`, `google.maps.geometry.spherical.computeHeading`
- **Backend-for-Frontend (BFF) Route Handlers (`src/app/api/*`)**:
  - `POST /api/places/search` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - `GET /api/places/photo` -> `https://places.googleapis.com/v1/{name}/media`
  - `POST /api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and `X-Goog-FieldMask`

## Strictly Prohibited Legacy APIs & Patterns

NEVER introduce any of the following deprecated or banned APIs/packages:
- `google.maps.Marker` or `<Marker>` (use `AdvancedMarkerElement` / `<AdvancedMarker>`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`
- Retired `gmp-placeselect` event (always use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`)
- Beta-only `place.isOpen()` on the `weekly` channel (compute open status from `currentOpeningHours.openNow` / `regularOpeningHours.periods`)
- Banned wrappers: `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Client-side raw `fetch()` calls to `places.googleapis.com` or `routes.googleapis.com` (CORS blocked — always route through `/api/*` or official SDK libraries)
- Hardcoded API keys or `new Map()` variable shadowing in files importing `{ Map }` from `@vis.gl/react-google-maps`
- Storing or transmitting HIPAA/medical PHI through Google Maps Platform APIs or the booking form.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/components/ClinicMapViewport.tsx`](./src/components/ClinicMapViewport.tsx)
- **Places, Routes & Geo Services:** [`src/components/OriginAutocompleteInput.tsx`](./src/components/OriginAutocompleteInput.tsx), [`src/components/StorefrontApp.tsx`](./src/components/StorefrontApp.tsx), [`src/components/VenueDetailsCard.tsx`](./src/components/VenueDetailsCard.tsx)
- **Backend API Proxy:** [`src/app/api/places/photo/route.ts`](./src/app/api/places/photo/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts)
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
