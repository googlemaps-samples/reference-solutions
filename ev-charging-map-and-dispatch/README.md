# On-Demand Local Services & EV Roadside Dispatch — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding)

> **Category:** Local Discovery & Storefronts | **Solution ID:** `ev-charging-map-and-dispatch` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Seattle-centered EV fast-charging and roadside auto-service locator & dispatch architecture using strictly modern, non-deprecated Google Maps Platform APIs. On load, the app initializes a 2D vector map centered on Downtown Seattle (47.6062, -122.3321) with mapId="DEMO_MAP_ID" and internalUsageAttributionIds=["gmp_git_agentsamples_v1.0.0"], places a draggable driver breakdown AdvancedMarkerElement with a configurable 5km-15km proximity Circle (default 10km), reverse-geocodes the driver pin via Geocoder, discovers nearby EV charging stations (electric_vehicle_charging_station) and auto repair providers (car_repair) via Places API (New) (including evChargeOptions connector counts/kW and regularOpeningHours), ranks all results by live driving ETA via Routes API RouteMatrix, and draws the selected dispatch route polyline plus turn-by-turn steps via Routes API Route.computeRoutes. Pure client stacks use Maps JS API importLibrary(...) wrappers exclusively; full-stack BFF stacks (Next.js, FastAPI, Node.js Express) additionally route Places/Routes/Geocoding calls through local /api/* endpoints with explicit X-Goog-Api-Key and X-Goog-FieldMask headers.

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Interactive map shows user pin, proximity search ring, and nearby EV/service Advanced Markers
- Address search and draggable or clickable user location with reverse geocoding work
- Sidebar displays real nearby EV charging or auto service details and ratings
- Providers/stations show calculated driving distance and ETA
- Selecting a station or provider draws the route polyline on the map
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Geocoding`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/nearby` | `places.googleapis.com/v1/places:searchNearby` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Server-side BFF proxy for Places API (New) Nearby Search to discover EV charging stations (electric_vehicle_charging_station) and auto repair providers (car_repair) within the driver's 5km-15km search circle. |
| `POST` | `/api/places/search-text` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Server-side BFF proxy for Places API (New) Text Search fallback/query refinement (e.g., EV fast charging or mobile roadside mechanic queries biased to Seattle). |
| `POST` | `/api/routes/matrix` | `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` | `X-Goog-Api-Key` + `X-Goog-FieldMask: originIndex,destinationIndex,status,condition,distanceMeters,duration` | Server-side BFF proxy for Routes API Compute Route Matrix to compute real traffic-aware driving distance and ETA from the driver's breakdown pin to all discovered EV stations and auto repair providers for ETA sorting. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,r...` | Server-side BFF proxy for Routes API Compute Routes to return the encoded dispatch/navigation polyline, total distance/duration, and turn-by-turn maneuver instructions to the selected provider or charging station. |
| `GET` | `/api/geocode/reverse` | `maps.googleapis.com/maps/api/geocode/json` | None (legacy v3 `GET ?latlng=...&key=`) | Server-side BFF proxy for Geocoding API reverse geocoding when the driver drags the breakdown pin or clicks on the map to update their pickup/breakdown address. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 5 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Client JS SDK | `PUBLIC_GOOGLE_MAPS_API_KEY` | 0 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 5 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 5 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
