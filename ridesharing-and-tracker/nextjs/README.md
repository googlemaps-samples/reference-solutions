# Rideshare Booking, Fare Estimator & Live Driver Tracking — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers) with `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Places API (New)`, and `Routes API v2`

A production-ready Los Angeles rideshare booking, eco-friendly route comparison, transparent fare estimator, and live driver-dispatch simulation built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and **Next.js Route Handlers** acting as a secure Backend-for-Frontend (BFF) proxy for Google Maps Platform REST services.

## Modern Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (2D Vector Map):** `<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']} />`, and `<AdvancedMarker>` (`AdvancedMarkerElement`). See [Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Places API (New):** Imperative `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) mounted via `useRef` + `useEffect` listening to `gmp-select`, `event.placePrediction.toPlace()`, `place.fetchFields()`, plus server-side `places:searchText` via `/api/places/search`. See [Places API (New) Docs](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Routes API v2:** Server-side `directions/v2:computeRoutes` via `/api/routes/compute` with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, and `vehicleInfo.emissionType`; plus `distanceMatrix/v2:computeRouteMatrix` via `/api/routes/matrix` to dispatch the closest nearby driver. See [Routes API Docs](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Maps JavaScript API Geometry Library:** `google.maps.geometry.encoding.decodePath()` and `spherical.interpolate` / `spherical.computeHeading` for smooth 60fps driver movement along approach and trip polylines.

## Quickstart Setup (Zero-Billing Maps Demo Key)

1. **Obtain a Google Maps Platform API Key:**
   - **Prototyping (Zero-Billing):** Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0), sign in with any Google account, accept the Maps Demo Project Terms, and generate a free key (daily quota limit; not for production).
   - **Production:** Create a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**, and apply [API Key Restrictions](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and set:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key_here
   ```

3. **Install, Typecheck, Build, and Run:**
   ```bash
   npm install --no-audit --no-fund
   npx tsc --noEmit
   npm run build
   npx next start --hostname 127.0.0.1 --port 3000
   ```
   Then open `http://127.0.0.1:3000`.

## Architecture Summary

- **Server-Side BFF Route Handlers (`src/app/api/*`):** Prevent client-side CORS failures and keep REST field masks explicit:
  - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText` (resolves pre-seeded Los Angeles pickup & drop-off locations on initial load).
  - `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes` (computes traffic-aware fastest `DEFAULT_ROUTE` + `FUEL_EFFICIENT` routes with `FUEL_CONSUMPTION` microliters, plus driver-to-pickup approach geometry).
  - `POST /api/routes/matrix` → `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` (evaluates live ETAs from 4 simulated Los Angeles vehicles to dispatch the closest driver).
- **Core Client Workspace (`src/components/RideshareWorkspace.tsx`):** Coordinates pre-seeded LA places, route comparison, emission powertrain switching (`GASOLINE`, `HYBRID`, `ELECTRIC`), transparent Economy/Comfort/Green fare estimation, and `requestAnimationFrame` polyline interpolation for the live driver `<AdvancedMarker>`.

### Core Implementation Snippet (Eco-Friendly Route Request via Route Handler)

```ts
const routePayload = {
  origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
  destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
  travelMode: 'DRIVE',
  routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
  requestedReferenceRoutes: ['FUEL_EFFICIENT'],
  extraComputations: ['FUEL_CONSUMPTION'],
  routeModifiers: { vehicleInfo: { emissionType } },
  polylineQuality: 'HIGH_QUALITY',
};
```

## Compliance & Terms Notice

Use of Google Maps Platform APIs and generated code is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0). All place names, addresses, coordinates, route geometries, and fuel consumption estimates are fetched live at runtime from Google Maps Platform APIs.

## Standalone Sample Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
