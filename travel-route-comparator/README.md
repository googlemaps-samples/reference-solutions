# Multi-Modal Commute Comparator & Trail Elevation Tracker — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Eco-Routing, Elevation)

> **Category:** Travel, Navigation & Itineraries | **Solution ID:** `travel-route-comparator` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Unified zero-deprecation architecture for a Denver-to-Boulder Multi-Modal Commute Comparator & Trail Elevation Tracker across all 8 web stacks. On initial load, the app resolves the seeded endpoints ('Denver Union Station, Denver, CO' and 'Chautauqua Park, Boulder, CO') live via Places API (New) (Place.searchByText on client-only stacks; /api/places/search BFF on full-stack apps), populates origin/destination displays alongside PlaceAutocompleteElement inputs (listening to 'gmp-select' -> event.placePrediction.toPlace() -> place.fetchFields()), and immediately computes live routes across Driving, Cycling, Walking, and Transit using the modern Routes API (Route.computeRoutes on client stacks; /api/routes/compute BFF on Next.js, FastAPI, and Node.js Express). Cycling (BICYCLING) is initialized as the active map & elevation mode on load so that comparative multi-modal ETA/distance cards, color-coded route polylines, AdvancedMarkerElement pins (on mapId='DEMO_MAP_ID' with internalUsageAttributionIds=['gmp_git_agentsamples_v1.0.0']), and the interactive Elevation API profile chart (ElevationService.getElevationAlongPath / /api/elevation/profile with 64 samples) all render immediately on load with zero console errors. Users can switch travel modes, toggle Avoid Tolls, Avoid Highways, and Eco-Friendly (FUEL_EFFICIENT reference route + alternative routes) at any time—recomputing live Routes API responses and updating route comparison cards and polylines—and hover along the SVG elevation & slope profile chart to scrub a synchronized AdvancedMarkerElement indicator along the active route on the map. Walking and cycling routes surface the required beta path advisory, and all stacks strictly forbid legacy Marker, DirectionsService, DistanceMatrixService, Autocomplete, PlacesService, innerHTML, and direct browser fetch() to googleapis.com.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Elevation API (REST)**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Origin/destination inputs, travel mode selector, and route modifier toggles (tolls/highways/eco) are functional
- Route polylines, travel times, and distances render on load via Routes API
- Elevation API profile chart displays elevation gain and syncs with the map
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Eco-Routing`, `Elevation`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `elevation`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location` | Server-side BFF proxy to Places API (New) searchText for resolving seeded and user-entered Denver/Boulder origin and destination places with explicit X-Goog-Api-Key and X-Goog-FieldMask headers. |
| `POST` | `/api/places/autocomplete` | `places.googleapis.com/v1/places:autocomplete` | `X-Goog-Api-Key` + `X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placeP...` | Server-side BFF proxy to Places API (New) autocomplete biased to the Denver-Boulder Front Range corridor, supporting sessionToken and locationBias. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.routeLabels,routes.distanceMeters,routes.duration,routes.staticDuration,routes.p...` | Server-side BFF proxy to Routes API v2 computeRoutes supporting travelMode (DRIVE, BICYCLE, WALK, TRANSIT), routeModifiers (avoidTolls, avoidHighways), computeAlternativeRoutes, and FUEL_EFFICIENT eco-friendly reference routing. |
| `POST` | `/api/elevation/profile` | `maps.googleapis.com/maps/api/elevation/json` | None (legacy `GET ?path=...&key=`) | Server-side BFF proxy to Elevation API to sample equidistant elevation points along the active cycling or walking route polyline for elevation gain, slope grade %, and synchronized hover marker coordinates. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 4 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Client JS SDK | `PUBLIC_GOOGLE_MAPS_API_KEY` | 0 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
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
