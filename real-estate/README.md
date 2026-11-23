# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding, Street View, MarkerClusterer, Terra Draw)

> **Category:** Real Estate & Property Mapping | **Solution ID:** `real-estate` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Zillow-style split-screen San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer across all 8 web stacks. Features synchronized filterable property cards and custom HTML price-pill AdvancedMarkerElement markers with @googlemaps/markerclusterer clustering and bidirectional hover highlighting, cadastral parcel google.maps.Polygon outlines on selected listings, Terra Draw polygon search-area filtering (via google.maps.geometry.poly.containsLocation), roadmap/satellite map type toggle, embedded StreetViewPanorama neighborhood preview, live 5km nearby schools/groceries/transit discovery via Places API (New) searchNearby, and a live Driving + Transit workplace Commute Time Calculator powered by Routes API RouteMatrix.computeRouteMatrix (with server-side BFF proxy routes on Next.js, FastAPI, and Node.js Express). All stacks enforce zero-deprecation APIs, explicit field masks, mapId: 'DEMO_MAP_ID', and internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'].

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Split-screen property list and map with custom HTML price-tag Advanced Markers are synchronized
- Drawing a search polygon filters visible properties or parcel lot boundaries render on selection
- Selected listing panel displays nearby Places amenities (schools/transit) and Street View preview
- Workplace commute calculator computes and displays real driving and transit ETAs
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Geocoding`, `Street View`, `MarkerClusterer`, `Terra Draw`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **3rd-Party Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search-text` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.viewport` | Resolve neighborhood/address searches and workplace destinations via Places API (New) Text Search with explicit X-Goog-Api-Key and X-Goog-FieldMask headers. |
| `POST` | `/api/places/nearby` | `places.googleapis.com/v1/places:searchNearby` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.primaryType...` | Discover nearby schools, grocery stores, and transit stations within a 5km radius of the selected property via Places API (New) Nearby Search. |
| `POST` | `/api/routes/matrix` | `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` | `X-Goog-Api-Key` + `X-Goog-FieldMask: originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues` | Compute real-time driving (TRAFFIC_AWARE) and public transit commute ETAs and distances between the selected property and the workplace destination via Routes API Compute Route Matrix. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedV...` | Compute the encoded commute route polyline between the selected property and workplace destination for optional map overlay preview via Routes API Compute Routes. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 4 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 4 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 4 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 4 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
