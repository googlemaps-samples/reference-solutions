# Node.js + Express + TypeScript Backend + Interactive Web Frontend — Rideshare Booking, Fare Estimator & Live Driver Tracking (`Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, Routes API v2)

A standalone Los Angeles rideshare passenger booking, eco-friendly route comparison, transparent fare estimation, and live driver-dispatch simulation application built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a zero-deprecation **Google Maps Platform** interactive web frontend.

## Architecture Summary

- **Express + TypeScript BFF (`src/server.ts`)**:
  - Binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, validates all JSON request bodies, and injects `X-Goog-Api-Key` and `X-Goog-FieldMask` server-side.
  - `POST /api/places/search` → Proxies [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (`places.googleapis.com/v1/places:searchText`) to resolve Los Angeles pickup and drop-off locations.
  - `POST /api/routes/compute` → Proxies [Routes API v2 `computeRoutes`](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`routes.googleapis.com/directions/v2:computeRoutes`) with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ["FUEL_EFFICIENT"]`, and `extraComputations: ["FUEL_CONSUMPTION"]` for fastest vs. eco-friendly route comparison and fuel/energy usage.
  - `POST /api/routes/matrix` → Proxies [Routes API v2 `computeRouteMatrix`](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0) (`routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`) to evaluate live ETAs from nearby candidate vehicles and dispatch the closest driver.
- **Interactive Web Frontend (`public/index.html`, `public/app.js`, `public/styles.css`)**:
  - Loads the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/libraries?utm_campaign=gmp_git_agentsamples_v1.0.0) via dynamic library import (`importLibrary`), configuring `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Uses [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) (`gmp-select`) pre-seeded with **Union Station, Los Angeles, CA** and **Santa Monica Pier, Santa Monica, CA**.
  - Renders [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) & `PinElement` pins, dual fastest vs. eco-friendly polylines decoded with the Geometry library (`encoding.decodePath`), transparent **Economy / Comfort / Green** fare breakdowns, and smooth `requestAnimationFrame` driver heading & ETA animation via `spherical.interpolate` and `spherical.computeHeading`.

## Core Implementation Snippet

```typescript
// Server-side Routes API v2 proxy (src/server.ts)
const upstreamBody = {
  origin,
  destination,
  travelMode: 'DRIVE',
  routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
  extraComputations: ['FUEL_CONSUMPTION'],
  requestedReferenceRoutes: ['FUEL_EFFICIENT'],
  routeModifiers: {
    vehicleInfo: { emissionType },
  },
  units: 'IMPERIAL',
  languageCode: 'en-US',
};
```

```javascript
// Client-side PlaceAutocompleteElement & AdvancedMarkerElement (public/app.js)
const autocompleteEl = new PlaceAutocompleteElement({
  locationBias: { center: { lat: 34.0522, lng: -118.2437 }, radius: 50000 },
  includedRegionCodes: ['us'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  placeholder,
});
autocompleteEl.addEventListener('gmp-select', async (event) => {
  const place = event.placePrediction.toPlace();
  await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
});
```

## Setup & Local Development

### 1. Obtain an API Key

- **Fast Prototyping (Zero-Billing Maps Demo Key):**
  1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
  3. Generate and copy your demo key. *(Note: Demo Keys have a daily quota reset and are not for production use.)*
- **Production:**
  1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
  3. Restrict your key by HTTP referrer / server IP and API scope following [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

## Compliance & Terms

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Do not hardcode API keys or bypass server-side field masks.

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
