# Single-Venue Storefront, Booking & Get Directions Hub — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Street View)

> **Category:** Local Discovery & Storefronts | **Solution ID:** `storefront-sample` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Reference architecture for a San Francisco multi-specialty dental clinic storefront, appointment-booking, and get-directions web application across all 8 stacks. Uses Maps JavaScript API (v='weekly', mapId='DEMO_MAP_ID', internalUsageAttributionIds=['gmp_git_agentsamples_v1.0.0']) with AdvancedMarkerElement for custom branded clinic and origin pins, a toggleable 3.5 km Circle service-area overlay for home visits, and a synchronized StreetViewPanorama entrance preview via StreetViewService. Venue details (name, rating, reviews, weekly hours, computed open-now status without beta-only Place.isOpen(), and photos) are fetched live via Places API (New) (Place.searchByText/fetchFields on pure client stacks; /api/places/search & /api/places/photo BFF proxies on Next.js, FastAPI, and Node.js Express). Visitor origin search uses PlaceAutocompleteElement (gmp-select + event.placePrediction.toPlace().fetchFields()) pre-seeded on load with 'Ferry Building, San Francisco, CA' so driving, transit, and walking routes compute immediately via Route.computeRoutes (client stacks) or /api/routes/compute (BFF stacks). Complies with GMP ToS and AUP by keeping all place data live-fetched with attribution and ensuring the booking form handles only non-PHI appointment scheduling metadata.

> **Full Maps Demo Key Support:** Runs end-to-end with a free zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (prototyping only; daily reset limit).

## Verified Capabilities

- Interactive map is visible with a custom clinic Advanced Marker and service-area overlay
- Live venue details and user reviews from Google Places are displayed
- Street View entrance preview toggle or split view is functional
- Origin Places Autocomplete input is present and pre-seeded on load
- Route polyline, travel time, and distance to the venue are displayed for selectable travel modes
- Appointment booking form is visible
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Street View`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Server-side BFF proxy to Places API (New) Text Search to fetch live San Francisco dental clinic details, rating, opening hours, open-now status, user reviews, and photo resource names without exposing the server API key or triggering browser CORS errors. |
| `GET` | `/api/places/photo` | `places.googleapis.com/v1/{name}/media` | N/A (binary image stream; `X-Goog-Api-Key` header) | Server-side BFF proxy to fetch and stream resized clinic photos from Places API (New) Photo Media (e.g., maxWidthPx=640) using the place photo resource name while keeping the API key off client image URLs. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedV...` | Server-side BFF proxy to Routes API v2 computeRoutes for calculating DRIVE, TRANSIT, and WALK routes from the visitor's San Francisco origin to the clinic with travel duration, distanceMeters, localized text, and encoded polyline. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client JS SDK | `GOOGLE_MAPS_API_KEY` | 0 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Client JS SDK | `PUBLIC_GOOGLE_MAPS_API_KEY` | 0 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
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
