# Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers) — Multi-Branch Store, ATM & Inventory Locator (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `MarkerClusterer`, Routes API v2)

A standalone, zero-deprecation split-screen **New York City Multi-Branch Store, Express Kiosk & 24/7 ATM Locator** built with Next.js App Router, TypeScript, `@vis.gl/react-google-maps`, `@googlemaps/markerclusterer`, Places API (New), and Routes API v2.

## Modern Google Maps Platform Stack

- **Interactive Map & Markers**: [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0) via `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<InfoWindow>`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Marker Clustering**: `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm` + custom `AdvancedMarkerElement` cluster renderer) grouping dense NYC branches at city zoom and expanding into custom Flagship Store, Express Kiosk, and 24/7 ATM pins when zoomed in.
- **Location Search & Autocomplete**:
  - Server-proxied [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) Text Search (`places:searchText`), Autocomplete (`places:autocomplete` with `sessionToken`), and Place Details (`places/{placeId}`).
  - Imperatively mounted `PlaceAutocompleteElement` (`gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`), plus [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) fallback.
- **Road Travel Matrix & Route Polylines**: Server-proxied [Routes API v2](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) `computeRouteMatrix` (ranking the **Fastest Nearby** branch across `DRIVE`, `WALK`, and `TRANSIT`) and `computeRoutes` (rendering decoded route polylines with `geometry.encoding.decodePath`).

## Quickstart & API Key Setup

### Option A: Free Zero-Billing Maps Demo Key (Prototyping)

1. Open the [Google Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (supports Maps JavaScript API, Places API, Routes API, and Geocoding API).

### Option B: Production Google Cloud API Key

1. Create and restrict a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Apply HTTP referrer / IP restrictions per the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`.

## Architecture & BFF Route Handlers

All REST calls to `places.googleapis.com` and `routes.googleapis.com` run strictly on the Next.js server via App Router Route Handlers (`src/app/api/*`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers to avoid client-side CORS issues and protect server credentials:

- `POST /api/places/search` → `places.googleapis.com/v1/places:searchText`
- `POST /api/places/autocomplete` → `places.googleapis.com/v1/places:autocomplete`
- `GET /api/places/details` → `places.googleapis.com/v1/places/{placeId}`
- `POST /api/routes/matrix` → `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
- `POST /api/routes/compute` → `routes.googleapis.com/directions/v2:computeRoutes`

### Core Map & Clustering Snippet

```tsx
<GoogleMap
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 40.7549, lng: -73.984 }}
  defaultZoom={12}
  gestureHandling="greedy"
>
  <PlaceAutocompleteWidget onSelectOrigin={handleOriginFromWidget} />
  <ClusteredBranchMarkers
    branches={filteredBranches}
    selectedBranchId={selectedBranchId}
    fastestBranchId={fastestBranchId}
    onSelectBranch={handleSelectBranch}
  />
  <RoutePolyline
    route={activeRoute}
    originLocation={origin.location}
    destinationLocation={selectedBranch?.location ?? null}
  />
</GoogleMap>
```

## Compliance & Terms

- Use of Google Maps Platform is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- All branch names, addresses, coordinates, ratings, and opening hours are retrieved live from Places API (New) at runtime.

## Other Standalone Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
