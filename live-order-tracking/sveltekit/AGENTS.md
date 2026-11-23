# Coding Agent Instructions — Live Order Tracking (SvelteKit)

This repository implements the **On-Demand Delivery Checkout, Zone Validation & Live Tracker** sample using **SvelteKit + TypeScript** and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`@googlemaps/js-api-loader` v2):** Uses `setOptions()` + `importLibrary()` inside Svelte's `onMount` lifecycle (never at module top-level / SSR).
- **`Map` with `DEMO_MAP_ID` & Attribution:** Initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **`AdvancedMarkerElement`:** Custom DOM markers (built via `document.createElement` / `textContent`, never `innerHTML`) for Kitchen Hub, Customer Drop-off, and animated Courier.
- **`PlaceAutocompleteElement` (Places API New):** Native web component listening to `gmp-select` and hydrating details via `event.placePrediction.toPlace().fetchFields(...)`.
- **`AddressValidation.fetchAddressValidation` (+ `/api/address/validate` BFF):** Checks weekly-safe `verdict` fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), `metadata`, and `uspsData`.
- **`Route.computeRoutes` (+ `/api/routes/compute` BFF):** Traffic-aware driving route distance, duration, steps, and path geometry (`internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`).
- **`geometry` Library:** `poly.containsLocation` for Chicago delivery zone polygon verification and `encoding.encodePath` for route polyline encoding.
- **Maps Static API (`/api/maps/static-receipt` BFF):** Server-proxied PNG route summary image so the API key never appears in client HTML.

## Strict Prohibitions for Future Agents

1. **NEVER introduce deprecated or disabled GMP APIs:**
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` + `gmp-select`).
   - Do NOT listen to `gmp-placeselect` (use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - Do NOT use `@googlemaps/js-api-loader` v1 `new Loader(...).load()`.
   - Do NOT use `PinElement.element` or `PinElement.glyph`.
2. **NEVER install banned wrapper packages:**
   - Do NOT install `svelte-google-maps`, `@beyonk/svelte-google-maps`, `svelte-map-google`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **NEVER hardcode API keys or expose secrets:**
   - Always load `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public`.
   - Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
   - Keep server bindings strictly on `127.0.0.1` and retain security headers in `src/hooks.server.ts`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `sveltekit` (SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `addressValidation`, `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/services/deliveryApi.ts`](./src/lib/services/deliveryApi.ts), [`src/lib/services/mapsLoader.ts`](./src/lib/services/mapsLoader.ts), [`src/lib/types/delivery.ts`](./src/lib/types/delivery.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/address/validate/+server.ts`](./src/routes/api/address/validate/+server.ts), [`src/routes/api/maps/static-receipt/+server.ts`](./src/routes/api/maps/static-receipt/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./src/routes/api/routes/compute/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./src/hooks.server.ts), [`src/routes/+page.svelte`](./src/routes/+page.svelte), [`svelte.config.js`](./svelte.config.js), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npm run check
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4174 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
