# Agent Guidelines — Dallas Fleet Telematics & Dispatch Console (Next.js)

This repository implements the **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** using **Next.js App Router + TypeScript**, `@vis.gl/react-google-maps`, and server-side Next.js Route Handlers.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Vector Map):** `<APIProvider>` and `<Map>` from `@vis.gl/react-google-maps` with `mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`, `clickableIcons={false}`, and `google.maps.TrafficLayer`.
- **Markers & Overlays:** `<AdvancedMarker>` and `<Pin>` (`AdvancedMarkerElement`, `PinElement` with `glyphText`), `<InfoWindow>`, and `google.maps.Polyline`.
- **Places API (New):**
  - Client-side `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect` listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`).
  - Server-side BFF proxy `POST /api/places/search` calling `https://places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask`.
- **Roads API:** Server-side BFF proxy `POST /api/roads/snap` calling `https://roads.googleapis.com/v1/snapToRoads` with `interpolate=true` and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`.
- **Routes API v2:**
  - Server-side BFF proxy `POST /api/routes/compute` calling `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` and optional `optimizeWaypointOrder`.
  - Server-side BFF proxy `POST /api/routes/matrix` calling `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with explicit `X-Goog-FieldMask`.
- **Geometry Library:** `encoding.decodePath()` from `useMapsLibrary('geometry')`.

## Strictly Forbidden Legacy / Deprecated APIs

Future coding agents MUST NEVER introduce any of the following deprecated, disabled, or insecure patterns:

- **NEVER** use `google.maps.Marker` or `@vis.gl/react-google-maps` `<Marker>` — always use `<AdvancedMarker>` / `AdvancedMarkerElement` with a `mapId`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement`, `Place`, or `places:searchText`.
- **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use Routes API v2 (`computeRoutes` / `computeRouteMatrix` or `Route.computeRoutes`).
- **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** install banned wrappers (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` `<gmpx-*>`).
- **NEVER** call `routes.googleapis.com`, `places.googleapis.com`, or `roads.googleapis.com` directly from browser `fetch()` — route REST requests through `/api/...` Next.js Route Handlers.
- **NEVER** hardcode API keys or use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
- **NEVER** call `new Map()` in files that import `Map` from `@vis.gl/react-google-maps` (alias `Map as GoogleMap` and use `Record<string, T>`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/components/MapOverlays.tsx`](./src/components/MapOverlays.tsx)
- **Places, Routes & Geo Services:** [`src/components/FleetDashboardClient.tsx`](./src/components/FleetDashboardClient.tsx), [`src/components/PlaceAutocompleteBox.tsx`](./src/components/PlaceAutocompleteBox.tsx)
- **Backend API Proxy:** [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/roads/snap/route.ts`](./src/app/api/roads/snap/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./src/app/api/routes/matrix/route.ts)
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
