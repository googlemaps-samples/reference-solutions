# Coding Agent Guidelines (`nodejs-web`)

This repository implements the **Multi-Branch Store, ATM & Inventory Locator** using a Node.js + Express + TypeScript backend proxy (`src/server.ts` -> `dist/server.js`) and an interactive Maps JavaScript API frontend (`public/`).

## Mandatory Modern Google Maps Platform APIs

Future agents modifying this codebase **MUST** strictly preserve these modern APIs and patterns:

1. **Map Initialization:**
   - Use Dynamic Library Import (`google.maps.importLibrary(...)`) with `v: 'weekly'`.
   - Always pass `mapId: 'DEMO_MAP_ID'` (or a valid Cloud Map ID) and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` in `MapOptions`.
2. **Markers & Clustering:**
   - Always use `AdvancedMarkerElement` (`importLibrary('marker')`) with `marker.append(domElement)` and `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm`).
   - Do **NOT** call beta-only `place.isOpen()` on the `weekly` channel; inspect `regularOpeningHours.weekdayDescriptions` instead.
3. **Places & Autocomplete:**
   - Use `PlaceAutocompleteElement` (`importLibrary('places')`) with the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
   - Use server-side REST proxies (`places.googleapis.com/v1/places:searchText`, `places:autocomplete`, `places/{placeId}`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers and `AutocompleteSessionToken` pass-through.
4. **Routes & Matrix:**
   - Use server-side Routes API v2 proxies (`routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` and `routes.googleapis.com/directions/v2:computeRoutes`) with `X-Goog-FieldMask` headers.
   - Only pass `routingPreference: 'TRAFFIC_AWARE'` when `travelMode === 'DRIVE'`.
   - Decode route polylines via `google.maps.importLibrary('geometry')` (`encoding.decodePath`).

## Strictly Forbidden Legacy APIs & Antipatterns

**NEVER** introduce any of the following deprecated or insecure patterns:

- `google.maps.Marker`
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`
- `gmp-placeselect` event (retired; use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
- `PinElement.element`, `PinElement.glyph`, or `AdvancedMarkerElement.content = ...`
- `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Client-side `fetch()` directly to `googleapis.com` (always route through `/api/...`)
- `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` in `public/`
- Hardcoded API keys or binding Express to `0.0.0.0` (must bind strictly to `127.0.0.1`)
- Hardcoded fake Place ratings, reviews, or opening hours

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `nodejs-web` (Node.js + Express + TypeScript Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** `@googlemaps/markerclusterer`
- **Server `/api/*` Proxy Routes:** `/api/places/autocomplete`, `/api/places/details`, `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

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
