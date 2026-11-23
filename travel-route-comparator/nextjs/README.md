# Multi-Modal Commute Comparator & Trail Elevation Tracker — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, Routes API v2, Elevation API)

An interactive Denver–Boulder corridor commute comparator and outdoor cycling/walking elevation tracker built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and **Next.js Route Handler BFF proxies** for modern Google Maps Platform web services.

## Google Maps Platform Products & Classes Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`)**: `<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, `<Pin glyphText="..." />`, `google.maps.Polyline`, and `google.maps.BicyclingLayer` ([Maps JS API Docs](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Places API (New)**: Imperatively mounted `PlaceAutocompleteElement` (`gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields()`), plus `/api/places/search` (`places:searchText`) and `/api/places/autocomplete` (`places:autocomplete`) server-side Route Handlers ([Places API New Docs](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Routes API v2**: `/api/routes/compute` server-side Route Handler calling `routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask` across `DRIVE`, `BICYCLE`, `WALK`, and `TRANSIT`, supporting alternative routes, `avoidTolls`, `avoidHighways`, `TOLLS` advisory, and `FUEL_EFFICIENT` eco-friendly reference routing ([Routes API Docs](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Elevation API**: `/api/elevation/profile` server-side Route Handler querying `maps.googleapis.com/maps/api/elevation/json` for 64 equidistant samples along the active route polyline (with client-side `ElevationService.getElevationAlongPath` fallback) to compute cumulative gain, slope grade %, and synchronize an `<AdvancedMarker>` hover indicator with the SVG elevation chart ([Elevation API Docs](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).

## Quickstart & API Key Setup

### Option A: Zero-Billing Prototyping with Maps Demo Key

1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted and generate your Demo Key.
4. Copy `.env.example` to `.env.local` and set your key:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_copied_demo_key
   ```
   *(Note: The Maps Demo Key has a daily quota limit and is intended for prototyping only.)*

### Option B: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
3. Follow [Restricting an API Key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict keys by HTTP referrer / server IP and target APIs.
4. Optionally configure a separate server-only `GOOGLE_MAPS_API_KEY` in `.env.local` for the Next.js Route Handlers (if omitted, Route Handlers fall back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).

> **Billing Notice:** Using Google Maps Platform APIs in production may incur charges against your Google Cloud billing account. Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

## Architecture Summary & Core Implementation

The Next.js App Router serves a Server Component entry ([`src/app/page.tsx`](src/app/page.tsx)) that passes the configured key into the client workspace ([`src/components/TravelComparatorApp.tsx`](src/components/TravelComparatorApp.tsx)), while four Route Handlers under `src/app/api/` act as a secure Backend-for-Frontend (BFF) so CORS-restricted REST calls never happen from the browser:

- `POST /api/places/search` — resolves seeded and text-searched Denver/Boulder locations via `places:searchText`.
- `POST /api/places/autocomplete` — proxies `places:autocomplete` biased to the Front Range corridor.
- `POST /api/routes/compute` — proxies Routes API v2 `computeRoutes` with `X-Goog-FieldMask`, modifiers, and `FUEL_EFFICIENT` eco-friendly routing.
- `POST /api/elevation/profile` — downsamples long polylines safely below the 512-point limit and queries the Elevation API for 64 samples.

```tsx
// Core Map & Synchronized AdvancedMarker + PlaceAutocompleteElement pattern
<Map
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 39.884, lng: -105.135 }}
  defaultZoom={11}
  gestureHandling="greedy"
>
  <AdvancedMarker position={origin.location}>
    <Pin background="#0f766e" borderColor="#ffffff" glyphColor="#ffffff" glyphText="A" />
  </AdvancedMarker>
  <AdvancedMarker position={destination.location}>
    <Pin background="#dc2626" borderColor="#ffffff" glyphColor="#ffffff" glyphText="B" />
  </AdvancedMarker>
  {hoveredPoint && (
    <AdvancedMarker position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }} />
  )}
</Map>
```

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
