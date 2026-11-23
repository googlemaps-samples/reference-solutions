# AGENTS.md — Google Maps Platform Guardrails

This Next.js App Router project (`3d-trail-explorer/nextjs`) strictly adheres to the **Google Maps Platform Zero-Legacy Mandate** and secure Backend-for-Frontend (BFF) standards.

## Modern Google Maps Platform APIs Used

- **React SDK:** `@vis.gl/react-google-maps` (`APIProvider`) and `@vis.gl/react-google-maps/3d` (`Map3D`, `Polyline3D`, `Marker3D`, `Popover`, `MapMode`, `AltitudeMode`, `useMap3D`)
- **Photorealistic 3D Maps (`maps3d`):** `Map3DElement` (`<gmp-map-3d>`), `Polyline3DElement`, `Marker3DInteractiveElement`, `PopoverElement`, `flyCameraTo()`
- **Markers (`marker`):** `Pin` / `PinElement` with `glyphText` / `glyphSrc` (and `AdvancedMarker` / `AdvancedMarkerElement` for any 2D marker work)
- **Places API (New) (`places`):**
  - Client widget: `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) mounted imperatively via `useRef` + `useEffect`, listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`)
  - Server-side BFF Route Handlers (`src/app/api/places/*`): `https://places.googleapis.com/v1/places:searchText` and `https://places.googleapis.com/v1/places:autocomplete` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`
- **Elevation API:** Server-side BFF Route Handler (`src/app/api/elevation/profile/route.ts`) calling `https://maps.googleapis.com/maps/api/elevation/json` (or `ElevationService.getElevationAlongPath` via `importLibrary('elevation')`)
- **Routing (if added in future extensions):** `Route.computeRoutes()` (`importLibrary('routes')`) or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) via a server Route Handler
- **Usage Attribution:** Always keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<APIProvider>` and `<Map3D>` / `<Map>`.

## Prohibited Legacy / Deprecated APIs & Patterns (NEVER Introduce)

Future coding agents **MUST NOT** introduce any of the following deprecated, disabled, or insecure patterns:

1. **DO NOT** use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>` (2D) or `Marker3DInteractiveElement` / `<Marker3D>` (3D).
2. **DO NOT** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, `Place.searchNearby`, or Places API (New) v1 REST via BFF Route Handlers.
3. **DO NOT** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **DO NOT** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes()` or Routes API v2.
5. **DO NOT** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. **DO NOT** install banned wrapper libraries (`@react-google-maps/api`, `google-map-react`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
7. **DO NOT** call `places.googleapis.com`, `routes.googleapis.com`, `addressvalidation.googleapis.com`, or `maps.googleapis.com/maps/api/*` directly from browser `fetch()` — route REST calls through Next.js App Router `/api/...` Route Handlers.
8. **DO NOT** use `PinElement.element` or `PinElement.glyph` — append `PinElement` directly and use `glyphText` / `glyphSrc`.
9. **DO NOT** hardcode API keys or LLM-hallucinated place ratings, reviews, or opening hours.
10. **DO NOT** set `output: 'export'` or `output: 'standalone'` in `next.config.mjs`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `maps3d`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`

### Key Implementation Files

- **Places, Routes & Geo Services:** [`src/components/PlaceSearchBar.tsx`](./src/components/PlaceSearchBar.tsx), [`src/components/TrailExplorerApp.tsx`](./src/components/TrailExplorerApp.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/profile/route.ts`](./src/app/api/elevation/profile/route.ts), [`src/app/api/places/autocomplete/route.ts`](./src/app/api/places/autocomplete/route.ts), [`src/app/api/places/search/route.ts`](./src/app/api/places/search/route.ts)
- **App Entry & Config:** [`next.config.mjs`](./next.config.mjs), [`src/app/page.tsx`](./src/app/page.tsx)

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
