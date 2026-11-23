# AGENTS.md — Google Maps Platform Coding Directives

This project implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** on Node.js + Express + TypeScript (`src/server.ts` -> `dist/server.js`) and a vanilla web frontend (`public/index.html`, `public/app.js`, `public/styles.css`).

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import)**:
  - `google.maps.importLibrary('maps')` -> `Map`, `ImageMapType`, `Rectangle`
  - `google.maps.importLibrary('marker')` -> `AdvancedMarkerElement`, `PinElement`
  - `google.maps.importLibrary('places')` -> `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace().fetchFields(...)`)
  - `google.maps.importLibrary('geocoding')` -> `Geocoder`
  - Mandatory map configuration: `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- **Server-Side BFF REST Proxies (`src/server.ts`)**:
  - Places API (New): `POST https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - Weather API: `GET https://weather.googleapis.com/v1/currentConditions:lookup` and `GET https://weather.googleapis.com/v1/forecast/days:lookup`
  - Air Quality API: `POST https://airquality.googleapis.com/v1/currentConditions:lookup` and `GET https://airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`
  - Pollen API: `GET https://pollen.googleapis.com/v1/forecast:lookup`
  - Solar API: `GET https://solar.googleapis.com/v1/buildingInsights:findClosest`

## Hard Prohibitions for Future Agents

1. **NEVER** introduce deprecated or disabled Google Maps Platform APIs:
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `Place.searchNearby`, or `AutocompleteSuggestion`).
   - NEVER listen to retired `gmp-placeselect` (always use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly to `AdvancedMarkerElement.content` and use `glyphText` / `glyphSrc`).
   - NEVER install `@googlemaps/extended-component-library` (`<gmpx-*>`), `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, or `@googlemaps/react-wrapper`.
2. **Security & Compliance**:
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js` (use `document.createElement`, `textContent`, and `replaceChildren`).
   - NEVER bind the server to `0.0.0.0` (always bind to `127.0.0.1` and keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`).
   - NEVER remove `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` or `?utm_campaign=gmp_git_agentsamples_v1.0.0` on documentation links.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles/:mapType/:zoom/:x/:y`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`

### Key Implementation Files

- **Map & Markers:** [`public/app.js`](./public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./public/app.js)
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
