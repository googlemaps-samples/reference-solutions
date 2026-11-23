# Agent Engineering Directives — `live-order-tracking` (`nodejs-web`)

This repository is a standalone Node.js + Express + TypeScript Backend-for-Frontend (BFF) and interactive web application using **strictly modern, non-deprecated Google Maps Platform APIs**.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`importLibrary`)**:
  - `Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` (`importLibrary('marker')`) using `marker.append(element)`
  - `Polygon`, `Polyline`, `geometry.poly.containsLocation`, `geometry.encoding.decodePath`, `geometry.spherical.computeDistanceBetween`
- **Places API (New)**:
  - `PlaceAutocompleteElement` (`importLibrary('places')`) listening strictly to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`
- **Address Validation API**:
  - Server-side `POST https://addressvalidation.googleapis.com/v1:validateAddress` via `/api/address/validate`
- **Routes API v2**:
  - Server-side `POST https://routes.googleapis.com/directions/v2:computeRoutes` via `/api/routes/compute` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Maps Static API**:
  - Server-side `GET https://maps.googleapis.com/maps/api/staticmap` via `/api/maps/static-receipt`

## Non-Negotiable Rules for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs**:
   - NEVER use `google.maps.Marker` — ALWAYS use `AdvancedMarkerElement`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — ALWAYS use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, or `Place`.
   - NEVER listen to retired `gmp-placeselect` — ALWAYS listen to `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — ALWAYS use Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) or `Route.computeRoutes`.
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` or banned wrapper packages (`@googlemaps/extended-component-library` / `<gmpx-*>`, `@react-google-maps/api`, `google-map-react`, `@googlemaps/react-wrapper`, `use-places-autocomplete`).
2. **Preserve Mandatory Attribution & Map ID**:
   - Always pass `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `mapId: 'DEMO_MAP_ID'`.
3. **Preserve Security & BFF Constraints**:
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/`.
   - Always keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers on Express responses.
   - Always bind the Express server strictly to `127.0.0.1` (never `0.0.0.0`).
4. **Preserve Required Verification Commands**:
   - `npm install --no-audit --no-fund`
   - `npx tsc --noEmit`
   - `npm run build` (must emit `dist/server.js`)
   - `node dist/server.js --host 127.0.0.1 --port <port>`

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`

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
