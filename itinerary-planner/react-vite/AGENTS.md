# AGENTS.md — Google Maps Platform Engineering Guardrails

This standalone React + Vite + TypeScript application uses **modern, zero-deprecation Google Maps Platform APIs** via `@vis.gl/react-google-maps`.

## Modern APIs Used in This Project

- **Maps JavaScript SDK Wrapper:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap`, `useMapsLibrary`).
- **Markers:** `AdvancedMarkerElement` via `<AdvancedMarker>` and `<Pin glyphText={...} />` (never `PinElement.element` or `PinElement.glyph`).
- **Places API (New):**
  - `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - `Place.searchByText` and `Place.searchNearby` with explicit field masks (`id`, `displayName`, `formattedAddress`, `location`, `rating`, `userRatingCount`, `regularOpeningHours`, `photos`, `primaryTypeDisplayName`, `priceLevel`, `googleMapsURI`).
  - `Photo.getURI({ maxWidth, maxHeight })`.
- **Routes API:** `Route.computeRoutes()` via `useMapsLibrary('routes')` with `optimizeWaypointOrder` and `Route.createPolylines()`.
- **Street View:** `StreetViewService.getPanorama()` and `StreetViewPanorama` via `useMapsLibrary('streetView')`.
- **Time Zone API:** Proxied through Vite's `/api/timezone` middleware (`vite.config.ts`) with graceful `Place.utcOffsetMinutes` fallback.
- **Usage Attribution:** Always keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`.

## Strictly Prohibited Legacy / Deprecated APIs & Packages

Future coding agents **MUST NEVER** introduce any of the following:
- `google.maps.Marker` or `@vis.gl/react-google-maps` `<Marker>`
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `PinElement.element` or `PinElement.glyph`
- `Place.prototype.isOpen()` on the `weekly` Maps JS channel (inspect `regularOpeningHours.weekdayDescriptions` instead)
- Banned wrapper packages: `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Raw browser `fetch()` calls directly to `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com`
- Hardcoded API keys or LLM-fabricated place reviews, ratings, or opening hours

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client + Local Proxy (Vite Middleware)
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/timezone`
- **Deploy Note:** `/api/*` routes are served by Vite dev/preview middleware in `vite.config.ts`; port them to serverless/backend endpoints before deploying `dist/` to static hosting.

### Key Implementation Files

- **Map & Markers:** [`src/components/MapWorkspace.tsx`](./src/components/MapWorkspace.tsx), [`src/components/StreetViewPanel.tsx`](./src/components/StreetViewPanel.tsx)
- **Places, Routes & Geo Services:** [`src/components/DestinationHeader.tsx`](./src/components/DestinationHeader.tsx), [`src/services/placesService.ts`](./src/services/placesService.ts), [`src/services/routesService.ts`](./src/services/routesService.ts), [`src/services/timezoneService.ts`](./src/services/timezoneService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./vite.config.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.tsx`](./src/App.tsx)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4172 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
