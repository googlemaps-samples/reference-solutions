# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Route Matrix, Roads API)

> **Category:** Logistics, Dispatch & Tracking | **Solution ID:** `logistics-and-routing` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

A cohesive Dallas fleet telematics, road-snapping, and multi-stop dispatch dashboard built strictly on modern zero-deprecation Google Maps Platform APIs. On load, it initializes a distraction-free vector map (mapId with clickableIcons disabled and optional TrafficLayer), discovers real Dallas logistics hubs via Places API (New), renders status-coded fleet vehicles (En Route, Delayed, Idle) using AdvancedMarkerElement, snaps noisy raw vehicle GPS breadcrumbs to Dallas road corridors via Roads API (snapToRoads), and computes multi-stop dispatch polylines and hub-to-stop ETA/distance matrices via Routes API (Route.computeRoutes / RouteMatrix.computeRouteMatrix on pure client stacks; BFF REST proxies with explicit X-Goog-FieldMask on Next.js, FastAPI, and Node.js Express).

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Roads API**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Map renders with status-coded fleet Advanced Markers and telemetry sidebar
- Raw GPS trace vs. Roads API road-snapped path is visualized on the map
- Multi-stop dispatch route polyline and hub-to-stop ETAs/distances are displayed
- Fleet status filtering (e.g., En Route, Delayed, Idle) works cleanly
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Roads API`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.durat...` | Server-side BFF proxy for calculating multi-stop dispatch corridor routes, leg ETAs, optional waypoint order optimization, and encoded polylines between the Dallas central depot and drop-off hubs. |
| `POST` | `/api/routes/matrix` | `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` | `X-Goog-Api-Key` + `X-Goog-FieldMask: originIndex,destinationIndex,duration,distanceMeters,status,condition` | Server-side BFF proxy for computing travel-time and distance matrices from the central depot (and active vehicles) to all selected Dallas drop-off hubs. |
| `POST` | `/api/roads/snap` | `roads.googleapis.com/v1/snapToRoads` | None (`GET ?path=...&interpolate=true&key=`, max 100 pts) | Server-side BFF proxy forwarding noisy raw GPS breadcrumb coordinates to Roads API Snap to Roads (with interpolate=true and X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0) to return road-snapped path coordinates and road segment Place IDs. |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location` | Server-side BFF proxy for executing live Places API (New) text searches on load to discover real Dallas logistics hubs and drop-off facilities without client-side CORS exposure. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 4 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client + Local Proxy (Vite Middleware) | `VITE_GOOGLE_MAPS_API_KEY` | 1 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 4 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 4 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client + Local Proxy (Vite Middleware) | `VITE_GOOGLE_MAPS_API_KEY` | 1 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client + Local Server Proxy (`serve-dist.mjs`) | `GOOGLE_MAPS_API_KEY` | 4 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 4 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 4 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
