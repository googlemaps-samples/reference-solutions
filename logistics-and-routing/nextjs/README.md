# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Places API (New)`, `Roads API`, `Routes API`)

A Dallas fleet telematics, road-snapping, and multi-stop dispatch console built with **Next.js App Router + TypeScript**, [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/), and server-side Backend-for-Frontend (BFF) Route Handlers.

## Features

- **Logistics-Focused Dallas Vector Map:** Uses `mapId="DEMO_MAP_ID"` with `clickableIcons={false}` to minimize POI clutter along Dallas highway corridors (I-35E, I-30, US-75), plus an optional `TrafficLayer` toggle.
- **Status-Coded Fleet Telemetry (`AdvancedMarker`):** Displays active vehicles (`En Route`, `Delayed`, `Idle`) with custom status-coded `AdvancedMarker` badges, clickable `InfoWindow` telemetry cards, and instant status filter pills.
- **Raw GPS vs. Roads API Snap to Roads:** Forwards noisy vehicle GPS breadcrumbs to `/api/roads/snap` (`https://roads.googleapis.com/v1/snapToRoads?interpolate=true`), visualizing the dashed raw trace against the solid road-snapped geometry alongside segment Place ID counts and mean snap offset (meters).
- **Live Dallas Hub Discovery & Autocomplete (`Places API (New)`):** Discovers real Dallas distribution centers and logistics hubs on load via `/api/places/search` (`places:searchText`) and lets dispatchers add stops using an imperatively mounted `PlaceAutocompleteElement` (`gmp-select`).
- **Multi-Stop Dispatch & Route Matrix (`Routes API v2`):** Computes multi-stop corridor routes (`/api/routes/compute` with optional `optimizeWaypointOrder`) decoded via `geometry.encoding.decodePath`, plus hub-to-stop ETA & distance matrices (`/api/routes/matrix`).

## Architecture Overview

```text
Browser ('use client')                     Next.js BFF Route Handlers               Google Maps Platform
──────────────────────                     ──────────────────────────               ────────────────────
<APIProvider> + <Map>                  ──► Maps JS API (Vector Map, AdvancedMarker, TrafficLayer, Geometry)
PlaceAutocompleteElement (gmp-select)  ──► Places Widget (Places API New)
POST /api/places/search                ──► src/app/api/places/search/route.ts   ──► places.googleapis.com/v1/places:searchText
POST /api/roads/snap                   ──► src/app/api/roads/snap/route.ts      ──► roads.googleapis.com/v1/snapToRoads
POST /api/routes/compute               ──► src/app/api/routes/compute/route.ts  ──► routes.googleapis.com/directions/v2:computeRoutes
POST /api/routes/matrix                ──► src/app/api/routes/matrix/route.ts   ──► routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
```

### Core Map & Attribution Snippet

```tsx
<APIProvider apiKey={apiKey} language="en" region="US">
  <GoogleMap
    style={{ width: '100%', height: '100%' }}
    mapId="DEMO_MAP_ID"
    internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
    defaultCenter={{ lat: 32.7767, lng: -96.797 }}
    defaultZoom={12}
    gestureHandling="greedy"
    clickableIcons={false}
  >
    <TrafficOverlay enabled={showTraffic} />
    <EncodedRoutePolyline encodedPolyline={dispatchRoute.encodedPolyline} />
  </GoogleMap>
</APIProvider>
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card or Cloud project required), mint a **Maps Demo Key**:

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key.

For production workloads (and full **Roads API Snap to Roads** quota), create and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) with the **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API** enabled. Review [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Note:** Usage of Google Maps Platform APIs in production may incur billing charges under the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (and optionally `GOOGLE_MAPS_API_KEY` for server-only BFF route handlers).

### 3. Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Related Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
