# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `RouteMatrix`, `Route`, `StreetViewPanorama`)

A 100% standalone, zero-bundler ES modules San Francisco real estate property search, cadastral lot-boundary, and neighborhood commute explorer built with **Static HTML + Vanilla JavaScript** and modern **Google Maps Platform** APIs.

## Architecture Summary

- **Zero-Bundler ES Modules + Import Map:** Native browser ES modules (`index.html`, `app.js`, `styles.css`, `data/listings.js`) resolve `@googlemaps/js-api-loader`, `@googlemaps/markerclusterer`, `terra-draw`, and `terra-draw-google-maps-adapter` directly via `<script type="importmap">`.
- **Loopback Static & Config Server (`server.mjs`):** Binds strictly to `127.0.0.1`, reads `GOOGLE_MAPS_API_KEY` from `.env` or `process.env`, serves `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers, and prevents path traversal and `.env` exposure.
- **Synchronized Split-Screen UI:**
  - **Top 64px Search & Filter Bar:** `PlaceAutocompleteElement` (`gmp-select` event) for San Francisco neighborhoods/addresses, plus max price, minimum bedrooms, property type filters, and a live listing count badge.
  - **Custom HTML Price-Pill `AdvancedMarkerElement` & Clustering:** Interactive HTML price-pill markers managed by `@googlemaps/markerclusterer` with bidirectional hover highlighting between property cards and map pins.
  - **Cadastral Parcel `google.maps.Polygon`:** Selecting any listing renders its lot/parcel polygon outline on the vector map (`mapId: 'DEMO_MAP_ID'`) alongside APN, zoning, and lot area metadata.
  - **Terra Draw Polygon Search Filter:** `TerraDraw` + `TerraDrawGoogleMapsAdapter` lets users draw a custom search polygon on the map and filters visible listings via `google.maps.geometry.poly.containsLocation()`.
  - **Embedded Street View, 5km Amenities & Commute Matrix:** `StreetViewPanorama` + `StreetViewService` orient toward the selected parcel, `Place.searchNearby` discovers schools, grocery stores, and transit stations within 5 km, and `RouteMatrix.computeRouteMatrix` + `Route.computeRoutes` compute live traffic-aware driving and public transit commute ETAs.
- **Security & Zero-Deprecation Compliance:** Zero `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML` usage (uses `document.createElement()`, `textContent`, and `replaceChildren()` exclusively), zero legacy Maps APIs, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` configured on map and service requests.

## Core Implementation Snippet

```js
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: window.__GMP_CONFIG__.apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
});

const [{ Map, Polygon }, { AdvancedMarkerElement }, { Place }, { RouteMatrix }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
  ]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 37.7749, lng: -122.4194 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { places } = await Place.searchNearby({
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating'],
  locationRestriction: { center: { lat: 37.7749, lng: -122.4194 }, radius: 5000 },
  includedPrimaryTypes: ['school', 'supermarket', 'subway_station'],
  maxResultCount: 6,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [{ lat: 37.7929, lng: -122.4381 }],
  destinations: [{ lat: 37.7897, lng: -122.3969 }],
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Prototyping (Maps Demo Key)
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any personal Google account (no billing card or Google Cloud project setup required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your demo key. *(Note: daily quota limits apply; for prototyping only.)*

#### Option B: Production Google Cloud API Key
1. Create a key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and allowed APIs following [Restricting API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Documentation References

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Place Autocomplete Element (New)](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/javascript/route-matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
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
