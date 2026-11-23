# Hyperlocal Neighborhood Directory & Spot Mapper — Google Maps Platform Reference (Maps JS 2D, Places (New), Geocoding)

> **Category:** Local Discovery & Storefronts | **Solution ID:** `neighborhood-discovery` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Reference architecture for the Hyperlocal Neighborhood Directory & Spot Mapper pre-seeded in Central London (Covent Garden / West End, 51.5118, -0.1280, zoom 13) across all 8 standalone web stacks. On initial load, the app renders a 2D vector Google Map (mapId: "DEMO_MAP_ID", internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]) with a 5km (5000m) radius circle and executes a live Places API (New) Nearby Search across four core categories (restaurant, cafe, museum, park), rendering color-coded AdvancedMarkerElement + PinElement pins and populating the directory sidebar. Users can search addresses or neighborhoods via PlaceAutocompleteElement (<gmp-place-autocomplete>, listening to gmp-select and calling event.placePrediction.toPlace().fetchFields()) or forward Geocoding, filter by category within the 5km radius, inspect live ratings, priceLevel, regularOpeningHours.weekdayDescriptions (avoiding beta-only Place.isOpen() on the weekly channel), and customer reviews in a slide-over details drawer, compare up to 3 places side-by-side, and click anywhere on the map to reverse-geocode human-readable street addresses and coordinates to inspect or pin session-scoped community spots. Pure client stacks (static-vanilla-js, react-vite, sveltekit, vue-vite, angular) call Maps JS importLibrary() classes exclusively (Place.searchNearby, Place.searchByText, Place.fetchFields, PlaceAutocompleteElement, Geocoder) with zero CORS traps; full-stack frameworks (nextjs, python-fastapi, nodejs-web) additionally route Places API (New) and Geocoding REST calls through local /api/... BFF endpoints with explicit X-Goog-Api-Key, X-Goog-FieldMask, X-Content-Type-Options: nosniff, and X-Frame-Options: SAMEORIGIN headers, bound strictly to 127.0.0.1. All stacks strictly enforce zero deprecated APIs (no Marker, PlacesService, Autocomplete, DirectionsService, DistanceMatrixService, HeatmapLayer, drawing, or gmpx-*), no hardcoded API keys, no innerHTML DOM sinks, and no LLM-fabricated place data.

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Map displays categorized custom Advanced Markers for nearby London places on load
- Address/neighborhood search and category filter controls are functional
- Place details and comparison cards display live ratings, hours, and reviews
- Clicking on the map performs reverse geocoding and displays the street address and coordinates
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Geocoding`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `maps`, `marker`, `places`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/nearby` | `places.googleapis.com/v1/places:searchNearby` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.primaryType...` | Server-side BFF proxy for Places API (New) Nearby Search within a 5km (5000m) circular locationRestriction around the active Central London or user-selected neighborhood center, filtered by restaurant, cafe, museum, and park types. |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.primaryType...` | Server-side BFF proxy for Places API (New) Text Search with a 5km circular locationBias for free-text neighborhood/category discovery queries. |
| `GET` | `/api/places/details` | `places.googleapis.com/v1/places/{placeId}` | `X-Goog-Api-Key` + `X-Goog-FieldMask: id,displayName,formattedAddress,location,primaryType,primaryTypeDisplayName,types,ratin...` | Server-side BFF proxy for Places API (New) Place Details (GET /v1/places/{placeId}) retrieving live ratings, userRatingCount, priceLevel, weekly opening hours, customer reviews, and photo references for the details drawer and side-by-side comparison cards. |
| `GET` | `/api/geocode` | `maps.googleapis.com/maps/api/geocode/json` | None (legacy v3 `GET ?latlng=...&key=`) | Server-side BFF proxy for forward geocoding (address/neighborhood string to coordinates) and reverse geocoding (map-click lat,lng to human-readable street address and place_id) without browser CORS exposure. |
| `GET` | `/api/places/photo` | `places.googleapis.com/v1/{name}/media` | N/A (binary image stream; `X-Goog-Api-Key` header) | Server-side proxy streaming Places Photo Media without exposing the API key in browser image URLs. |

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
