# Coding Agent Guidelines (`static-vanilla-js`)

This standalone sample implements **On-Demand Delivery Checkout, Zone Validation & Live Tracker** using **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **`@googlemaps/js-api-loader` v2**: Always use functional `setOptions()` + `importLibrary()`.
- **`google.maps.Map`**: Configured with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **`AdvancedMarkerElement`** (`importLibrary("marker")`): Used for Kitchen, Drop-off, and Live Courier pins via `marker.append(domElement)`.
- **`PlaceAutocompleteElement`** (`importLibrary("places")`): Listening to the modern `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`).
- **`Route.computeRoutes`** (`importLibrary("routes")`) & **Routes API v2 REST** (`/api/routes/compute` -> `routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask`).
- **Address Validation API** (`/api/address/validate` -> `addressvalidation.googleapis.com/v1:validateAddress`) using weekly-safe verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`, `metadata`, `uspsData`).
- **Geometry Library** (`importLibrary("geometry")`): `google.maps.geometry.poly.containsLocation`, `encoding.decodePath`, and `spherical.computeDistanceBetween`.
- **Maps Static API** (`/api/maps/static-receipt` -> `maps.googleapis.com/maps/api/staticmap`).

## Strict Prohibitions for Future Agents

1. **NEVER** reintroduce deprecated or disabled Google Maps Platform APIs:
   - No `google.maps.Marker`
   - No `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
   - No `gmp-placeselect` event (always use `gmp-select`)
   - No `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
   - No `@googlemaps/js-api-loader` v1 `new Loader(...).load()`
   - No `PinElement.element` or `PinElement.glyph`
   - No `@googlemaps/extended-component-library` (`<gmpx-*>`)
2. **NEVER** call `googleapis.com` REST endpoints directly from client browser `fetch()` (always proxy via `server.mjs`).
3. **NEVER** hardcode API keys or expose `GOOGLE_MAPS_API_KEY` in Maps Static API `<img src="...">` URLs.
4. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `app.js` — always use `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()`.
5. **NEVER** bind `server.mjs` to `0.0.0.0` — keep strict `127.0.0.1` loopback binding and `X-Content-Type-Options: nosniff` + `X-Frame-Options: SAMEORIGIN` headers.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `static-vanilla-js` (Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules))
- **Transport Mode:** Client + Local Server Proxy (`server.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`app.js`](./app.js)
- **Places, Routes & Geo Services:** [`app.js`](./app.js)
- **Backend API Proxy:** [`server.mjs`](./server.mjs)
- **App Entry & Config:** [`index.html`](./index.html)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
node --check app.js && node --check server.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node server.mjs --host 127.0.0.1 --port 4171
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
