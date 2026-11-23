# AGENTS.md — Coding Agent Guidelines for `nodejs-web`

This repository implements the **Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route** using modern Google Maps Platform APIs and a secure Node.js + Express + TypeScript Backend-for-Frontend (BFF).

## Modern Google Maps Platform APIs Used

- **Photorealistic 3D Maps (`maps3d` library)**: `Map3DElement` (`<gmp-map-3d>`), `Polyline3DElement`, `Marker3DInteractiveElement`, `PopoverElement`, `flyCameraTo()`, `gmp-click`, `gmp-camerapositionchange`.
- **Marker Customization (`marker` library)**: `PinElement` with `glyphText`, `background`, `borderColor`, `glyphColor` (and `AdvancedMarkerElement` when rendering 2D maps).
- **Places API (New) (`places` library & REST v1)**: `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`), `Place.searchByText()`, and server-side BFF proxies to `places.googleapis.com/v1/places:searchText` and `places.googleapis.com/v1/places:autocomplete` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **Elevation API (`elevation` library & REST)**: `ElevationService.getElevationAlongPath` / `getElevationForLocations` and server-side BFF proxy `/api/elevation/profile` calling `maps.googleapis.com/maps/api/elevation/json`.
- **Usage Attribution**: Always preserve `gmp_git_agentsamples_v1.0.0` via `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`.

## Strict Non-Negotiable Rules for Future Agents

1. **NEVER introduce deprecated or legacy Google Maps Platform APIs**:
   - Do NOT use `google.maps.Marker` (use `Marker3DInteractiveElement` on 3D maps or `AdvancedMarkerElement` on 2D maps).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
   - Do NOT listen to retired `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
   - Do NOT use `PinElement.element`, `PinElement.glyph`, or `Polyline3DElement.coordinates` (use `PinElement` directly, `glyphText`/`glyphSrc`, and `Polyline3DElement.path`).
   - Do NOT install legacy wrapper packages (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
2. **NEVER hardcode API keys or hallucinate Places data**:
   - Always load `GOOGLE_MAPS_API_KEY` from `.env` via `process.env.GOOGLE_MAPS_API_KEY`.
   - Always fetch place details, ratings, addresses, and elevations from live Google Maps Platform APIs at runtime.
3. **Security & DOM Safety**:
   - Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js`; use `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()`.
   - Bind the Express server strictly to `127.0.0.1` (never `0.0.0.0`) and retain `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
   - Do not call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/elevation` directly via raw browser `fetch()`; route REST requests through `/api/...` in `src/server.ts`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`public/index.html`](./public/index.html)
- **Places, Routes & Geo Services:** [`public/app.js`](./public/app.js), [`public/index.html`](./public/index.html)
- **Backend API Proxy:** [`src/server.ts`](./src/server.ts)
- **App Entry & Config:** [`public/index.html`](./public/index.html)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
node dist/server.js --host 127.0.0.1 --port 4178
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
