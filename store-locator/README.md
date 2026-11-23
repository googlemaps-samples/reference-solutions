# Multi-Branch Store, ATM & Inventory Locator — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding, MarkerClusterer)

> **Category:** Local Discovery & Storefronts | **Solution ID:** `store-locator` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Split-screen New York City multi-branch store, express kiosk, and 24/7 ATM locator built strictly with modern, zero-deprecation Google Maps Platform APIs. On initial load, the app executes live Places API (New) Text Searches across NYC (Manhattan/Midtown center 40.7549, -73.9840, zoom 12) for real retail storefronts, coffee/food kiosks, and 24/7 ATMs, deterministically classifying each live Place into Flagship Store, Express Kiosk, or 24/7 ATM with inventory/service availability tags (Click & Collect, Express Espresso, Cash Deposit, Open 24h) while preserving live Google Place names, addresses, coordinates, ratings, and regularOpeningHours.weekdayDescriptions (never calling beta-only place.isOpen() on the weekly channel, and never hardcoding fake place data). A default NYC starting origin (e.g., Midtown / Penn Station 40.7506, -73.9935) is initialized immediately so the Routes API Route Matrix (RouteMatrix.computeRouteMatrix via importLibrary('routes') on client-only stacks; /api/routes/matrix on full-stack BFF stacks) computes live road ETAs and distances for all candidate branches on load and ranks the Fastest Nearby branch. Users can search a new starting origin using Places API (New) Autocomplete (AutocompleteSuggestion.fetchAutocompleteSuggestions + AutocompleteSessionToken + Place.fetchFields, with Geocoder fallback), switch travel modes (DRIVE, WALK, TRANSIT), and filter by branch type and service availability. Nearby markers are grouped cleanly at zoom 12 via @googlemaps/markerclusterer (MarkerClusterer + SuperClusterAlgorithm + custom AdvancedMarkerElement cluster renderer) and expand into distinct, custom-styled AdvancedMarkerElements (required mapId: 'DEMO_MAP_ID' and internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']) when zoomed in or when a cluster is clicked. Selecting any branch card, marker, or the 'Route to Fastest' CTA highlights the branch and renders the live route polyline via Route.computeRoutes (createPolylines()) or /api/routes/compute.

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Split-screen sidebar list and interactive map with Marker Clustering are visible
- Custom Advanced Markers distinguish branch types when zoomed in
- Location search input and type/product filter controls are functional
- Road travel distances and ETAs from the user origin are calculated and displayed
- Selecting a branch highlights it and draws the route polyline on the map
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Geocoding`, `MarkerClusterer`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** `@googlemaps/markerclusterer`
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types,place...` | Fetch live NYC candidate flagship stores, express kiosks, and 24/7 ATMs via Places API (New) Text Search on initial load and search refresh. |
| `POST` | `/api/places/autocomplete` | `places.googleapis.com/v1/places:autocomplete` | `X-Goog-Api-Key` + `X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placeP...` | Provide NYC-biased starting location autocomplete predictions via Places API (New) with sessionToken pass-through. |
| `GET` | `/api/places/details` | `places.googleapis.com/v1/places/{placeId}` | `X-Goog-Api-Key` + `X-Goog-FieldMask: id,displayName,formattedAddress,location,regularOpeningHours.weekdayDescriptions,rating...` | Resolve selected Place ID coordinates/address for the origin or fetch live branch opening hours and details. |
| `POST` | `/api/routes/matrix` | `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` | `X-Goog-Api-Key` + `X-Goog-FieldMask: originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues` | Compute live road travel times and distances from the customer origin to all candidate branches to rank and badge the fastest nearby branch. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.durat...` | Compute the optimal route geometry (encodedPolyline), travel duration, and distance from the customer origin to the selected branch. |

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
