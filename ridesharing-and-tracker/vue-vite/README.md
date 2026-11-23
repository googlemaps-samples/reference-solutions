# Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements) — Rideshare Booking, Fare Estimator & Live Driver Tracking (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`)

A standalone Los Angeles rideshare booking, transparent fare estimation, eco-friendly route comparison, and live driver-dispatch simulation web app built with **Vue 3**, **Vite**, **TypeScript**, and zero-deprecation Google Maps Platform APIs.

## Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`maps`, `core`, `marker`, `geometry`):**
  - [`Map`](https://developers.google.com/maps/documentation/javascript/reference/map?utm_campaign=gmp_git_agentsamples_v1.0.0) configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) & [`PinElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization?utm_campaign=gmp_git_agentsamples_v1.0.0) for pickup, drop-off, candidate fleet vehicles, and the smoothly animated driver marker
  - [`spherical`](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0) (`computeDistanceBetween`, `computeHeading`, `interpolate`) for heading-aligned driver animation
- **Places API (New) (`places`):**
  - [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) (`<gmp-place-autocomplete>`) listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`
  - [`Place.searchByText`](https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_git_agentsamples_v1.0.0) to resolve pre-seeded Los Angeles pickup (`Union Station, Los Angeles, CA`) and drop-off (`Santa Monica Pier, Santa Monica, CA`) locations live on load
- **Routes API (`routes`):**
  - [`Route.computeRoutes`](https://developers.google.com/maps/documentation/javascript/reference/route?utm_campaign=gmp_git_agentsamples_v1.0.0) with `TRAFFIC_AWARE_OPTIMAL`, `ReferenceRoute.FUEL_EFFICIENT`, `ComputeRoutesExtraComputation.FUEL_CONSUMPTION`, and `vehicleInfo.emissionType` (`GASOLINE`, `HYBRID`, `ELECTRIC`)
  - [`RouteMatrix.computeRouteMatrix`](https://developers.google.com/maps/documentation/javascript/reference/route-matrix?utm_campaign=gmp_git_agentsamples_v1.0.0) to evaluate real driving ETAs from nearby candidate drivers and dispatch the closest vehicle

## Architecture Summary

1. **Zero-Deprecation Client Architecture:** Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) inside Vue 3 Composition API (`src/composables/useRideshareMap.ts`). Vite's Vue plugin (`vite.config.ts`) registers `tag.startsWith('gmp-')` as custom elements so Google Maps Platform Web Components render natively with zero Vue warnings.
2. **Pre-Seeded Live Resolution:** On mount, `Place.searchByText` resolves Union Station and Santa Monica Pier dynamically via Places API (New) — no hardcoded coordinates or synthetic POI data.
3. **Dual Fastest vs. Eco-Friendly Routing & Fare Engine:** `Route.computeRoutes` fetches both `DEFAULT_ROUTE` and `FUEL_EFFICIENT` polylines alongside `travelAdvisory.fuelConsumptionMicroliters`. `src/utils/fares.ts` computes transparent Economy, Comfort, and Green fare breakdowns and fuel/energy/$\text{CO}_2$ savings.
4. **Live Dispatch & Smooth Simulation:** `RouteMatrix.computeRouteMatrix` ranks 4 simulated Los Angeles drivers by real traffic-aware ETA, fetches the closest driver's approach polyline, and animates a heading-rotated `AdvancedMarkerElement` along the approach and trip paths with live ETA countdowns.

### Core Implementation Snippet

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en-US',
  region: 'US',
});

const [{ Map }, { Route, ComputeRoutesExtraComputation, ReferenceRoute, RoutingPreference, TravelMode }] =
  await Promise.all([importLibrary('maps'), importLibrary('routes')]);

const map = new Map(mapContainer, {
  center: { lat: 34.0328, lng: -118.3669 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await Route.computeRoutes({
  origin: pickup.location,
  destination: dropoff.location,
  travelMode: TravelMode.DRIVING,
  routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
  extraComputations: [ComputeRoutesExtraComputation.FUEL_CONSUMPTION],
  requestedReferenceRoutes: [ReferenceRoute.FUEL_EFFICIENT],
  routeModifiers: { vehicleInfo: { emissionType: 'HYBRID' } },
  fields: ['distanceMeters', 'durationMillis', 'path', 'routeLabels', 'travelAdvisory', 'localizedValues'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Development

### 1. Get a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, no billing or Cloud project required):**
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted and generate your key.

**Option B — Google Cloud Project Key (Production):**
1. Create or select a project in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Restrict your API key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Note:** Usage of Google Maps Platform APIs in production may incur costs against your Google Cloud billing account. Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
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
