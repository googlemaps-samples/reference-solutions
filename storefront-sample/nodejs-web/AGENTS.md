# Agent Guidelines for `nodejs-web` (Storefront Sample)

This project implements the **Single-Venue Storefront, Booking & Get Directions Hub** using **Node.js + Express + TypeScript** and modern **Google Maps Platform** APIs. Future coding agents modifying this repository MUST strictly adhere to the zero-deprecation and security rules below.

## Approved Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`v=weekly`, `google.maps.importLibrary`)**:
  - `Map` initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` (`importLibrary('marker')`) with DOM elements appended via `marker.append(...)`
  - `Circle`, `Polyline`, `InfoWindow` (`importLibrary('maps')`)
  - `StreetViewService`, `StreetViewPanorama` (`importLibrary('streetView')`)
  - `encoding.decodePath`, `spherical.computeHeading` (`importLibrary('geometry')`)
- **Places API (New)**:
  - Client: `PlaceAutocompleteElement` (`importLibrary('places')`) with `gmp-select` event, `event.placePrediction.toPlace()`, and `place.fetchFields(...)`
  - Server BFF (`src/server.ts`): `POST https://places.googleapis.com/v1/places:searchText` and `GET https://places.googleapis.com/v1/{name}/media` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API v2**:
  - Server BFF (`src/server.ts`): `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and `X-Goog-FieldMask`

## Strictly Forbidden Deprecated / Legacy APIs & Patterns

NEVER introduce any of the following into this codebase:
- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` or Places API New)
- `gmp-placeselect` event listener (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `/api/routes/compute` or `Route.computeRoutes`)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly or use `glyphText` / `glyphSrc`)
- `Place.prototype.isOpen()` on the `weekly` channel (use `currentOpeningHours.openNow` / `regularOpeningHours.openNow` or compute from `periods`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages
- Raw browser `fetch()` to `*.googleapis.com` (always route REST calls through Express `/api/*` BFF endpoints)

## Security & Compliance Mandates

- NEVER hardcode `GOOGLE_MAPS_API_KEY` anywhere in source files or `.env.example`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `public/app.js` — always construct DOM nodes with `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()`.
- Keep the Express server bound strictly to `127.0.0.1` (never `0.0.0.0`) with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
- Never fabricate venue names, ratings, hours, or reviews — always fetch live Places data.
- Never transmit patient PHI or medical records to Google Maps Platform APIs.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`

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
