# Coding Agent Instructions — Google Maps Platform Zero-Deprecation Mandate

This Next.js App Router application uses **current-generation Google Maps Platform APIs and official React wrappers**. Any future AI coding agent modifying this repository MUST strictly preserve these modern APIs and NEVER reintroduce deprecated or disabled services.

## Modern Google Maps Platform APIs Used in This Project

1. **Framework SDK (`@vis.gl/react-google-maps`):**
   - Use `<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMap()`, and `useMapsLibrary()`.
   - Always pass `mapId="DEMO_MAP_ID"` (or a valid Cloud Map ID) and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` to `<Map>`.
   - Note: Alias `Map` as `GoogleMap` when importing alongside JavaScript `Map`, or prefer `Record<string, T>` dictionaries to avoid identifier shadowing.

2. **Markers (`AdvancedMarkerElement`):**
   - Use `<AdvancedMarker>` and `<Pin>` from `@vis.gl/react-google-maps` (backed by `google.maps.marker.AdvancedMarkerElement`).
   - NEVER use legacy `google.maps.Marker` or `<Marker>`.

3. **Places Search & Autocomplete (`Places API (New)`):**
   - Client autocomplete uses `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` (NEVER retired `gmp-placeselect`), and calling `event.placePrediction.toPlace()` followed by `place.fetchFields({ fields: [...] })`.
   - Server-side text search (`/api/places/search`) calls `POST https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.

4. **Drawing & Geospatial Overlays:**
   - Polygon drawing uses `terra-draw` + `terra-draw-google-maps-adapter` (NEVER deprecated `google.maps.drawing`).
   - High-density point/hex visualization uses `@deck.gl/google-maps` (`GoogleMapsOverlay`) with `@deck.gl/layers` (`ScatterplotLayer`) and `@deck.gl/aggregation-layers` (`HexagonLayer`), guarded by WebGL2 availability checks (NEVER deprecated `google.maps.visualization.HeatmapLayer`).

5. **Elevation API:**
   - Terrain profiling is proxied through `/api/elevation` (`https://maps.googleapis.com/maps/api/elevation/json`) on the server so API keys and CORS boundaries are respected.

6. **Routing (if added in future updates):**
   - ALWAYS use `Route.computeRoutes()` via `useMapsLibrary('routes')` or the Routes API v2 REST endpoint (`routes.googleapis.com/directions/v2:computeRoutes`) through a server Route Handler.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.

7. **Security & Browser Safety:**
   - NEVER hardcode API keys in source files or `.env.example`.
   - NEVER call Google Maps REST APIs (`places.googleapis.com`, `routes.googleapis.com`, `maps.googleapis.com/maps/api/elevation`) directly via browser `fetch()`; always route through Next.js Route Handlers under `src/app/api/`.
   - Keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` enabled in `next.config.ts`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`src/components/DeckGlOverlay.tsx`](./src/components/DeckGlOverlay.tsx), [`src/components/GisWorkbench.tsx`](./src/components/GisWorkbench.tsx), [`src/components/TerraDrawController.tsx`](./src/components/TerraDrawController.tsx)
- **Places, Routes & Geo Services:** [`src/components/GisWorkbench.tsx`](./src/components/GisWorkbench.tsx), [`src/components/PlaceSearchBox.tsx`](./src/components/PlaceSearchBox.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/route.ts`](./src/app/api/elevation/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts)
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
