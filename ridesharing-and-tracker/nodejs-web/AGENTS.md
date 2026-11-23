# Agent Guidelines (`nodejs-web` — Ridesharing & Live Driver Tracking)

This repository uses **only modern, zero-deprecation Google Maps Platform APIs** and strict Backend-for-Frontend (BFF) security practices. Any future coding agent editing this project MUST adhere to these rules.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import)**:
  - Loaded via the `google.maps.importLibrary()` bootstrap (`core`, `maps`, `marker`, `places`, `routes`, `geometry`).
  - `Map` initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Markers**:
  - `AdvancedMarkerElement` and `PinElement` (passing `glyphText` / `glyphColor` directly; never `PinElement.element` or `PinElement.glyph`).
- **Places API (New)**:
  - Client-side `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - Client-side fallback `Place.searchByText`.
  - Server-side proxy (`POST /api/places/search`) calling `https://places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`.
- **Routes API v2**:
  - Server-side proxy (`POST /api/routes/compute`) calling `https://routes.googleapis.com/directions/v2:computeRoutes` with `TRAFFIC_AWARE_OPTIMAL`, `FUEL_EFFICIENT`, `FUEL_CONSUMPTION`, and explicit `X-Goog-FieldMask`.
  - Server-side proxy (`POST /api/routes/matrix`) calling `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with explicit `X-Goog-FieldMask`.
- **Geometry Library**:
  - `encoding.decodePath` and `spherical.computeDistanceBetween`, `spherical.interpolate`, `spherical.computeHeading`.

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement`).
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` or `Place` / `AutocompleteSuggestion`).
- Retired `gmp-placeselect` event (always use `gmp-select`).
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use Routes API v2 or `Route.computeRoutes`).
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- `PinElement.element` or `PinElement.glyph`.
- Direct browser `fetch()` calls to `*.googleapis.com` Maps REST endpoints (always proxy through `/api/...` on Express).
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in client JS (always use `document.createElement`, `textContent`, `replaceChildren`).
- Hardcoded API keys or `0.0.0.0` server bindings (bind strictly to `127.0.0.1` and load `GOOGLE_MAPS_API_KEY` from `.env`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

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
