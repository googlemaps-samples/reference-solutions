# Agent Guidelines — NYC Multi-Branch Store Locator (`nextjs`)

This Next.js App Router + TypeScript application adheres strictly to the **Google Maps Platform Zero-Deprecation & Security Mandates**. Future coding agents modifying this codebase **MUST** follow these rules:

## Modern Google Maps Platform APIs Used

- **React SDK**: `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`)
- **Attribution & Map ID**: `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']} ...>`
- **Markers & Clustering**: `google.maps.marker.AdvancedMarkerElement` paired with `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm` + custom `AdvancedMarkerElement` renderer).
- **Places API (New)**:
  - Imperatively mounted `PlaceAutocompleteElement` via `useRef` + `useEffect` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - Server-side Next.js Route Handlers calling `places.googleapis.com/v1/places:searchText`, `places.googleapis.com/v1/places:autocomplete` (with `sessionToken`), and `places.googleapis.com/v1/places/{placeId}` with explicit `X-Goog-FieldMask` headers.
- **Routes API v2**:
  - Server-side Next.js Route Handlers calling `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` and `routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` headers.
  - Client-side decoding via `geometry.encoding.decodePath` rendered with `google.maps.Polyline`.
- **Channel Compatibility**: Uses the default `weekly` channel and reads `regularOpeningHours.weekdayDescriptions` instead of beta-only `place.isOpen()`, and attaches `'click'` listeners rather than beta-only `gmp-click`.

## Strictly Prohibited (Never Introduce)

- **Deprecated GMP APIs**:
  - NEVER use `google.maps.Marker` or `<Marker>`
  - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
  - NEVER listen to retired `gmp-placeselect` (always use `gmp-select`)
  - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
  - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
  - NEVER use `PinElement.element` or `PinElement.glyph`
- **Banned Wrapper Packages**:
  - NEVER install or import `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`)
- **Security & Compliance**:
  - NEVER call `places.googleapis.com` or `routes.googleapis.com` directly from browser `fetch()` (use `/api/*` Route Handlers)
  - NEVER hardcode API keys or hallucinate fake Place names, ratings, reviews, or opening hours
  - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`
  - NEVER shadow the global `Map` constructor in files importing `{ Map }` from `@vis.gl/react-google-maps` (always alias `import { Map as GoogleMap }`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** `@googlemaps/markerclusterer`
- **Server `/api/*` Proxy Routes:** `/api/places/autocomplete`, `/api/places/details`, `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

### Key Implementation Files

- **Map & Markers:** [`src/components/ClusteredBranchMarkers.tsx`](./src/components/ClusteredBranchMarkers.tsx), [`src/components/LocatorMap.tsx`](./src/components/LocatorMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteWidget.tsx`](./src/components/PlaceAutocompleteWidget.tsx), [`src/components/StoreLocatorApp.tsx`](./src/components/StoreLocatorApp.tsx)
- **Backend API Proxy:** [`src/app/api/places/autocomplete/route.ts`](./src/app/api/places/autocomplete/route.ts), [`src/app/api/places/details/route.ts`](./src/app/api/places/details/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./src/app/api/routes/matrix/route.ts)
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
