# AGENTS.md — Google Maps Platform Guardrails (`vue-vite`)

This repository is a standalone Vue 3 + Vite + TypeScript Google Maps Platform sample for **On-Demand Delivery Checkout, Zone Validation & Live Order Tracking**.

## Modern Google Maps Platform APIs Used

- **Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions` + `importLibrary`).
- **Interactive Map**: `google.maps.Map` (`importLibrary('maps')`) configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Markers**: `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (`importLibrary('marker')`) using `marker.append(...)` and `PinElementOptions.glyphText`.
- **Places Autocomplete**: `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) configured via Vite's `compilerOptions.isCustomElement`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Address Validation**: `AddressValidation.fetchAddressValidation` (`importLibrary('addressValidation')`) reading weekly-safe verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), `metadata`, and `uspsData`.
- **Routing**: `Route.computeRoutes` (`importLibrary('routes')`) with `TravelMode.DRIVING`, `RoutingPreference.TRAFFIC_AWARE`, explicit `fields` mask, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Geospatial Checks & Encoding**: `google.maps.geometry.poly.containsLocation` and `google.maps.geometry.encoding.encodePath` (`importLibrary('geometry')`).
- **Static Receipt Preview**: Maps Static API (`https://maps.googleapis.com/maps/api/staticmap`) with `enc:` encoded route polyline and `K` / `D` markers.

## Prohibited Legacy / Deprecated APIs (NEVER Introduce)

Future coding agents modifying this codebase **MUST NEVER** introduce:
- `google.maps.Marker` (always use `AdvancedMarkerElement`).
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event (always use `PlaceAutocompleteElement` + `gmp-select`).
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use `Route.computeRoutes`).
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
- `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly via `marker.append(pin)` and use `glyphText` / `glyphSrc`).
- Any banned wrapper packages (`@googlemaps/extended-component-library`, `<gmpx-*>`, etc.).
- Direct browser `fetch()` calls to `routes.googleapis.com`, `places.googleapis.com`, or `addressvalidation.googleapis.com` (CORS-blocked).
- Hardcoded API keys anywhere in source code or `.env.example`.
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `addressValidation`, `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/App.vue`](./src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./src/App.vue), [`src/services/mapsService.ts`](./src/services/mapsService.ts), [`src/types/delivery.ts`](./src/types/delivery.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx vue-tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4175 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
