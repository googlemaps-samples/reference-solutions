# Node.js + Express + TypeScript Backend + Interactive Web Frontend — On-Demand Delivery Checkout, Zone Validation & Live Tracker (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Routes API`, `Address Validation API`, `Maps Static API`)

An end-to-end Chicago restaurant and grocery delivery checkout, zone validation, and live courier tracking web application powered by a TypeScript Node.js + Express Backend-for-Frontend (BFF) and modern Google Maps Platform APIs.

## Modern Google Maps Platform APIs & Classes Used

- **Maps JavaScript API** (`importLibrary('maps')`, `importLibrary('marker')`, `importLibrary('geometry')`, `importLibrary('core')`):
  - `Map` configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` for custom Kitchen Hub, Drop-Off, and animated Courier pins
  - `Polygon` + `google.maps.geometry.poly.containsLocation` for Chicago delivery zone containment
  - `Polyline` + `google.maps.geometry.encoding.decodePath` + `spherical.computeDistanceBetween` for route rendering and smooth `requestAnimationFrame` courier interpolation
- **Places API (New)** (`importLibrary('places')`):
  - `PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`
- **Address Validation API** (`POST /api/address/validate` → `https://addressvalidation.googleapis.com/v1:validateAddress`):
  - Server-side validation returning `result.verdict` (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), `result.address`, `result.geocode`, `result.metadata`, and USPS CASS/DPV `result.uspsData`
- **Routes API v2** (`POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes`):
  - Traffic-aware driving route (`TRAFFIC_AWARE`) with explicit `X-Goog-FieldMask` returning `distanceMeters`, `duration`, `polyline.encodedPolyline`, and turn-by-turn navigation steps, enforcing an 8.0 km road-distance limit and tiered delivery fees (`$2.99` ≤ 3.0 km, `$4.99` ≤ 5.5 km, `$6.99` ≤ 8.0 km)
- **Maps Static API** (`GET /api/maps/static-receipt` → `https://maps.googleapis.com/maps/api/staticmap`):
  - Server-side proxy rendering high-DPI PNG route summary snapshots for the Order Receipt Card without exposing server credentials in client `<img>` URLs

## Architecture Summary

```
Browser (public/index.html, public/app.js, public/styles.css)
  ├── Maps JS API dynamic bootstrap (Maps, Marker, Places, Geometry, Core)
  ├── POST /api/address/validate  ──▶ Express BFF (src/server.ts) ──▶ Address Validation API v1
  ├── POST /api/routes/compute    ──▶ Express BFF (src/server.ts) ──▶ Routes API v2 (computeRoutes)
  └── GET  /api/maps/static-receipt ─▶ Express BFF (src/server.ts) ──▶ Maps Static API (PNG stream)
```

All server endpoints bind strictly to `127.0.0.1`, validate input payloads, strip `X-Powered-By`, and apply `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` security headers.

### Core BFF & Route Proxy Snippet (`src/server.ts`)

```ts
const upstreamResponse = await fetch(
  'https://routes.googleapis.com/directions/v2:computeRoutes',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'en-US',
      units: 'METRIC',
    }),
  }
);
```

## Setup & Local Execution

### 1. Obtain an API Key

For quick zero-billing prototyping, generate a free **Maps Demo Key** (note: prototyping only, daily reset limit, not for production):

1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your key.

For production deployments, create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**, and restrict your key following [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0). Note that production usage of Google Maps Platform APIs may incur charges against your Google Cloud billing account.

### 2. Configure `.env`

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

Then open `http://127.0.0.1:3000` in your browser.

## Related Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

## Documentation & Terms

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
