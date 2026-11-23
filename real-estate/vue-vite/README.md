# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)

A Zillow-style split-screen San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer built with **Vue 3**, **Vite**, **TypeScript**, [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0), and native `<gmp-*>` Web Components alongside modern Google Maps Platform classes: **`Map`**, **`AdvancedMarkerElement`**, **`MarkerClusterer`**, **`PlaceAutocompleteElement`** (`<gmp-place-autocomplete>`), **`Place`** (`searchNearby` / `searchByText`), **`AutocompleteSuggestion`**, **`RouteMatrix.computeRouteMatrix`**, **`Route.computeRoutes`**, **`StreetViewPanorama`**, **`Polygon`**, and **Terra Draw**.

## Features

- **Synchronized Split-Screen Explorer:** A `64px` top search & filter bar, a `440px` scrollable left column (property detail drawer + property cards), and a `flex-1` vector Google Map (`mapId: 'DEMO_MAP_ID'`) with bidirectional card/marker hover and selection highlighting.
- **Custom HTML Price-Pill `AdvancedMarkerElement` & Clustering:** Interactive price-pill buttons rendered via `AdvancedMarkerElement` (`marker.append(...)`) and grouped dynamically with `@googlemaps/markerclusterer`.
- **Cadastral Lot/Parcel `Polygon` Outlines:** Selecting or hovering a San Francisco listing renders its parcel footprint (`APN`, lot sq ft, zoning) directly on the vector map, with a **Roadmap / Satellite** toggle.
- **Terra Draw Polygon Search Filter:** Click **Draw Search Area** to sketch a custom neighborhood polygon with `terra-draw` and `terra-draw-google-maps-adapter`, filtering visible listings and map markers using `google.maps.geometry.poly.containsLocation()`.
- **Embedded Street View Preview:** Displays a live 360° `StreetViewPanorama` oriented toward the selected parcel using `StreetViewService.getPanorama` and `geometry.spherical.computeHeading`.
- **5 km Nearby Places Discovery (Places API New):** Tabs for **All**, **Schools**, **Groceries**, and **Transit** powered by `Place.searchNearby` with explicit field masks.
- **Workplace Commute Time Calculator (Routes API):** Computes live **Driving (`TRAFFIC_AWARE`)** and **Public Transit** commute ETAs via `RouteMatrix.computeRouteMatrix`, resolves destinations via `AutocompleteSuggestion` + `Place.searchByText`, and renders the commute polyline via `Route.computeRoutes`.

## Quickstart & API Key Setup

### Option A: Zero-Billing Maps Demo Key (Prototyping)

No Google Cloud billing account or project setup is required to prototype with the Maps Demo Key:

1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and copy your Maps Demo Key.
5. Create `.env.local` in this directory and paste your key:

```bash
cp .env.example .env.local
# Edit .env.local and set:
# VITE_GOOGLE_MAPS_API_KEY=your_demo_or_production_key
```

> **Note:** The Maps Demo Key has a daily reset limit and is intended for prototyping only.

### Option B: Production API Key

1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by **HTTP referrer** and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Run Locally

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with HMR:

```bash
npm run dev
```

## Architecture Summary & Core Implementation

- `vite.config.ts` configures `@vitejs/plugin-vue` with `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-place-autocomplete>` renders natively without Vue component resolution warnings.
- `src/services/mapsLoader.ts` initializes `@googlemaps/js-api-loader` v2 via `setOptions()` and `importLibrary()` (`maps`, `marker`, `places`, `routes`, `streetView`, `geometry`, `geocoding`, `core`).
- `src/components/PropertyMap.vue` manages the vector map (`internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), clustered price-pill `AdvancedMarkerElement` pins, parcel `Polygon` overlays, and Terra Draw polygon search filtering.
- `src/components/ListingDetailPanel.vue` orchestrates `StreetViewPanorama`, `Place.searchNearby`, `AutocompleteSuggestion`, and `RouteMatrix.computeRouteMatrix` / `Route.computeRoutes`.

```ts
// Core loader & RouteMatrix usage (src/services/mapsLoader.ts & src/services/routesService.ts)
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en',
  region: 'US',
  solutionChannel: 'gmp_git_agentsamples_v1.0.0',
});

const { RouteMatrix } = await importLibrary('routes');
const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [property.position],
  destinations: [workplace.location],
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw on Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## All Standalone Real Estate Samples

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
