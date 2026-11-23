# AGENTS.md — Google Maps Platform Modern API Mandates

This Next.js App Router repository (`complete-heatmap/nextjs`) strictly enforces the **Zero-Deprecation Google Maps Platform Architecture**. Future coding agents modifying this codebase **MUST** preserve these modern APIs and patterns:

## Modern Google Maps Platform APIs Used

1. **Maps JavaScript SDK via `@vis.gl/react-google-maps`:**
   - `<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, and `useMap()` / `useMapsLibrary()`.
   - `google.maps.geometry.poly.containsLocation` and `google.maps.geometry.encoding.decodePath` for flood-zone polygon intersection detection.
2. **Data Visualization:**
   - `@deck.gl/aggregation-layers` (`HeatmapLayer`) mounted via `@deck.gl/google-maps` (`GoogleMapsOverlay`) with a pre-flight WebGL2 check and graceful 2D fallback for headless browsers.
3. **Modern Places & Autocomplete:**
   - Imperative `google.maps.places.PlaceAutocompleteElement` mounted with `useRef` + `useEffect`, listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
   - Server-side BFF `POST /api/places/search` proxying `https://places.googleapis.com/v1/places:searchText` with explicit `X-Goog-Api-Key`, `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`.
4. **Modern Routing (Routes API v2):**
   - Server-side BFF `POST /api/routes/compute` proxying `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`, `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`, and `intermediates` (`via: true`) for flood-polygon bypass detours.
5. **Geocoding, Elevation & Weather APIs (BFF Route Handlers):**
   - `GET /api/geocode/reverse` -> `https://maps.googleapis.com/maps/api/geocode/json`
   - `GET /api/elevation` -> `https://maps.googleapis.com/maps/api/elevation/json`
   - `GET /api/weather/current` -> `https://weather.googleapis.com/v1/currentConditions:lookup`

## Prohibited Legacy / Deprecated APIs (NEVER Introduce)

- NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `<AdvancedMarker>` / `AdvancedMarkerElement`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`, or the retired `gmp-placeselect` event — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `Place`, or `places:searchText`.
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes` or `Route.computeRoutes`).
- NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- NEVER use banned wrapper packages (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` / `<gmpx-*>`).
- NEVER make direct browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, `maps.googleapis.com`, or `weather.googleapis.com`; always route through `/api/*` Route Handlers or official Maps JS SDK wrappers.
- NEVER hardcode API keys or bypass security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`

### Key Implementation Files

- **Map & Markers:** [`src/components/DeckGlHeatmapOverlay.tsx`](./src/components/DeckGlHeatmapOverlay.tsx), [`src/components/HazardMapCanvas.tsx`](./src/components/HazardMapCanvas.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteBox.tsx`](./src/components/PlaceAutocompleteBox.tsx), [`src/components/StormWatchDashboard.tsx`](./src/components/StormWatchDashboard.tsx), [`src/lib/flood-routing.ts`](./src/lib/flood-routing.ts)
- **Backend API Proxy:** [`src/app/api/elevation/route.ts`](./src/app/api/elevation/route.ts), [`src/app/api/geocode/reverse/route.ts`](./src/app/api/geocode/reverse/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts), [`src/app/api/weather/current/route.ts`](./src/app/api/weather/current/route.ts)
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
