# Rideshare Booking, Fare Estimator & Live Driver Tracking — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Eco-Routing, Route Matrix)

> **Category:** Logistics, Dispatch & Tracking | **Solution ID:** `ridesharing-and-tracker` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Cross-framework Los Angeles rideshare booking, transparent fare estimation, eco-friendly route comparison, and live driver-dispatch simulation blueprint built exclusively with modern, zero-deprecation Google Maps Platform APIs (Maps JS API, AdvancedMarkerElement, PlaceAutocompleteElement, Place.searchByText, and Routes API v2 with TRAFFIC_AWARE_OPTIMAL, FUEL_EFFICIENT, and FUEL_CONSUMPTION). On initial load, pre-seeded Los Angeles pickup and drop-off locations resolve live via Places API (New), trigger dual fastest vs. eco-friendly route computation, render transparent Economy/Comfort/Green fares and fuel/CO2 savings, dispatch the closest simulated candidate vehicle, and smoothly animate its custom AdvancedMarkerElement along the pickup and trip polylines with live ETA updates.

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Pickup and drop-off Places Autocomplete inputs are present and pre-seeded
- Standard fastest route and Eco-Friendly route polylines and travel metrics are displayed
- Tiered ride fare estimates and eco fuel/energy savings are shown
- Simulated driver Advanced Marker moves smoothly along the route with live ETA
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Eco-Routing`, `Route Matrix`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPoly...` | Computes traffic-aware fastest (DEFAULT_ROUTE) and eco-friendly (FUEL_EFFICIENT) driving routes with FUEL_CONSUMPTION extra computation, plus driver-to-pickup approach polylines. |
| `POST` | `/api/routes/matrix` | `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` | `X-Goog-Api-Key` + `X-Goog-FieldMask: originIndex,destinationIndex,duration,distanceMeters,status,condition` | Evaluates live driving ETA and distance from nearby candidate drivers to the passenger pickup location to dispatch the closest driver. |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location` | Resolves pre-seeded or text-entered Los Angeles pickup and drop-off locations via Places API (New) Text Search on initial load and search fallback. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 3 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client + Local Server Proxy (`serve-dist.mjs`) | `GOOGLE_MAPS_API_KEY` | 3 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 3 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 3 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
