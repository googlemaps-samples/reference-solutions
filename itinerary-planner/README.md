# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Street View, Time Zone)

> **Category:** Travel, Navigation & Itineraries | **Solution ID:** `itinerary-planner` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Shared architecture blueprint for the Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub across all 8 web stacks. Pre-seeds Tokyo on load with live Places API (New) discovery results (attractions, restaurants, hotels), a live Time Zone API destination clock and UTC offset hub, Day 1 and Day 2 itinerary tabs with numbered day-colored AdvancedMarkerElement pins, multi-stop route polylines and waypoint optimization via the Routes API, and an embedded Street View preview panel (StreetViewPanorama + StreetViewService). Pure client stacks use Maps JS importLibrary() (Place, PlaceAutocompleteElement, Route.computeRoutes, AdvancedMarkerElement, StreetViewPanorama) and Time Zone REST with graceful Place.utcOffsetMinutes fallback; full-stack stacks (Next.js, FastAPI, Node.js Express) additionally route Places, Routes, and Time Zone calls through secure 127.0.0.1 BFF proxy endpoints with explicit X-Goog-Api-Key and X-Goog-FieldMask headers.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Time Zone API**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Destination search and multi-day itinerary tabs are visible and pre-seeded with real Tokyo places
- Local time and timezone offset from the Time Zone API are displayed
- Numbered Advanced Markers and multi-stop route polylines render for the selected itinerary day
- Hotel and attraction cards show live Places details with a working Street View preview
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Street View`, `Time Zone`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Search top-rated attractions, restaurants, hotels, and destination landmarks via Places API (New) Text Search with server-side X-Goog-Api-Key and explicit X-Goog-FieldMask. |
| `POST` | `/api/places/nearby` | `places.googleapis.com/v1/places:searchNearby` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Discover nearby hotels, restaurants, and attractions around the active destination or selected landmark via Places API (New) Nearby Search. |
| `GET` | `/api/places/details` | `places.googleapis.com/v1/places/{placeId}` | `X-Goog-Api-Key` + `X-Goog-FieldMask: id,displayName,formattedAddress,location,viewport,rating,userRatingCount,regularOpening...` | Fetch rich Place Details (viewport, opening hours, rating, photos) for a selected Place ID using Places API (New). |
| `GET` | `/api/places/photo` | `places.googleapis.com/v1/{photoName}/media` | N/A (binary image stream; `X-Goog-Api-Key` header) | Resolve and proxy Places API (New) photo media URLs without exposing the server API key in image src attributes. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedI...` | Compute multi-stop day routes, leg durations/distances, encoded polylines, and optional optimizeWaypointOrder stop reordering via Routes API v2. |
| `GET` | `/api/timezone` | `maps.googleapis.com/maps/api/timezone/json` | None (`GET ?location=...&timestamp=...&key=`) | Fetch destination IANA time zone ID, localized time zone name, raw UTC offset, and DST offset from the Time Zone API for live destination clock calculation. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 1 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client + Local Proxy (Vite Middleware) | `VITE_GOOGLE_MAPS_API_KEY` | 1 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 6 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 1 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client + Local Server Proxy (`serve-dist.mjs`) | `GOOGLE_MAPS_API_KEY` | 1 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 6 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 6 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
