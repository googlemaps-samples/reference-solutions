# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `StreetViewPanorama`, `Polygon`, `MarkerClusterer`, `Places API (New)`, `Routes API`)

A Zillow-style San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a zero-deprecation interactive web frontend.

## Features

- **Synchronized Split-Screen Explorer:** Filterable San Francisco property cards (`#property-list`) synchronized bidirectionally on hover and click with custom HTML price-pill `AdvancedMarkerElement` pins and `@googlemaps/markerclusterer` clusters on a vector Google Map (`mapId: 'DEMO_MAP_ID'`).
- **Cadastral Parcel Polygon Outlines:** Selecting a property renders its cadastral lot boundary (`google.maps.Polygon`) alongside parcel APN, zoning, lot size, and HOA metadata.
- **Terra Draw Polygon Search Filter:** Draw a custom neighborhood polygon on the map using `terra-draw` and `terra-draw-google-maps-adapter`, filtering visible listings with `google.maps.geometry.poly.containsLocation`.
- **Roadmap / Satellite Map Toggle:** Switch instantly between vector `roadmap` and `satellite` imagery.
- **Embedded Street View Neighborhood Preview:** Interactive `StreetViewPanorama` viewer checked via `StreetViewService.getPanorama`.
- **5 km Nearby Amenities Discovery:** Live schools, grocery stores, and transit stations within 5 km via the server-side `POST /api/places/nearby` proxy to Places API (New) (`places.googleapis.com/v1/places:searchNearby`) with explicit `X-Goog-FieldMask` headers.
- **Workplace Commute Time Calculator:** Computes live traffic-aware driving (`DRIVE` + `TRAFFIC_AWARE`) and public transit (`TRANSIT`) ETAs via `POST /api/routes/matrix` (`routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`) and previews the commute polyline via `POST /api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes`).

## Quickstart & API Key Setup

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and reveal your Demo Key (supports Maps JavaScript API, Places API, Routes API, and Geocoding API with daily quota limits; not for production).

**Option B — Production Google Cloud Key:**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [API Key Restriction Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your keys by HTTP referrer / server IP and designated APIs.

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

- **`src/server.ts` (`dist/server.js`):** Express 5 + TypeScript server bound strictly to `127.0.0.1`. Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers, validates request payloads, serves local vendor UMD bundles from `node_modules/`, and proxies Places API (New) and Routes API v2 requests with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **`src/listings.ts`:** San Francisco property catalog with parcel metadata and cadastral boundary polygons.
- **`public/index.html`, `public/styles.css`, `public/app.js`:** Responsive split-screen UI loading Google Maps JavaScript libraries dynamically (`google.maps.importLibrary`), configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, and constructing DOM elements exclusively via `document.createElement()` and `textContent` (zero `innerHTML`).

### Core Implementation Snippet (Routes Matrix BFF Proxy & Vector Map Setup)

```ts
// src/server.ts — Server-side Routes API v2 Compute Route Matrix proxy
const { status, data } = await callUpstreamJson(
  'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
  {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues',
  },
  {
    origins: [{ waypoint: originWaypoint }],
    destinations: [{ waypoint: destinationWaypoint }],
    travelMode, // 'DRIVE' (with routingPreference: 'TRAFFIC_AWARE') or 'TRANSIT'
    languageCode: 'en-US',
    units: 'IMPERIAL',
  }
);
```

```js
// public/app.js — Modern Maps JS initialization with attribution & AdvancedMarkerElement
const { Map } = await google.maps.importLibrary('maps');
const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

map = new Map(el.mapContainer, {
  center: { lat: 37.7749, lng: -122.4194 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps JavaScript API Libraries](https://developers.google.com/maps/documentation/javascript/libraries?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Overview](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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
