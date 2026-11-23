# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — Angular Standalone Components + TypeScript (`@angular/google-maps`) with `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `StreetViewPanorama`, and Time Zone API

An interactive, zero-deprecation multi-day city trip planner pre-seeded for **Tokyo** using Angular Standalone Components, `@angular/google-maps`, `@googlemaps/js-api-loader` v2, Places API (New), Routes API, Time Zone API, and embedded Street View.

## Features

- **Live Destination Search & Quick Presets:** Uses [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/reference/places-widget?utm_campaign=gmp_git_agentsamples_v1.0.0#PlaceAutocompleteElement) (`gmp-select` + `event.placePrediction.toPlace()`) alongside a quick-switch selector (Tokyo, Kyoto, London, Paris, New York, Sydney).
- **Places API (New) Discovery:** Fetches live attractions (`Place.searchByText`), restaurants (`Place.searchNearby`), and hotels (`Place.searchNearby`) with live photos (`photo.getURI()`), ratings, review counts, and opening hours (`regularOpeningHours.weekdayDescriptions`).
- **Multi-Day Itinerary Tabs & Waypoint Optimization:** Organize stops into **Day 1** (`#0F766E`) and **Day 2** (`#D97706`), switch travel modes (`DRIVE`, `WALK`, `TRANSIT`), reorder stops, and optimize intermediate stop order via [`Route.computeRoutes`](https://developers.google.com/maps/documentation/javascript/reference/route?utm_campaign=gmp_git_agentsamples_v1.0.0#Route.computeRoutes) with `optimizeWaypointOrder`.
- **Time Zone Hub:** Displays live local destination time, time zone name, and UTC offset from the [Time Zone API](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (proxied through `/api/timezone` in `serve-dist.mjs`, with graceful fallback to `Place.utcOffsetMinutes`).
- **Interactive Map & Docked Street View:** Renders numbered day-colored `AdvancedMarkerElement` pins (`PinElement` with `glyphText`), active-day route polylines via `<map-polyline>`, and a live [`StreetViewPanorama`](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0) preview panel powered by `StreetViewService.getPanorama`.

## Architecture & Core Snippet

- **Dynamic API Bootstrap (`src/app/services/google-maps-loader.service.ts`):** Reads the runtime key injected by `/env-config.js` (never hardcoded in source) and calls `setOptions()` + `importLibrary()` before mounting `<google-map>`.
- **Runtime Server (`serve-dist.mjs`):** Binds strictly to `127.0.0.1`, serves Angular's compiled `dist/itinerary-planner/browser` bundle, exposes `/env-config.js` from `.env`, proxies `/api/timezone` safely, and sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

```ts
// Core Routes API v2 multi-stop computation via Maps JS SDK
const { Route } = await importLibrary('routes');
const { routes } = await Route.computeRoutes({
  origin: stops[0].location,
  destination: stops[stops.length - 1].location,
  intermediates: stops.slice(1, -1).map((s) => ({ location: s.location })),
  travelMode: 'DRIVING',
  optimizeWaypointOrder: true,
  fields: [
    'path',
    'distanceMeters',
    'durationMillis',
    'legs',
    'localizedValues',
    'optimizedIntermediateWaypointIndices',
  ],
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
1. Open [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms (no billing card required).
3. Generate and copy your demo key.

**Option B — Production API Key:**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Time Zone API**, and **Street View**.
3. Restrict the key by HTTP referrer and designated APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_api_key>
```

### 3. Install, Typecheck, Build, and Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173`.

> **Cost & Terms Notice:** Usage of Google Maps Platform APIs in production may incur charges against your Google Cloud billing account and is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
