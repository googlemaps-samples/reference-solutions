# Multi-Modal Commute Comparator & Trail Elevation Tracker — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Polyline`, `BicyclingLayer`, Routes API v2, Places API New, Elevation API)

A standalone, zero-deprecation **Node.js + Express + TypeScript** geospatial application comparing multi-modal commutes and outdoor cycling/walking elevation profiles across the **Denver &harr; Boulder** Front Range corridor.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (Dynamic Library Import)**: `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `AdvancedMarkerElement`, `PinElement`, `Polyline`, `BicyclingLayer`, and `geometry.encoding`.
- **Places API (New)**: Client-side `PlaceAutocompleteElement` (`gmp-select` &rarr; `event.placePrediction.toPlace()` &rarr; `place.fetchFields()`), plus Express BFF proxies to `places.googleapis.com/v1/places:searchText` and `places.googleapis.com/v1/places:autocomplete`.
- **Routes API v2**: Express BFF proxy to `routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` supporting `DRIVE`, `BICYCLE`, `WALK`, `TRANSIT`, alternative routes, `avoidTolls`, `avoidHighways`, `TOLLS` advisory, and `FUEL_EFFICIENT` + `FUEL_CONSUMPTION` eco-friendly routing.
- **Elevation API**: Express BFF proxy to `maps.googleapis.com/maps/api/elevation/json` sampling 64 equidistant points along the active cycling or walking polyline to compute elevation gain/loss, slope grade %, and drive a synchronized interactive SVG chart + map hover marker.

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing account or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted and generate/copy your key.
4. Note: Maps Demo Keys are for prototyping only, carry daily quota limits, and cover core APIs (Maps JS, Places, Routes); the Elevation API may require a standard Google Cloud project key.

#### Option B: Standard Google Cloud Project Key (Production)
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
3. Restrict your key by HTTP referrer / server IP and designated APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

1. **Express TypeScript BFF (`src/server.ts`, `src/gmpClient.ts`, `src/polyline.ts`)**:
   - Binds strictly to `127.0.0.1` and sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
   - Exposes `/api/config`, `/api/places/search`, `/api/places/autocomplete`, `/api/routes/compute`, and `/api/elevation/profile` so browser clients never call `googleapis.com` REST endpoints directly (eliminating CORS failures and keeping REST headers server-side).
   - Downsamples long route polylines before calling the Elevation API so `path=enc:...` never exceeds the 512-vertex limit.
2. **Interactive Web Frontend (`public/index.html`, `public/styles.css`, `public/app.js`)**:
   - Pre-seeds **Denver Union Station, Denver, CO** and **Chautauqua Park, Boulder, CO** via live Places API (New) Text Search on load.
   - Computes all four travel modes (`BICYCLE`, `DRIVE`, `WALK`, `TRANSIT`) on startup, defaults to **Cycling**, surfaces the mandatory beta walking/cycling path advisory, and synchronizes hover scrubbing on the 64-point SVG elevation profile with an `AdvancedMarkerElement` along the route.

### Core Server Proxy Snippet (`src/gmpClient.ts`)

```ts
const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.routeLabels,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo,routes.travelAdvisory.fuelConsumptionMicroliters,routes.warnings,routes.localizedValues',
  },
  body: JSON.stringify(requestBody),
});
```

## Compliance & Terms

- Use of Google Maps Platform is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0). See the [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0) for details.

## Sample Implementations Across Web Stacks

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
