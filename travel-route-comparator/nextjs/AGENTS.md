# AGENTS.md — Next.js Multi-Modal Commute Comparator & Trail Elevation Tracker

## Modern Google Maps Platform APIs Used

This repository strictly uses current, non-deprecated Google Maps Platform SDKs and web service APIs:

1. **React SDK (`@vis.gl/react-google-maps`)**:
   - `<APIProvider>` with libraries `['core', 'maps', 'marker', 'places', 'routes', 'elevation']`
   - `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`
   - `<AdvancedMarker>` and `<Pin glyphText="..." />` (uses modern `AdvancedMarkerElement` under the hood)
   - `google.maps.Polyline` and `google.maps.BicyclingLayer` via `useMap()` and `useMapsLibrary('maps')`
2. **Places API (New)**:
   - Imperatively mounted `PlaceAutocompleteElement` (`new placesLib.PlaceAutocompleteElement()`) listening to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields({ fields: [...] })`
   - Server-side Next.js Route Handlers at `/api/places/search` (`https://places.googleapis.com/v1/places:searchText`) and `/api/places/autocomplete` (`https://places.googleapis.com/v1/places:autocomplete`) with `X-Goog-Api-Key` and `X-Goog-FieldMask`
3. **Routes API v2**:
   - Server-side Next.js Route Handler at `/api/routes/compute` (`https://routes.googleapis.com/directions/v2:computeRoutes`) with `X-Goog-Api-Key` and `X-Goog-FieldMask`, supporting `DRIVE`, `BICYCLE`, `WALK`, `TRANSIT`, `computeAlternativeRoutes`, `routeModifiers`, `TOLLS`, and `FUEL_EFFICIENT` reference routes
4. **Elevation API**:
   - Server-side Next.js Route Handler at `/api/elevation/profile` (`https://maps.googleapis.com/maps/api/elevation/json`) and client-side `ElevationService.getElevationAlongPath` fallback (`importLibrary('elevation')`)

## Mandatory Zero-Deprecation & Security Rules for Coding Agents

Future coding agents modifying this codebase **MUST NEVER** introduce any of the following deprecated, disabled, or insecure patterns:

- **NEVER** use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — use `PinElement` directly with `glyphText` / `glyphSrc` (or `<Pin glyphText="..." />`).
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event — always use `PlaceAutocompleteElement` with `gmp-select`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, or Places API (New) REST via server-side Route Handlers.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use Routes API v2 (`computeRoutes` / `Route.computeRoutes`).
- **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- **NEVER** install or import banned wrapper libraries (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
- **NEVER** call `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com` directly from browser `fetch()` — always proxy through Next.js Route Handlers (`src/app/api/...`) or use the official Maps JS SDK libraries.
- **NEVER** hardcode API keys in source files or `.env.example`, never use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`, and always keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` and `mapId="DEMO_MAP_ID"` on `<Map>`.
- **NEVER** shadow JavaScript's global `Map` constructor in files that import `Map` from `@vis.gl/react-google-maps` — always alias `{ Map as GoogleMap }` and use `Record<K, V>` for dictionaries.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/components/RouteMap.tsx`](./src/components/RouteMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlacePicker.tsx`](./src/components/PlacePicker.tsx), [`src/components/TravelComparatorApp.tsx`](./src/components/TravelComparatorApp.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/profile/route.ts`](./src/app/api/elevation/profile/route.ts), [`src/app/api/places/autocomplete/route.ts`](./src/app/api/places/autocomplete/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts)
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
