# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Angular Standalone Components + TypeScript (`@angular/google-maps`)

Interactive San Francisco real estate search, cadastral lot-boundary explorer, and neighborhood commute calculator built with **Angular Standalone Components + TypeScript (`@angular/google-maps`)**, [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) (`setOptions` + `importLibrary`), `AdvancedMarkerElement`, [`@googlemaps/markerclusterer`](https://developers.google.com/maps/documentation/javascript/marker-clustering?utm_campaign=gmp_git_agentsamples_v1.0.0), `PlaceAutocompleteElement`, `Place.searchNearby`, `Place.searchByText`, `AutocompleteSuggestion`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, `StreetViewPanorama`, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`).

## Features

- **Synchronized Split-Screen Search**: 64px filter bar (`PlaceAutocompleteElement` neighborhood search, max price, min bedrooms, property type, live count badge) paired with a 440px property list and a full-height vector Google Map (`mapId: 'DEMO_MAP_ID'`).
- **Custom HTML Price-Pill `AdvancedMarkerElement` & Clustering**: Interactive price-tag pills with bidirectional card/marker hover highlighting and `@googlemaps/markerclusterer` (`MapMarkerClusterer`) using custom `AdvancedMarkerElement` cluster badges.
- **Cadastral Parcel Outlines (`google.maps.Polygon`)**: Hovering or selecting a listing renders its San Francisco lot boundary polygon (`MapPolygon`) alongside APN, lot dimensions, lot square footage, and zoning metadata.
- **Terra Draw Polygon Area Filtering**: Draw custom search polygons directly on the map via `TerraDrawGoogleMapsAdapter` and filter visible listings using `google.maps.geometry.poly.containsLocation`.
- **Satellite / Roadmap Toggle**: Switch instantaneously between vector `roadmap` and labeled `hybrid` satellite imagery.
- **Embedded 360° Street View Preview**: Live `StreetViewPanorama` + `StreetViewService` centered on the selected property.
- **5 km Nearby Places Discovery**: Live schools, grocery stores, and transit stations fetched via `Place.searchNearby` (Places API New) with explicit field masks.
- **Workplace Commute Time Calculator**: Live traffic-aware driving and public transit ETAs computed via `RouteMatrix.computeRouteMatrix` and visualized with `Route.computeRoutes` (`MapPolyline`).

## Prerequisites & API Key Setup

> **Cost Notice:** Usage of Google Maps Platform APIs in production may incur costs against your Google Cloud billing account. For prototyping with zero billing setup, start with a free **Maps Demo Key**.

### Option A: Quickstart with a Free Maps Demo Key (Prototyping Only)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted and generate your key.
4. Copy `.env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`:
   ```bash
   cp .env.example .env
   ```
   *(Note: The Maps Demo Key has a daily quota limit and is governed by the Maps Demo Project Terms of Service.)*

### Option B: Production Google Cloud API Key
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Running Locally

```bash
# 1. Install dependencies
npm install --no-audit --no-fund

# 2. Typecheck & syntax-check server
npx tsc --noEmit && node --check serve-dist.mjs

# 3. Build production bundle
npm run build

# 4. Serve production dist with runtime /env-config.js injection (strictly bound to 127.0.0.1)
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200` in your browser.

## Architecture & Core Snippet

- `src/app/services/google-maps.service.ts`: Initializes `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) from runtime `/env-config.js` (`window.__ENV__.GOOGLE_MAPS_API_KEY`) and exposes Places API (New), Routes API (`RouteMatrix` & `Route`), Geometry, and Geocoding helpers.
- `src/app/app.component.ts`: Standalone root component hosting `<google-map>`, `<map-marker-clusterer>`, `<map-advanced-marker>`, `<map-polygon>`, `<map-polyline>`, `PlaceAutocompleteElement`, and `TerraDraw` (`TerraDrawGoogleMapsAdapter`).
- `src/app/components/listing-detail/listing-detail.component.ts`: Selected listing drawer with cadastral metadata, `StreetViewPanorama`, 5 km `Place.searchNearby` tabs, and `RouteMatrix.computeRouteMatrix` workplace commute calculator.
- `serve-dist.mjs`: Loopback-only (`127.0.0.1`) Node HTTP static server with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) and runtime `/env-config.js` injection from `.env`.

```typescript
// Core Maps JS API v2 + RouteMatrix initialization snippet
setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  mapIds: ['DEMO_MAP_ID'],
});

const { RouteMatrix, RoutingPreference } = await importLibrary('routes');
const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [origin],
  destinations: [workplace.location],
  travelMode: 'DRIVING' as google.maps.TravelMode,
  routingPreference: RoutingPreference.TRAFFIC_AWARE,
  fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
});
```

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Documentation & Terms

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Restricting API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
