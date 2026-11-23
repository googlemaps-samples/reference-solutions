# Agent Guidelines — Live Order Tracking (`nextjs`)

This standalone Next.js App Router + TypeScript sample strictly adheres to the **Google Maps Platform Zero-Legacy Mandate**. Future coding agents modifying this repository MUST preserve these modern API choices and security invariants.

## Modern Google Maps Platform APIs Used

- **Maps Rendering (`@vis.gl/react-google-maps`):** `<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<Polygon>`, `<Polyline>`.
- **Markers:** `<AdvancedMarker>` (`google.maps.marker.AdvancedMarkerElement`) with declarative React marker badges.
- **Places Autocomplete (New):** `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect` (`useMapsLibrary('places')`), listening for `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Geometry:** `google.maps.geometry.poly.containsLocation` and `google.maps.geometry.encoding.decodePath` via `useMapsLibrary('geometry')`.
- **Address Validation API (BFF Proxy):** `POST /api/address/validate` -> `https://addressvalidation.googleapis.com/v1:validateAddress`.
- **Routes API v2 (BFF Proxy):** `POST /api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`.
- **Maps Static API (BFF Proxy):** `GET /api/maps/static-receipt` -> `https://maps.googleapis.com/maps/api/staticmap`.

## Prohibited Legacy / Deprecated APIs & Patterns (NEVER Introduce)

- NEVER use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>`.
- NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use Routes API v2 (`Route.computeRoutes` or `routes.googleapis.com/directions/v2:computeRoutes`).
- NEVER install banned wrapper libraries (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library` `<gmpx-*>`).
- NEVER call `googleapis.com` REST endpoints directly from client browser `fetch()` — route REST calls through Next.js Route Handlers (`src/app/api/*`).
- NEVER hardcode API keys or expose server keys in client image URLs, and NEVER bind servers to `0.0.0.0` (always bind to `127.0.0.1`).
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `nextjs` (Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers))
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`

### Key Implementation Files

- **Map & Markers:** [`src/components/DeliveryMap.tsx`](./src/components/DeliveryMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/DeliveryTrackerApp.tsx`](./src/components/DeliveryTrackerApp.tsx), [`src/components/OrderReceiptCard.tsx`](./src/components/OrderReceiptCard.tsx), [`src/components/PlaceAutocompleteInput.tsx`](./src/components/PlaceAutocompleteInput.tsx), [`src/lib/delivery.ts`](./src/lib/delivery.ts)
- **Backend API Proxy:** [`src/app/api/address/validate/route.ts`](./src/app/api/address/validate/route.ts), [`src/app/api/maps/static-receipt/route.ts`](./src/app/api/maps/static-receipt/route.ts), [`src/app/api/routes/compute/route.ts`](./src/app/api/routes/compute/route.ts)
- **App Entry & Config:** [`next.config.ts`](./next.config.ts), [`src/app/page.tsx`](./src/app/page.tsx)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx next start --hostname 127.0.0.1 --port 4173
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
