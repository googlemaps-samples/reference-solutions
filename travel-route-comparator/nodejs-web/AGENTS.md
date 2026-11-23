# Agent Guidelines — `nodejs-web` (Travel Route Comparator)

This project implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using **Node.js + Express + TypeScript** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import)**:
  - `google.maps.importLibrary('core' | 'maps' | 'marker' | 'places' | 'geometry')`
  - `Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` + `PinElement` (`glyphText`, appended via `marker.append(pin)`)
  - `Polyline`, `BicyclingLayer`, and `geometry.encoding.decodePath`
- **Places API (New)**:
  - Client UI widget: `PlaceAutocompleteElement` listening exclusively to `gmp-select` (`event.placePrediction.toPlace()` -> `place.fetchFields(...)`)
  - Server BFF: `POST https://places.googleapis.com/v1/places:searchText` and `POST https://places.googleapis.com/v1/places:autocomplete` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API v2**:
  - Server BFF: `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - Supports `DRIVE`, `BICYCLE`, `WALK`, `TRANSIT`, `computeAlternativeRoutes`, `avoidTolls`, `avoidHighways`, `FUEL_EFFICIENT`, `TOLLS`, and `FUEL_CONSUMPTION`
- **Elevation API**:
  - Server BFF: `GET https://maps.googleapis.com/maps/api/elevation/json?path=enc:...&samples=64`

## Strict Prohibitions for Future Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` (always use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (always use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, or Places API New REST).
   - NEVER listen to the retired `gmp-placeselect` event (always use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use Routes API v2 or `Route.computeRoutes`).
   - NEVER use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER call `googleapis.com` REST endpoints directly from browser `fetch()` (always route through `/api/...` BFF endpoints).
2. **NEVER violate web security & ToS mandates:**
   - NEVER hardcode API keys in source code or `.env.example`; always use `process.env.GOOGLE_MAPS_API_KEY`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; always use `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()`.
   - NEVER bind the Express server to `0.0.0.0`; always bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
   - ALWAYS retain `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and the walking/cycling beta path advisory banner.
   - NEVER hardcode fake place coordinates, ratings, reviews, or opening hours from memory; resolve places dynamically via Google Maps Platform APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`public/app.js`](./public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./public/app.js)
- **Backend API Proxy:** [`src/gmpClient.ts`](./src/gmpClient.ts), [`src/server.ts`](./src/server.ts)
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
