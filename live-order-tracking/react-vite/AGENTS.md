# Agent Guidelines — On-Demand Delivery Checkout & Live Tracker (`react-vite`)

This repository implements the **Live Order Tracking** sample using **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** with strict zero-deprecation Google Maps Platform standards.

## Modern Google Maps Platform APIs Used

- **`@vis.gl/react-google-maps`**: `<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Polygon>`, `<Polyline>`, `useMap`, `useMapsLibrary`, `useApiIsLoaded`, `createStaticMapsUrl`
- **Maps & Advanced Markers**: `mapId="DEMO_MAP_ID"` with `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` and `<AdvancedMarker>` (`AdvancedMarkerElement`)
- **Places API (New)**: Imperatively mounted `PlaceAutocompleteElement` (`useRef` + `useEffect`) listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`)
- **Address Validation API**: `google.maps.importLibrary('addressValidation')` -> `AddressValidation.fetchAddressValidation` with `uspsCASSEnabled: true` and weekly-safe `verdict`, `metadata`, and `uspsData` fields
- **Routes API (JS SDK)**: `google.maps.importLibrary('routes')` -> `Route.computeRoutes` with `travelMode: 'DRIVING'` and `routingPreference: 'TRAFFIC_AWARE'`
- **Geometry Library**: `google.maps.importLibrary('geometry')` -> `poly.containsLocation` and `encoding.encodePath`
- **Maps Static API**: `createStaticMapsUrl` rendering kitchen/customer pins and `enc:` encoded route polyline

## Strict Prohibitions for Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs**:
   - Do NOT use `google.maps.Marker` or `<Marker>` (always use `AdvancedMarkerElement` / `<AdvancedMarker>` with `mapId="DEMO_MAP_ID"`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
   - Do NOT listen to retired `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use `Route.computeRoutes`).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - Do NOT use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly with `glyphText` / `glyphSrc` or React children inside `<AdvancedMarker>`).
   - Do NOT call `place.isOpen()` or `possibleNextAction` on the default `weekly` channel.
2. **NEVER install banned wrapper packages**:
   - Do NOT install `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **NEVER shadow the global `Map` constructor**:
   - Always alias `import { Map as GoogleMap } from '@vis.gl/react-google-maps'`.
4. **NEVER hardcode API keys or expose secrets**:
   - Always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` from `.env.local`.
5. **NEVER use `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML`**:
   - Use `replaceChildren()`, `textContent`, or React JSX.
6. **Maintain usage attribution and explicit map dimensions**:
   - Keep `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<GoogleMap>` and API requests.
   - Keep `.map-panel` height `>= 560px` so the map container never collapses to `0x0`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client + Local Proxy (Vite Middleware)
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`
- **Deploy Note:** `/api/*` routes are served by Vite dev/preview middleware in `vite.config.ts`; port them to serverless/backend endpoints before deploying `dist/` to static hosting.

### Key Implementation Files

- **Map & Markers:** [`src/components/DeliveryMap.tsx`](./src/components/DeliveryMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/AddressAutocompleteInput.tsx`](./src/components/AddressAutocompleteInput.tsx), [`src/components/CheckoutSidebar.tsx`](./src/components/CheckoutSidebar.tsx), [`src/components/DeliveryMap.tsx`](./src/components/DeliveryMap.tsx), [`src/services/mapsServices.ts`](./src/services/mapsServices.ts)
- **Backend API Proxy:** [`vite.config.ts`](./vite.config.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.tsx`](./src/App.tsx)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4172 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
