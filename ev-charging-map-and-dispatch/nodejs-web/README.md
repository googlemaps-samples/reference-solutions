# On-Demand Local Services & EV Roadside Dispatch — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `Circle`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Polyline`, `InfoWindow`, Places API (New), Routes API v2, Geocoding API)

An interactive, Seattle-centered EV fast-charging and roadside auto-service locator and dispatch application built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a zero-dependency vanilla web frontend powered strictly by modern, non-deprecated Google Maps Platform APIs.

## Features

- **Draggable Breakdown Pin & Reverse Geocoding:** Centered on Downtown Seattle (`47.6062, -122.3321`), drivers can drag the red `SOS` `AdvancedMarkerElement`, click anywhere on the map, snap to map center, or search via `PlaceAutocompleteElement` (`gmp-select` event) to set their breakdown location. Coordinates are reverse-geocoded via `/api/geocode/reverse`.
- **Configurable Search Ring (5 km – 15 km):** Renders a live `google.maps.Circle` around the driver pin and queries Places API (New) (`places:searchNearby`) through `/api/places/nearby` for `electric_vehicle_charging_station` and `car_repair` providers.
- **Live EV Connector & Open-Status Badges:** Displays EV connector counts, live availability (when returned), and maximum kW charging rates from `evChargeOptions`, alongside ratings, review counts, and opening status from `regularOpeningHours`.
- **Traffic-Aware ETA Ranking & Dispatch Routing:** Ranks all discovered stations and repair shops by live driving ETA using Routes API v2 (`distanceMatrix/v2:computeRouteMatrix` via `/api/routes/matrix`), and draws the dispatch `Polyline` plus turn-by-turn maneuver instructions via Routes API v2 (`directions/v2:computeRoutes` via `/api/routes/compute`).

## Architecture Summary

- **Backend (`src/server.ts` -> `dist/server.js`):**
  - Strictly binds to `127.0.0.1` (never `0.0.0.0`) and sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
  - Exposes typed BFF proxy endpoints (`GET /api/config`, `GET /api/health`, `POST /api/places/nearby`, `POST /api/places/search-text`, `POST /api/routes/matrix`, `POST /api/routes/compute`, `GET /api/geocode/reverse`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **Frontend (`public/index.html`, `public/styles.css`, `public/app.js`):**
  - Loads Maps JS dynamically via `google.maps.importLibrary(...)` (`maps`, `marker`, `places`, `core`, `geometry`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
  - Uses safe DOM construction (`document.createElement`, `textContent`, `replaceChildren`) with zero `innerHTML` assignments.

### Core Implementation Snippet (BFF Routes Proxy & Modern Map Initialization)

```ts
// src/server.ts — Server-side Routes API v2 Compute Routes proxy
const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
  },
  body: JSON.stringify({
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  }),
});
```

```js
// public/app.js — Dynamic Library Import + AdvancedMarkerElement + PlaceAutocompleteElement
const [{ Map }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }] =
  await Promise.all([
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('marker'),
    google.maps.importLibrary('places'),
  ]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 47.6062, lng: -122.3321 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Prototyping with Maps Demo Key (No billing setup required):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Maps Demo Key (covers Maps JavaScript API, Places API, Routes API, and Geocoding API for prototyping).

**Option B — Production Google Cloud API Key:**
1. Create a key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key following [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set:
# GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. Install, Typecheck, Build, and Start

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
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
