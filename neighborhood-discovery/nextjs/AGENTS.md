# Agent Guidelines — Hyperlocal Neighborhood Directory & Spot Mapper (Next.js)

This repository enforces the **Google Maps Platform Zero-Legacy Mandate**. Future coding agents modifying this codebase MUST adhere strictly to these APIs and architectural rules.

## Modern Google Maps Platform APIs Used

- **React SDK:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `<Circle>`, `useMap`, `useMapsLibrary`)
- **Map Initialization:** `mapId="DEMO_MAP_ID"` (or a valid Cloud Map ID) and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`
- **Markers:** `AdvancedMarkerElement` (`<AdvancedMarker>` + `<Pin glyphText=... />`)
- **Places Autocomplete:** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
- **Places Discovery & Details:**
  - Server-side Next.js Route Handlers (`/api/places/nearby`, `/api/places/search`, `/api/places/details`, `/api/places/photo`) calling `places.googleapis.com/v1/places:searchNearby`, `places.googleapis.com/v1/places:searchText`, and `places.googleapis.com/v1/places/{placeId}` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - Client-side JS SDK fallback (`placesLibrary.Place.searchNearby`, `placesLibrary.Place.searchByText`, `place.fetchFields`)
- **Geocoding (Forward & Reverse):**
  - Server-side Route Handler (`/api/geocode`) calling `maps.googleapis.com/maps/api/geocode/json`
  - Client-side JS SDK fallback (`geocodingLibrary.Geocoder`)
- **Routing (if added in future extensions):** `Route.computeRoutes()` (`useMapsLibrary('routes')`) or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) via a server-side Route Handler.

## Strictly Prohibited (NEVER Introduce)

1. **Legacy Markers:** NEVER use `google.maps.Marker` or `<Marker>` from `@vis.gl/react-google-maps`.
2. **Legacy Places APIs:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
3. **Legacy Routing / Geometry / Visualization:** NEVER use `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`, `google.maps.visualization.HeatmapLayer`, or `google.maps.drawing`.
4. **Banned Wrapper Packages:** NEVER install `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
5. **Deprecated Pin Properties:** NEVER use `PinElement.element` or `PinElement.glyph`; use `<Pin glyphText=... />` / `PinElementOptions.glyphText` or `glyphSrc`.
6. **Beta-Only Calls on Weekly Channel:** NEVER call `place.isOpen()` unless explicitly configured on `v="beta"`; use `regularOpeningHours.weekdayDescriptions` instead.
7. **Client-Side CORS Traps:** NEVER call `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly from browser `fetch()`. Always route REST requests through `/api/...` Route Handlers or official Maps JS SDK libraries.
8. **Security & Secrets:** NEVER hardcode API keys in source files or `.env.example`, NEVER use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`, and always bind servers to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`app/components/MapCanvas.tsx`](./app/components/MapCanvas.tsx)
- **Places, Routes & Geo Services:** [`app/components/NeighborhoodExplorer.tsx`](./app/components/NeighborhoodExplorer.tsx), [`app/components/PlaceAutocompleteInput.tsx`](./app/components/PlaceAutocompleteInput.tsx), [`lib/gmp-client-fallback.ts`](./lib/gmp-client-fallback.ts), [`lib/gmp-server.ts`](./lib/gmp-server.ts)
- **Backend API Proxy:** [`app/api/geocode/route.ts`](./app/api/geocode/route.ts), [`app/api/places/details/route.ts`](./app/api/places/details/route.ts), [`app/api/places/nearby/route.ts`](./app/api/places/nearby/route.ts), [`app/api/places/photo/route.ts`](./app/api/places/photo/route.ts), [`app/api/places/search/route.ts`](./app/api/places/search/route.ts)
- **App Entry & Config:** [`app/page.tsx`](./app/page.tsx), [`next.config.mjs`](./next.config.mjs)

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
