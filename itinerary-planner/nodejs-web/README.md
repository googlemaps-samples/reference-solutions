# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, Routes API v2, Time Zone API, `StreetViewPanorama`)

An interactive multi-day trip planner, hotel and attraction discovery hub, and live destination time zone explorer powered by a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a modern zero-deprecation **Google Maps Platform** web frontend.

Pre-seeded on load for **Tokyo**, travelers can search any destination city or landmark, browse live top-rated attractions, restaurants, and nearby hotels, organize stops across **Day 1** (Teal `#0F766E`) and **Day 2** (Amber `#D97706`) itinerary tabs, compute and optimize multi-stop routes across Drive, Walk, and Transit modes, track the destination's live local clock and UTC offset, and inspect landmarks or hotels in an embedded **Street View** preview panel.

## Modern Google Maps Platform Products & Classes Used

- **Maps JavaScript API** ([Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)): `Map` (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`), `AdvancedMarkerElement`, `PinElement` (`glyphText`), `Polyline`, `InfoWindow`, `StreetViewPanorama`, `StreetViewService`, and `geometry.encoding.decodePath`.
- **Places API (New)** ([Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)): `PlaceAutocompleteElement` (`gmp-select` event + `placePrediction.toPlace()` + `fetchFields()`), Text Search (`places:searchText`), Nearby Search (`places:searchNearby`), Place Details (`places/{placeId}`), and Place Photos Media (`places/{name}/media`).
- **Routes API v2** ([Documentation](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)): `routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`, per-leg durations/distances, encoded polylines, and `optimizeWaypointOrder`.
- **Time Zone API** ([Documentation](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)): `maps.googleapis.com/maps/api/timezone/json` with automatic `Place.utcOffsetMinutes` fallback when prototyping with a Maps Demo Key.

## Architecture Summary

1. **TypeScript Express BFF (`src/server.ts` → `dist/server.js`)**:
   - Binds strictly to `127.0.0.1` (configurable via `--host 127.0.0.1 --port <port>`).
   - Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy` headers.
   - Validates incoming payloads and proxies Google Maps Platform Web Services using `GOOGLE_MAPS_API_KEY` from `.env` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers:
     - `POST /api/places/search` → `places.googleapis.com/v1/places:searchText`
     - `POST /api/places/nearby` → `places.googleapis.com/v1/places:searchNearby`
     - `GET /api/places/details` → `places.googleapis.com/v1/places/{placeId}`
     - `GET /api/places/photo` → `places.googleapis.com/v1/{photoName}/media`
     - `POST /api/routes/compute` → `routes.googleapis.com/directions/v2:computeRoutes`
     - `GET /api/timezone` → `maps.googleapis.com/maps/api/timezone/json`
2. **Interactive Frontend (`public/index.html`, `public/styles.css`, `public/app.js`)**:
   - Uses the official Dynamic Library Import (`google.maps.importLibrary`) bootstrapper.
   - Builds all dynamic DOM elements safely with `document.createElement()`, `textContent`, and `replaceChildren()` (zero `innerHTML`).

### Core Implementation Snippet (Routes API v2 Proxy with `X-Goog-FieldMask`)

```ts
const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation,routes.viewport',
  },
  body: JSON.stringify(routePayload),
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key. *(Note: The Maps Demo Key has daily reset limits and is for prototyping only. Review the [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for supported APIs.)*

**Option B — Production Google Cloud API Key:**
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**.
3. Restrict your key by HTTP referrer / server IP and designated APIs following [API key security best practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_api_key>
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

> **Cost & Terms Notice:** Utilizing Google Maps Platform APIs in production may incur costs against your Google Cloud billing account. Use of this sample is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## All Stack Samples for `itinerary-planner`

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
