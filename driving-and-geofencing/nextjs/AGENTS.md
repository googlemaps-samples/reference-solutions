# Agent Instructions — Field Workforce Geofenced Attendance & Site Audit Router (Next.js)

This repository implements a modern, zero-deprecation Google Maps Platform application using **Next.js App Router + TypeScript + `@vis.gl/react-google-maps`**.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`** (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `<Polygon>`, `<Polyline>`, `useMap`, `useMapsLibrary`)
- **Map Initialization:** `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`
- **Markers:** `AdvancedMarkerElement` via `<AdvancedMarker>` and `<Pin glyphText={...} />`
- **Drawing & Geofencing:** `terra-draw` + `terra-draw-google-maps-adapter` (`TerraDrawGoogleMapsAdapter`, `TerraDrawPolygonMode`, `TerraDrawSelectMode`) and `google.maps.geometry.poly.containsLocation`
- **Places API (New):**
  - Client-side imperative `PlaceAutocompleteElement` mounted via `useRef` + `useEffect` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields(...)`)
  - Server-side `POST /api/places/search` proxying `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API (v2):**
  - Server-side `POST /api/routes/compute` proxying `https://routes.googleapis.com/directions/v2:computeRoutes` with `optimizeWaypointOrder: true`, `routingPreference: 'TRAFFIC_AWARE'`, `X-Goog-Api-Key`, and `X-Goog-FieldMask`
- **Geocoding API (v4):**
  - Server-side `GET /api/geocode/reverse` proxying `https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}` with `X-Goog-Api-Key` and `X-Goog-FieldMask`

## Strictly Prohibited Legacy APIs & Patterns

Future coding agents **MUST NEVER** introduce any of the following deprecated APIs or insecure patterns:

1. **NEVER** use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>`.
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement` (`gmp-select`), `Place.searchByText`, or `places.googleapis.com/v1/places:searchText`.
3. **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes` or Routes API v2 REST via `/api/routes/compute`.
5. **NEVER** use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer` — always use Terra Draw for drawing and deck.gl for heatmaps.
6. **NEVER** use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
7. **NEVER** install banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
8. **NEVER** call Google Maps REST APIs (`places.googleapis.com`, `routes.googleapis.com`, `geocode.googleapis.com`) directly from browser `fetch()` — always route through Next.js Route Handlers under `src/app/api/`.
9. **NEVER** hardcode API keys or use `innerHTML` / `dangerouslySetInnerHTML`.
10. **NEVER** omit `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` or `mapId="DEMO_MAP_ID"`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geometry`, `marker`, `places`
- **Geo Libraries:** `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/components/GeofenceMapCanvas.tsx`](./src/components/GeofenceMapCanvas.tsx)
- **Places, Routes & Geo Services:** [`src/components/AttendanceAuditWorkspace.tsx`](./src/components/AttendanceAuditWorkspace.tsx), [`src/components/OperationsSidebar.tsx`](./src/components/OperationsSidebar.tsx)
- **Backend API Proxy:** [`src/app/api/geocode/reverse/route.ts`](./src/app/api/geocode/reverse/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts)
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
