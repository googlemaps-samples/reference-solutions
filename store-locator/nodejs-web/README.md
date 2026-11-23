# Multi-Branch Store, ATM & Inventory Locator — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `MarkerClusterer`, Places API (New) & Routes API v2)

Split-screen New York City multi-branch retail store, express kiosk, and 24/7 ATM locator built with a typed **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) proxy and a zero-deprecation **Google Maps JavaScript API** web frontend.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (Dynamic Library Import):** Loads `core`, `maps`, `marker`, `places`, and `geometry` on demand via `google.maps.importLibrary(...)` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Markers & Clustering:** Uses [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) with custom DOM pins (`marker.append(...)`) and `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm`) so city-wide NYC views group cleanly and zoomed-in views distinguish **Flagship Stores**, **Express Kiosks**, and **24/7 ATMs**.
- **Places API (New):** Uses server-side proxies for [`places:searchText`](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0), [`places:autocomplete`](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete?utm_campaign=gmp_git_agentsamples_v1.0.0) (with session tokens), and [`places/{placeId}`](https://developers.google.com/maps/documentation/places/web-service/place-details?utm_campaign=gmp_git_agentsamples_v1.0.0), plus an interactive [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) (`gmp-select`) widget on the map.
- **Routes API v2:** Uses server-side proxies for [`computeRouteMatrix`](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0) and [`computeRoutes`](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) across `DRIVE`, `WALK`, and `TRANSIT` modes with explicit `X-Goog-FieldMask` headers.

## Architecture Summary

1. **Backend (`src/server.ts` -> `dist/server.js`):**
   - Strictly binds to `127.0.0.1` and sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
   - Reads `GOOGLE_MAPS_API_KEY` from `.env` (never hardcoded).
   - Exposes `/api/config`, `/api/places/search`, `/api/places/autocomplete`, `/api/places/details`, `/api/routes/matrix`, and `/api/routes/compute`.
2. **Frontend (`public/index.html`, `public/styles.css`, `public/app.js`):**
   - Responsive split-screen layout with a `420px` filterable branch directory on the left and a full-height interactive map (`min-height: 560px`) on the right.
   - Zero `innerHTML` assignments; all dynamic DOM nodes and `InfoWindow` cards are constructed safely via `document.createElement` and `textContent`.

### Core Implementation Snippet (Routes Matrix Proxy)

```ts
const result = await forwardJsonRequest(
  'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
  {
    method: 'POST',
    apiKey,
    fieldMask: 'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues',
    body: {
      origins: [{ waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } }],
      destinations: validatedDestinations.map((d) => ({
        waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
      })),
      travelMode,
      ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      languageCode: 'en-US',
      units: 'IMPERIAL',
    },
  }
);
```

## Setup & Local Verification

### 1. Obtain a Google Maps Platform API Key

**Fast Prototyping (Maps Demo Key — No Billing Required):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (note: daily reset quota, prototyping only).

**Production Key (Google Cloud Console):**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`.

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
