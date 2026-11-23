# AGENTS.md — Google Maps Platform Modern API Mandates

This Next.js App Router + TypeScript application (`sf-real-estate-explorer-nextjs`) strictly enforces **Zero-Legacy Google Maps Platform** standards and secure Backend-for-Frontend (BFF) practices.

## Modern Google Maps Platform APIs Used

- **React Map SDK:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<MapControl>`, `useMap`, `useMapsLibrary`)
- **Attribution & Vector Map ID:** `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>` (and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` on `PlaceAutocompleteElement`, plus `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0` in server Route Handlers)
- **Markers & Clustering:** `google.maps.marker.AdvancedMarkerElement` (via `<AdvancedMarker>`) + `@googlemaps/markerclusterer` (`MarkerClusterer`)
- **Places Search & Autocomplete (New):**
  - `PlaceAutocompleteElement` imperatively mounted via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
  - Server-side BFF `POST /api/places/search-text` -> `https://places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask`
  - Server-side BFF `POST /api/places/nearby` -> `https://places.googleapis.com/v1/places:searchNearby` with explicit `X-Goog-FieldMask`
- **Routes API v2:**
  - Server-side BFF `POST /api/routes/matrix` -> `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with explicit `X-Goog-FieldMask`
  - Server-side BFF `POST /api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`
  - Client-side `Route.computeRoutes` / `geometry.encoding.decodePath` + `google.maps.Polyline`
- **Drawing & Containment:** `terra-draw` + `terra-draw-google-maps-adapter` paired with `google.maps.geometry.poly.containsLocation`
- **Street View & Parcels:** `google.maps.StreetViewService` + `google.maps.StreetViewPanorama`, and `google.maps.Polygon`

## Strictly Prohibited (Do NOT Introduce)

Future coding agents MUST NEVER introduce any of the following deprecated, disabled, or insecure patterns:

1. **Deprecated Map & Marker APIs:**
   - NEVER use `google.maps.Marker` or `<Marker>` from `@vis.gl/react-google-maps`
   - NEVER use `PinElement.element` or `PinElement.glyph`
   - NEVER use `google.maps.drawing` or `google.maps.visualization.HeatmapLayer`
2. **Disabled Legacy Places & Routing APIs:**
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
   - NEVER listen to the retired `gmp-placeselect` event (always use `gmp-select`)
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
3. **Banned Wrapper Libraries:**
   - NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`)
4. **Client-Side CORS Violations & Key Leaks:**
   - NEVER call `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser `fetch()` — always route REST calls through Next.js App Router `/api/...` Route Handlers
   - NEVER hardcode any Google Maps API key in source files or `.env.example`
   - NEVER use `new Map()` in files that import `{ Map }` from `@vis.gl/react-google-maps` (always alias `Map as GoogleMap` and/or use `Record<string, T>`)
5. **DOM & Server Security:**
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`
   - NEVER set `output: 'export'` or `output: 'standalone'` in `next.config.ts`

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/components/RealEstateMap.tsx`](./src/components/RealEstateMap.tsx), [`src/components/StreetViewPreview.tsx`](./src/components/StreetViewPreview.tsx)
- **Places, Routes & Geo Services:** [`src/components/CommuteCalculatorPanel.tsx`](./src/components/CommuteCalculatorPanel.tsx), [`src/components/NearbyAmenitiesPanel.tsx`](./src/components/NearbyAmenitiesPanel.tsx), [`src/components/TopSearchBar.tsx`](./src/components/TopSearchBar.tsx)
- **Backend API Proxy:** [`src/app/api/places/nearby/route.ts`](./src/app/api/places/nearby/route.ts), [`src/app/api/places/search-text/route.ts`](./src/app/api/places/search-text/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./src/app/api/routes/matrix/route.ts)
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
