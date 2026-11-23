# Field Workforce Geofenced Attendance & Site Audit Router — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Geocoding, Terra Draw)

> **Category:** Logistics, Dispatch & Tracking | **Solution ID:** `driving-and-geofencing` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Cohesive split-screen Austin field workforce attendance and multi-site store audit planning application across all 8 web frameworks. On load, it initializes a 2D Google Map centered on Austin (30.2672, -97.7431, zoom 12) with mapId="DEMO_MAP_ID" and internalUsageAttributionIds=["gmp_git_agentsamples_v1.0.0"], renders 3 pre-seeded Austin client site geofence polygons, mounts a Terra Draw polygon drawing toolbar (terra-draw + terra-draw-google-maps-adapter) so supervisors can draw/edit new polygon geofence zones, evaluates simulated worker GPS presets (inside vs. outside polygons) via google.maps.geometry.poly.containsLocation to unlock or lock the Verified Clock-In badge, reverse-geocodes the worker's coordinates into a street address via Geocoder (client stacks) or /api/geocode/reverse (BFF stacks), discovers live Austin audit sites via Place.searchByText("retail stores in Austin, TX") or /api/places/search, and computes/renders an optimized multi-stop driving route with numbered AdvancedMarkerElement pins via Route.computeRoutes (optimizeWaypointOrder: true) or /api/routes/compute. Zero deprecated APIs (no google.maps.Marker, PlacesService, DirectionsService, or google.maps.drawing).

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Site geofence polygons and interactive polygon drawing toolbar are visible and functional
- Geofence entry/exit status and clock-in eligibility update accurately when testing inside vs. outside coordinates
- Worker coordinates are reverse-geocoded into a human-readable site address
- Optimized multi-stop driving route polyline and ordered audit stop markers are displayed
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Geocoding`, `Terra Draw`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** `terra-draw`
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.primaryType...` | Server-side Places API (New) Text Search proxy to fetch live Austin audit site candidates on initial load and supervisor searches with explicit X-Goog-Api-Key and X-Goog-FieldMask headers. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes....` | Server-side Routes API v2 computeRoutes proxy with optimizeWaypointOrder=true and TRAFFIC_AWARE routingPreference to compute the optimized multi-stop audit itinerary, leg metrics, and encoded polyline. |
| `GET` | `/api/geocode/reverse` | `geocode.googleapis.com/v4/geocode/location/{lat},{lng}` | Optional (`X-Goog-Api-Key` on Geocoding v4) | Server-side Geocoding API v4 reverse geocoding proxy converting simulated worker lat/lng coordinates into a human-readable Austin street address. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 3 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 3 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
