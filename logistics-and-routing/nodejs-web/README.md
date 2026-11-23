# Node.js + Express + TypeScript Backend + Interactive Web Frontend — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `computeRoutes`, `computeRouteMatrix`, `snapToRoads`, `places:searchText`)

A standalone, zero-deprecation **Dallas Fleet Telematics, Road-Snapped GPS & Multi-Stop Dispatch Dashboard** built with a **TypeScript + Node.js + Express Backend-for-Frontend (BFF)** and an interactive web frontend using modern Google Maps Platform APIs.

## Features

- **Distraction-Free Vector Logistics Map:** Initializes a Google Vector Map (`mapId: 'DEMO_MAP_ID'`) centered on Dallas (`32.7767, -96.7970`) with `clickableIcons: false`, usage attribution (`internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), and an interactive `TrafficLayer` toggle.
- **Status-Coded Fleet Telemetry (`AdvancedMarkerElement` + `PinElement`):** Displays active Dallas freight and shuttle vehicles (`En Route`, `Delayed`, `Idle`) with live speed, next stop, ETA, status filtering, and DOM-built `InfoWindow` popups.
- **Noisy GPS Breadcrumb Road-Snapping (`Roads API — v1/snapToRoads`):** Visualizes raw noisy GPS traces (dashed red polyline) alongside interpolated road-snapped geometry (solid cyan polyline), reporting point counts, unique road segment Place IDs, and mean snap offset in meters.
- **Live Hub Discovery & Search (`Places API (New)`):** Discovers real Dallas logistics hubs via the BFF `/api/places/search` proxy (`places:searchText` with explicit `X-Goog-FieldMask`) and supports adding drop-off stops interactively via `PlaceAutocompleteElement` (`gmp-select`).
- **Multi-Stop Dispatch & Route Matrix (`Routes API v2`):** Calculates multi-stop corridor routes (with optional `optimizeWaypointOrder`) via `/api/routes/compute` (`computeRoutes`), decodes polylines with `geometry.encoding.decodePath`, and computes depot-to-hub ETAs and distances via `/api/routes/matrix` (`computeRouteMatrix`).

## Prerequisites & API Key Setup

- **Node.js** 20+ and **npm**

### Option A: Quickstart with a Free Maps Demo Key (Prototyping)

1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required for prototyping).
3. Accept the Maps Demo Project Terms and generate/copy your demo key.
4. Copy `.env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`:

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here
```

> **Note:** The Maps Demo Key has daily quota limits and is intended for prototyping only (it supports Maps JavaScript API, Places API (New), and Routes API; see [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0)). To use Roads API (`snapToRoads`) or deploy to production, create an API key in Google Cloud Console.

### Option B: Production Google Cloud API Key

1. Create a key on the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**.
3. Restrict the key by HTTP referrer (for Maps JS), server IP (for backend REST calls), and enabled APIs following [API key restriction best practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API security best practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Install, Build & Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

- **Backend-for-Frontend (`src/server.ts`):** Compiled via `tsc` to `dist/server.js`. Binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, validates request payloads, and proxies Google Maps Platform Web Services with `X-Goog-Api-Key`, explicit `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`:
  - `POST /api/places/search` → [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/roads/snap` → [Roads API Snap to Roads](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/routes/compute` → [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/routes/matrix` → [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Web Frontend (`public/index.html`, `public/styles.css`, `public/app.js`):** Dynamically bootstraps the [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/libraries?utm_campaign=gmp_git_agentsamples_v1.0.0) via `google.maps.importLibrary`, builds all DOM nodes without `innerHTML`, and synchronizes fleet markers, road-snapped traces, and multi-stop dispatch matrices.

### Core Implementation Snippet (`src/server.ts`)

```typescript
const upstreamResp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex',
    'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
  },
  body: JSON.stringify(payload),
});
```

## Related Samples

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

> Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
