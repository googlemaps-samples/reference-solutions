# Agent Guidelines — Google Maps Platform (Angular Standalone)

This repository implements the **On-Demand Delivery Checkout, Zone Validation & Live Tracker** using Angular Standalone Components, `@angular/google-maps`, and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps Loader:** `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) — NEVER v1 `new Loader(...).load()`.
- **Map & Markers:** `@angular/google-maps` `GoogleMap`, `MapAdvancedMarker` (`AdvancedMarkerElement`), `MapPolygon`, `MapPolyline` configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Places API (New):** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>` with `CUSTOM_ELEMENTS_SCHEMA`), listening to the `gmp-select` event and calling `event.placePrediction.toPlace().fetchFields(...)` and `Place.searchByText`.
- **Address Validation API:** `AddressValidation.fetchAddressValidation` (`importLibrary('addressValidation')`) reading weekly-safe verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`, `metadata`, `uspsData`), with `/api/address/validate` BFF fallback.
- **Routes API:** `Route.computeRoutes` (`importLibrary('routes')`) with `travelMode: google.maps.routes.TravelMode.DRIVING`, `routingPreference: google.maps.routes.RoutingPreference.TRAFFIC_AWARE`, and explicit `fields` mask.
- **Geometry:** `google.maps.geometry.poly.containsLocation` and `google.maps.geometry.encoding.encodePath` (`importLibrary('geometry')`).
- **Maps Static API:** Proxied via `GET /api/maps/static-receipt` in `serve-dist.mjs` so `GOOGLE_MAPS_API_KEY` stays server-side.

## Strictly Forbidden Legacy / Deprecated APIs

Future coding agents MUST NEVER introduce any of the following deprecated, disabled, or banned APIs/packages:

- `google.maps.Marker` or `@angular/google-maps` `<map-marker>` (use `<map-advanced-marker>` / `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`
- Retired `gmp-placeselect` event (always use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/extended-component-library` (`<gmpx-*>`)
- `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc`)
- Hardcoded API keys anywhere in `src/`, `environment.ts`, or `.env.example`
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`
- Binding servers to `0.0.0.0` (always bind strictly to `127.0.0.1`)

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `angular` (Angular Standalone Components + TypeScript (@angular/google-maps))
- **Transport Mode:** Client + Local Server Proxy (`serve-dist.mjs`)
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `addressValidation`, `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Run Note:** Run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`; plain `ng serve` uses an empty stub).

### Key Implementation Files

- **Map & Markers:** [`src/app/app.component.html`](./src/app/app.component.html)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./src/app/app.component.ts), [`src/app/models/delivery.models.ts`](./src/app/models/delivery.models.ts), [`src/app/services/delivery-tracking.service.ts`](./src/app/services/delivery-tracking.service.ts), [`src/app/services/maps-loader.service.ts`](./src/app/services/maps-loader.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./src/app/app.component.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit && node --check serve-dist.mjs
# Build
npm run build
# Serve (loopback 127.0.0.1)
node serve-dist.mjs --host 127.0.0.1 --port 4176
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
