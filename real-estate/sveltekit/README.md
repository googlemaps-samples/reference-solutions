# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components: `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `RouteMatrix`, `Route`, `StreetViewPanorama`)

A Zillow-style San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer built with **SvelteKit 3**, **Svelte 5**, **TypeScript**, **`@googlemaps/js-api-loader` v2**, **`@googlemaps/markerclusterer`**, and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`).

## Features & Modern Google Maps Platform APIs

- **Interactive Vector Map (`google.maps.Map`):** Configured with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, plus a **Roadmap / Satellite** map type toggle.
- **Custom HTML Price-Pill `AdvancedMarkerElement` & Clustering:** Synchronized property cards and custom HTML price-pill markers (`marker.append(pillEl)`) with bidirectional hover highlighting and `@googlemaps/markerclusterer` clustering using an `AdvancedMarkerElement` cluster renderer.
- **Cadastral Parcel Polygon Outlines (`google.maps.Polygon`):** Selecting any listing renders its lot/parcel polygon boundary on the map alongside APN, lot square footage, dimensions, zoning, and year built.
- **Terra Draw Search-Area Polygon Filter:** Draw a custom polygon directly on the map (`TerraDraw` + `TerraDrawGoogleMapsAdapter`) and filter visible listings with `google.maps.geometry.poly.containsLocation`.
- **Places Autocomplete (`PlaceAutocompleteElement`):** Native Web Component mounted in `onMount` listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`).
- **Embedded Street View Preview (`StreetViewPanorama` + `StreetViewService`):** Live 360° neighborhood Street View integrated directly into the selected listing drawer.
- **5 km Nearby Amenities (`Place.searchNearby` & `/api/places/nearby`):** Discovers live nearby schools, grocery stores, and transit stations within 5 km via Places API (New) with explicit field masks (`X-Goog-FieldMask`).
- **Workplace Commute Time Calculator (`RouteMatrix.computeRouteMatrix` / `Route.computeRoutes` & `/api/routes/*`):** Computes real-time traffic-aware Driving (`TRAFFIC_AWARE`) and Public Transit ETAs plus route polyline overlay via Routes API v2.

## Quickstart & API Key Setup

### Option A: Zero-Billing Maps Demo Key (Prototyping)

1. Open the [Google Maps Platform Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted and generate your demo key.
4. Copy `.env.example` to `.env` and paste your key:

```bash
cp .env.example .env
```

```env
PUBLIC_GOOGLE_MAPS_API_KEY=your_demo_or_production_key
```

> **Note:** The Maps Demo Key is for low-volume prototyping only, resets daily, and is not for production use.

### Option B: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key by HTTP referrer and designated APIs following the [API Key Restrictions guide](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

## Architecture & Core Snippet

- **SSR-Safe Client Loading:** All Google Maps Platform browser libraries (`maps`, `marker`, `places`, `routes`, `streetView`, `geometry`, `geocoding`) are loaded exclusively inside Svelte's `onMount` lifecycle using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and `$env/dynamic/public` (`env.PUBLIC_GOOGLE_MAPS_API_KEY`).
- **SvelteKit BFF Proxy Routes:** Server routes under `src/routes/api/` (`places/search-text`, `places/nearby`, `routes/matrix`, `routes/compute`) call Google Maps Platform REST endpoints with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers plus `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`. If a browser key is HTTP-referrer restricted, the client transparently falls back to the Maps JS SDK (`Place.searchNearby`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`).

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { env } from '$env/dynamic/public';

setOptions({
  key: env.PUBLIC_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  libraries: ['maps', 'marker', 'places', 'routes', 'streetView', 'geometry', 'geocoding']
});

const [{ Map, Polygon }, { AdvancedMarkerElement }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker')
]);

const map = new Map(mapContainer, {
  center: { lat: 37.7749, lng: -122.4194 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

## Documentation & Compliance

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw Google Maps Example](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
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
