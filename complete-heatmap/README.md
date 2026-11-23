# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Geocoding, Elevation, Weather API, deck.gl)

> **Category:** Environmental & Civic Intelligence | **Solution ID:** `complete-heatmap` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

A cohesive civic flood/storm hazard monitoring, incident reporting, and safe-shelter evacuation routing portal centered in Miami, FL (25.7743, -80.1937). Built strictly on modern zero-deprecation Google Maps Platform APIs: interactive 2D vector Google Map (DEMO_MAP_ID, attribution ID gmp_git_agentsamples_v1.0.0) with deck.gl HeatmapLayer via GoogleMapsOverlay (with graceful WebGL2 fallback for headless environments) and active flood-hazard zone polygons. Clicking anywhere on the map drops an AdvancedMarkerElement and enriches a geotagged civic incident report in parallel via reverse geocoding (Geocoder / Geocoding API), terrain elevation (ElevationService / Elevation API), and live wind/precipitation conditions (Weather API v1 currentConditions:lookup), allowing residents to submit reports that dynamically update the heatmap. On load and via 'Find Safe Shelter', Places API (New) searches nearby Miami hospitals and community centers, renders them with PinElement Advanced Markers, and computes a flood-zone-bypass evacuation polyline via Routes API (checking polygon intersection with geometry.poly and injecting a safe perimeter via-waypoint when needed). Client-only stacks (static-vanilla-js, react-vite, sveltekit, vue-vite, angular) use Maps JS importLibrary() wrappers + Weather REST; full-stack frameworks (nextjs, python-fastapi, nodejs-web) route Places, Routes, Geocoding, Elevation, and Weather calls through /api/* BFF proxy endpoints with explicit X-Goog-Api-Key and X-Goog-FieldMask headers.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Elevation API (REST)**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Map renders deck.gl HeatmapLayer and flood-hazard zone polygons cleanly
- Clicking the map populates a civic incident report with reverse-geocoded address, elevation, and live weather
- Nearby emergency shelters/hospitals are fetched and displayed with Advanced Markers
- Evacuation route polyline avoiding the hazard polygon is calculated and drawn on the map
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Geocoding`, `Elevation`, `Weather API`, `deck.gl`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** `deck.gl`
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types,place...` | Proxy Places API (New) Text Search requests to locate nearby hospitals and community centers in Miami without exposing the server API key. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabel...` | Proxy Routes API v2 computeRoutes requests (including via-waypoint flood-polygon bypass detours) with explicit X-Goog-FieldMask cost control. |
| `GET` | `/api/geocode/reverse` | `maps.googleapis.com/maps/api/geocode/json` | None (legacy v3 `GET ?latlng=...&key=`) | Reverse-geocode clicked map coordinates into a human-readable street address in Miami via the Geocoding API. |
| `GET` | `/api/elevation` | `maps.googleapis.com/maps/api/elevation/json` | None (legacy `GET ?path=...&key=`) | Fetch terrain elevation in meters above local mean sea level for clicked incident coordinates via the Elevation API. |
| `GET` | `/api/weather/current` | `weather.googleapis.com/v1/currentConditions:lookup` | Optional (`GET ?key=` or `X-Goog-Api-Key`) | Fetch live wind speed, gust, direction, precipitation probability/QPF, and storm conditions for clicked coordinates via the Weather API. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK + Browser CORS REST | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 5 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Client JS SDK + Browser CORS REST | `PUBLIC_GOOGLE_MAPS_API_KEY` | 0 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client JS SDK + Browser CORS REST | `GOOGLE_MAPS_API_KEY` | 0 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 5 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 5 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
