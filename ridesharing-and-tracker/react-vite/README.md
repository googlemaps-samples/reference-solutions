# Rideshare Booking, Fare Estimator & Live Driver Tracking — React + Vite + TypeScript (@vis.gl/react-google-maps)

Modern, zero-deprecation Los Angeles rideshare passenger booking, eco-friendly route comparison, transparent fare estimation, and live driver-dispatch simulation built with **React + Vite + TypeScript**, [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/), and current Google Maps Platform APIs (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, and the `geometry` library).

## Modern Google Maps Platform APIs Used

- **[Maps JavaScript API (`@vis.gl/react-google-maps`)](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0):** `<APIProvider>`, `<Map>` with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`, and `<AdvancedMarker>` (`AdvancedMarkerElement`) for pickup, drop-off, candidate fleet vehicles, and the animated dispatched driver.
- **[Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0):** Imperatively mounted `PlaceAutocompleteElement` (`gmp-select` event + `placePrediction.toPlace()` + `place.fetchFields()`) for pickup/drop-off entry, plus `Place.searchByText()` to pre-seed Union Station and Santa Monica Pier on load.
- **[Routes API (`Route` & `RouteMatrix`)](https://developers.google.com/maps/documentation/javascript/routes/route-class-overview?utm_campaign=gmp_git_agentsamples_v1.0.0):** `Route.computeRoutes()` with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, and `vehicleInfo.emissionType` (`GASOLINE`, `HYBRID`, `ELECTRIC`), plus `RouteMatrix.computeRouteMatrix()` to rank nearby LA candidate drivers by real-time driving ETA.
- **[Maps JS Geometry Library](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0):** Spherical distance, heading, and interpolation helpers for smooth 60fps driver movement along approach and trip polylines.

## Quickstart Setup (Free Maps Demo Key or Cloud API Key)

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Zero billing setup for prototyping):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key. *(Note: The Maps Demo Key has daily quota limits and is intended strictly for prototyping—never production.)*

**Option B — Production Google Cloud API Key:**
1. Create a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Restrict your key by **HTTP referrer** and **API restrictions** following the [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run dev
```

For a production build and preview:

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture Summary

- **`src/App.tsx`**: Wraps the workspace in `<APIProvider>` loading `core`, `maps`, `marker`, `places`, `routes`, and `geometry`. Resolves pre-seeded Los Angeles locations (`Union Station` → `Santa Monica Pier`) via `Place.searchByText()`, triggers dual fastest vs. eco-friendly route calculation via `Route.computeRoutes()`, ranks simulated LA drivers via `RouteMatrix.computeRouteMatrix()`, computes the driver-to-pickup approach route, and drives a smooth `requestAnimationFrame` simulation with live ETA countdowns.
- **`src/components/PlaceAutocompleteInput.tsx`**: Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` (preventing React JSX attribute stringification) and listens to `gmp-select`.
- **`src/components/RideshareMap.tsx` & `src/components/RoutePolyline.tsx`**: Renders the 2D vector map (`mapId="DEMO_MAP_ID"`), interactive fastest/eco/approach polylines, pickup/drop-off/candidate `<AdvancedMarker>` pins, the heading-rotated live driver marker, and a floating route legend.
- **`src/data/drivers.ts` & `src/utils/geometry.ts`**: Calculates transparent Economy, Comfort, and Green EV fare breakdowns from live trip distance/duration, compares energy/CO₂ savings from `travelAdvisory.fuelConsumptionMicroliters`, and interpolates vehicle position/heading smoothly along route polylines.

### Core Dual-Route Computation Snippet

```ts
const { routes } = await routesLib.Route.computeRoutes({
  origin,
  destination,
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
  requestedReferenceRoutes: ['FUEL_EFFICIENT'],
  extraComputations: ['FUEL_CONSUMPTION'],
  routeModifiers: { vehicleInfo: { emissionType } },
  fields: [
    'distanceMeters',
    'durationMillis',
    'path',
    'routeLabels',
    'travelAdvisory',
    'localizedValues',
    'description',
  ],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

> **Notice:** Usage of Google Maps Platform APIs may incur charges against your Google Cloud billing account in production and is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
