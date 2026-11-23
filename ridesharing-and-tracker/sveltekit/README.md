# Rideshare Booking, Fare Estimator & Live Driver Tracking — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)

> **Modern Google Maps Platform Stack:** `google.maps.Map` (`DEMO_MAP_ID`), `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement` (`gmp-select`), `Place.searchByText`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, `geometry.encoding` & `geometry.spherical`, plus server-side **Places API (New)** (`places:searchText`) and **Routes API v2** (`directions/v2:computeRoutes` & `distanceMatrix/v2:computeRouteMatrix`) proxies.

A standalone Los Angeles rideshare passenger booking, eco-friendly route comparison, transparent fare estimator, and live driver-dispatch simulation built with **SvelteKit + TypeScript**, `@googlemaps/js-api-loader` v2, and native Google Maps Platform Web Components.

---

## Key Features

- **Pre-Seeded Los Angeles Trip on Load:** Resolves **Union Station, Los Angeles, CA** → **Santa Monica Pier, Santa Monica, CA** live via `/api/places/search` (`places.googleapis.com/v1/places:searchText`) and mounts `PlaceAutocompleteElement` inputs (`gmp-select`) for interactive editing and swapping.
- **Fastest vs. Eco-Friendly Route Comparison:** Calls `/api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes`) with `TRAFFIC_AWARE_OPTIMAL`, `FUEL_CONSUMPTION`, and `requestedReferenceRoutes: ['FUEL_EFFICIENT']`. Supports switching `vehicleInfo.emissionType` across `HYBRID`, `ELECTRIC`, and `GASOLINE` while calculating fuel/energy and $\text{CO}_2$ savings.
- **Transparent Tiered Fare Estimator:** Calculates live **Economy**, **Comfort**, and **Green** fares from actual route distance and traffic-aware duration, highlighting Green EV/Hybrid savings.
- **Live Driver Matrix Dispatch & Smooth Marker Animation:** Evaluates nearby LA candidate vehicles via `/api/routes/matrix` (`distanceMatrix/v2:computeRouteMatrix`), dispatches the closest driver, and smoothly animates its custom `AdvancedMarkerElement` along the approach and trip polylines using `geometry.spherical` heading & distance interpolation with live ETA updates.

---

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Zero-Billing Prototyping)
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and copy your Demo Key. *(Note: The Demo Key has a daily quota limit and is for prototyping only.)*

#### Option B: Production Google Cloud API Key
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Restrict your key by HTTP referrer (browser) and designate only the required APIs per [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

---

## Architecture & Core Implementation

- **SSR-Safe Dynamic Loading (`src/lib/maps.ts` & `src/routes/+page.svelte`):** All Google Maps browser initialization runs inside Svelte's `onMount` lifecycle using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`. The runtime key is read via `$env/dynamic/public` (`env.PUBLIC_GOOGLE_MAPS_API_KEY`) so builds never bake secrets.
- **SvelteKit Backend-for-Frontend (BFF) Endpoints:**
  - `POST /api/places/search` → [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/routes/compute` → [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) & [Eco-Friendly Routing](https://developers.google.com/maps/documentation/routes/eco-routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/routes/matrix` → [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Resilient Hybrid Fallback:** If an API key is HTTP-referrer restricted on server-side requests, client helpers automatically fall back to `Place.searchByText`, `Route.computeRoutes`, and `RouteMatrix.computeRouteMatrix` from the Maps JS SDK.

```ts
// Core initialization in src/lib/maps.ts & src/routes/+page.svelte
setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  mapIds: ['DEMO_MAP_ID']
});

const [core, maps, marker, places, routes, geometry] = await Promise.all([
  importLibrary('core'),
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('routes'),
  importLibrary('geometry')
]);

const map = new maps.Map(mapContainer, {
  center: { lat: 34.0328, lng: -118.3669 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

---

## Sample Implementations Across Stacks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Compliance & Terms

Usage of Google Maps Platform APIs and SDKs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
