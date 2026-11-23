# AGENTS.md — Google Maps Platform Zero-Deprecation Guidelines

This Next.js App Router application uses exclusively **modern, non-deprecated Google Maps Platform APIs** and `@vis.gl/react-google-maps`.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (React):** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`)
- **Advanced Markers:** `AdvancedMarkerElement` via `<AdvancedMarker>` and `<Pin glyphText={...} />` with `mapId="DEMO_MAP_ID"`
- **Usage Attribution:** `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>` and `PlaceAutocompleteElement`
- **Places API (New):**
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`)
  - Server-side Route Handlers calling `places.googleapis.com/v1/places:searchText`, `places:searchNearby`, `places/{placeId}`, and `places/{photoName}/media` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API v2:** Server-side Route Handler calling `routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask` and `optimizeWaypointOrder`, decoded on the client via `google.maps.geometry.encoding.decodePath`
- **Time Zone API:** Server-side Route Handler calling `maps.googleapis.com/maps/api/timezone/json`
- **Street View:** `StreetViewService.getPanorama` and `StreetViewPanorama` from `importLibrary('streetView')`

## Strict Rules for Coding Agents

1. **NEVER** introduce deprecated or disabled Google Maps Platform APIs:
   - Do NOT use `google.maps.Marker` or `<Marker>` (use `AdvancedMarkerElement` / `<AdvancedMarker>`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` and Places API New).
   - Do NOT listen to the retired `gmp-placeselect` event (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use Routes API v2 `computeRoutes` or `Route.computeRoutes`).
   - Do NOT use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
2. **NEVER** install banned legacy React wrappers (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` / `<gmpx-*>`).
3. **NEVER** call CORS-restricted Google Maps REST endpoints (`places.googleapis.com`, `routes.googleapis.com`) directly from browser `fetch()`; always route through Next.js App Router `/api/...` Route Handlers.
4. **NEVER** hardcode API keys or LLM-hallucinated place ratings, reviews, or opening hours.
5. **NEVER** use `new Map()` or `Map<K, V>` in files that import `{ Map }` from `@vis.gl/react-google-maps` (use `Record<K, V>`).
6. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; always use React JSX or `replaceChildren()` / `textContent`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`

### Key Implementation Files

- **Map & Markers:** [`components/StreetViewPanel.tsx`](./components/StreetViewPanel.tsx), [`components/TripMap.tsx`](./components/TripMap.tsx)
- **Places, Routes & Geo Services:** [`components/DestinationSearch.tsx`](./components/DestinationSearch.tsx), [`components/ItineraryWorkspace.tsx`](./components/ItineraryWorkspace.tsx)
- **Backend API Proxy:** [`app/api/places/details/route.ts`](./app/api/places/details/route.ts), [`app/api/places/nearby/route.ts`](./app/api/places/nearby/route.ts), [`app/api/places/photo/route.ts`](./app/api/places/photo/route.ts), [`app/api/places/search/route.ts`](./app/api/places/search/route.ts), [`app/api/routes/compute/route.ts`](./app/api/routes/compute/route.ts), [`app/api/timezone/route.ts`](./app/api/timezone/route.ts)
- **App Entry & Config:** [`app/page.tsx`](./app/page.tsx), [`next.config.ts`](./next.config.ts)

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
