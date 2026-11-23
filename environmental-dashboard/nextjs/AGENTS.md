# Agent Guidelines — Environmental Dashboard (`nextjs`)

This Next.js App Router + TypeScript application adheres strictly to modern, zero-deprecation Google Maps Platform standards and secure Backend-for-Frontend (BFF) practices.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`):**
  - `APIProvider`, `Map` (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`)
  - `AdvancedMarker` + `Pin` (`AdvancedMarkerElement` / `PinElement`)
  - `useMapsLibrary('places')` → `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`
  - `useMapsLibrary('geocoding')` → `Geocoder` for map-click reverse geocoding
  - `useMapsLibrary('maps')` → native `google.maps.ImageMapType` for WebGL-free `US_AQI` heatmap tiles and `google.maps.Rectangle` for Solar building footprints
- **Server-Side Route Handlers (`app/api/*/route.ts`) with `X-Goog-Api-Key` and `X-Goog-FieldMask`:**
  - Places API (New): `places.googleapis.com/v1/places:searchText`
  - Weather API v1: `weather.googleapis.com/v1/currentConditions:lookup` & `forecast/days:lookup`
  - Air Quality API v1: `airquality.googleapis.com/v1/currentConditions:lookup` & `mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`
  - Pollen API v1: `pollen.googleapis.com/v1/forecast:lookup`
  - Solar API v1: `solar.googleapis.com/v1/buildingInsights:findClosest`

## Strict Prohibitions for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` or `<Marker>` — ALWAYS use `AdvancedMarkerElement` / `<AdvancedMarker>`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchByText`, or `Place.searchNearby`.
   - NEVER listen to retired `gmp-placeselect` — ALWAYS use `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use `Route.computeRoutes` or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - NEVER use `PinElement.element` or `PinElement.glyph` — use `<Pin>` / `PinElement` with `glyphText` or `glyphSrc`.
2. **NEVER install banned wrapper packages:**
   - Do NOT install `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library`.
3. **NEVER bypass server proxies with client-side CORS calls:**
   - Do NOT call `places.googleapis.com`, `routes.googleapis.com`, `weather.googleapis.com`, `airquality.googleapis.com`, `pollen.googleapis.com`, or `solar.googleapis.com` directly from browser `fetch()`. Route through `app/api/*/route.ts`.
4. **Maintain Security & Attribution Mandates:**
   - NEVER hardcode API keys in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` — use `replaceChildren()`, `textContent`, or React JSX.
   - Keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`.
   - Keep security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) in `next.config.ts` and bind servers to `127.0.0.1`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`

### Key Implementation Files

- **Map & Markers:** [`components/EnvironmentalMap.tsx`](./components/EnvironmentalMap.tsx)
- **Places, Routes & Geo Services:** [`components/EnvironmentalDashboard.tsx`](./components/EnvironmentalDashboard.tsx), [`components/EnvironmentalMap.tsx`](./components/EnvironmentalMap.tsx), [`components/PlaceAutocompleteControl.tsx`](./components/PlaceAutocompleteControl.tsx)
- **Backend API Proxy:** [`app/api/air-quality/current/route.ts`](./app/api/air-quality/current/route.ts), [`app/api/air-quality/tiles/route.ts`](./app/api/air-quality/tiles/route.ts), [`app/api/places/search-text/route.ts`](./app/api/places/search-text/route.ts), [`app/api/pollen/forecast/route.ts`](./app/api/pollen/forecast/route.ts), [`app/api/solar/building-insights/route.ts`](./app/api/solar/building-insights/route.ts), [`app/api/weather/current/route.ts`](./app/api/weather/current/route.ts), [`app/api/weather/forecast/route.ts`](./app/api/weather/forecast/route.ts)
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
