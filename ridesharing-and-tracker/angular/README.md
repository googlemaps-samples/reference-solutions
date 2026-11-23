# Angular Standalone Components + TypeScript (@angular/google-maps): Rideshare Booking, Fare Estimator & Live Driver Tracking (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`)

A standalone Los Angeles rideshare passenger booking, eco-friendly route comparison, transparent fare estimator, and live driver-dispatch simulation web application built with **Angular Standalone Components**, **TypeScript**, and **`@angular/google-maps`** using zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform Stack

- **[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`@googlemaps/js-api-loader` v2 `setOptions` + `importLibrary`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
- **[Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`MapAdvancedMarker` / `AdvancedMarkerElement`) for pickup, drop-off, nearby candidate vehicles, and the smoothly animated dispatched driver marker
- **[Places API (New)](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`PlaceAutocompleteElement` with `gmp-select` + `Place.searchByText`) for pre-seeded and interactive Los Angeles pickup/drop-off selection
- **[Routes API](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`Route.computeRoutes` with `TRAFFIC_AWARE_OPTIMAL`, `FUEL_EFFICIENT`, `FUEL_CONSUMPTION`, and `vehicleInfo.emissionType`) plus `RouteMatrix.computeRouteMatrix` to dispatch the closest driver
- **[Geometry Library](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`spherical.interpolate`, `spherical.computeHeading`, `spherical.computeDistanceBetween`) for smooth marker movement and live ETA updates

## Architecture Summary

1. **Runtime Key Injection (`serve-dist.mjs`):** Reads `GOOGLE_MAPS_API_KEY` from `.env` at runtime and exposes `/env-config.js` (plus optional `/api/routes/compute`, `/api/routes/matrix`, and `/api/places/search` proxy routes) bound strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
2. **Pre-Seeded LA Trip & Route Comparison:** On boot, `RideshareRoutingService` resolves `Union Station, Los Angeles, CA` and `Santa Monica Pier, Santa Monica, CA` via `Place.searchByText`, computes both the fastest (`DEFAULT_ROUTE`) and eco-friendly (`FUEL_EFFICIENT`) routes via `Route.computeRoutes`, and computes fuel/CO₂ savings plus Economy, Comfort, and Green fares.
3. **Closest Driver Dispatch & Smooth Animation:** `RouteMatrix.computeRouteMatrix` ranks nearby simulated Los Angeles candidate drivers by live traffic-aware ETA, computes the pickup approach polyline, and animates the dispatched `MapAdvancedMarker` along pickup and trip polylines with heading rotation and live ETA countdown.

### Core Routing & Eco-Comparison Snippet

```typescript
const response = await Route.computeRoutes({
  origin: pickup,
  destination: dropoff,
  travelMode: 'DRIVING' as google.maps.TravelMode,
  routingPreference: 'TRAFFIC_AWARE_OPTIMAL' as google.maps.routes.RoutingPreference,
  requestedReferenceRoutes: ['FUEL_EFFICIENT' as google.maps.routes.ReferenceRoute],
  extraComputations: ['FUEL_CONSUMPTION' as google.maps.routes.ComputeRoutesExtraComputation],
  routeModifiers: {
    vehicleInfo: { emissionType },
  },
  fields: [
    'distanceMeters',
    'durationMillis',
    'staticDurationMillis',
    'path',
    'routeLabels',
    'travelAdvisory',
    'localizedValues',
  ],
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Fastest Option (Prototyping — No Billing Required):**
1. Open the [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) portal.
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your temporary Demo Key.

**Production Option:**
Create an API key in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**, and apply [API key restrictions](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) (HTTP referrer restrictions + API restrictions).

> **Cost Notice:** Usage of Google Maps Platform products and services in production may incur costs against your Google Cloud billing account. Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200` in your browser.

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
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
