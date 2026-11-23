# On-Demand Local Services & EV Roadside Dispatch — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

A Seattle-centered on-demand roadside assistance, auto repair, and EV fast-charging locator & dispatch application built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and strictly modern Google Maps Platform APIs (`AdvancedMarkerElement` via `<AdvancedMarker>`, `PlaceAutocompleteElement`, Places API (New) `places:searchNearby` & `places:searchText`, Routes API `computeRouteMatrix` & `computeRoutes`, and Geocoding API reverse geocoding).

> **Note on Google Maps Platform Usage & Billing:** Using Google Maps Platform services in production may incur costs against your Google Cloud billing account. For zero-cost prototyping, use a free **Maps Demo Key** (no billing account or Cloud project required, subject to daily reset limits and Demo Project Terms). See [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

---

## Architecture Summary

This Next.js App Router implementation combines a responsive React client interface with secure Backend-for-Frontend (BFF) Next.js Route Handlers:

1. **Interactive Seattle Dispatch Map (`src/components/DispatchMap.tsx`)**:
   - Uses `<APIProvider>` and `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` centered on Downtown Seattle (`47.6062, -122.3321`).
   - Renders a **draggable Driver Breakdown `<AdvancedMarker>`** and supports clicking anywhere on the map to relocate the breakdown pin.
   - Renders a dynamic **`google.maps.Circle`** (5 km, 10 km, or 15 km radius), category-colored **`<AdvancedMarker>`** pins for EV fast-charging stations and auto repair providers, an **`<InfoWindow>`** preview, and a **`google.maps.Polyline`** decoded via the `geometry` library (`encoding.decodePath`).
2. **Imperative Places Autocomplete (`src/components/PlaceAutocompleteInput.tsx`)**:
   - Imperatively mounts `PlaceAutocompleteElement` inside a `useRef` container and listens to the modern `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields(...)`), avoiding React Web Component prop stringification traps.
3. **BFF Route Handlers (`src/app/api/.../route.ts`)**:
   - `POST /api/places/nearby` → proxies [`places.googleapis.com/v1/places:searchNearby`](https://developers.google.com/maps/documentation/places/web-service/nearby-search?utm_campaign=gmp_git_agentsamples_v1.0.0) with `X-Goog-FieldMask` (including `places.evChargeOptions` and `places.regularOpeningHours`).
   - `POST /api/places/search-text` → proxies [`places.googleapis.com/v1/places:searchText`](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) for keyword refinement (e.g., CCS fast chargers or tire repair).
   - `POST /api/routes/matrix` → proxies [`routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0) to rank nearby stations and mechanics by live traffic-aware driving ETA.
   - `POST /api/routes/compute` → proxies [`routes.googleapis.com/directions/v2:computeRoutes`](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) to fetch the encoded route polyline and turn-by-turn `navigationInstruction` steps.
   - `GET /api/geocode/reverse` → proxies [Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0) to convert dragged/clicked coordinates into a human-readable Seattle address.

### Core Implementation Snippet

```tsx
<GoogleMap
  id="dispatch-map"
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 47.6062, lng: -122.3321 }}
  defaultZoom={12}
  gestureHandling="greedy"
  clickableIcons={false}
  onClick={handleMapClick}
>
  <AdvancedMarker
    position={driverLocation}
    draggable={true}
    onDragEnd={handleDriverDragEnd}
  />
</GoogleMap>
```

---

## Setup & Local Verification

### 1. Obtain an API Key (Zero-Billing Maps Demo Key Quickstart)

For prototyping without setting up billing:
1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your key.

For production deployments, create and restrict an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**, and follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and set your key:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## Standalone Implementations in This Solution Family

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
