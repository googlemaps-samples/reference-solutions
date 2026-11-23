# On-Demand Delivery Checkout, Zone Validation & Live Tracker — Google Maps Platform Reference (Maps JS 2D, Places (New), Routes API, Geocoding, Address Validation, Maps Static)

> **Category:** Logistics, Dispatch & Tracking | **Solution ID:** `live-order-tracking` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Shared shared architecture for an end-to-end Chicago restaurant and grocery delivery checkout and live order-tracking web app across all 8 stacks. Anchored at a Fulton Market kitchen hub (41.8868, -87.6486) and seeded with a live Chicago customer address (401 N Michigan Ave, Chicago, IL 60611), the app combines Places API (New) PlaceAutocompleteElement (gmp-select + event.placePrediction.toPlace().fetchFields) with Address Validation API deliverability/granularity checks (weekly-safe verdict fields: validationGranularity, geocodeGranularity, addressComplete, hasUnconfirmedComponents, hasInferredComponents, hasReplacedComponents, metadata, and USPS data). It verifies eligibility against both a Chicago delivery zone Polygon (google.maps.geometry.poly.containsLocation) and an 8 km road-distance cap computed via Routes API (Route.computeRoutes on pure-client stacks; /api/routes/compute BFF on Next.js, FastAPI, and Node.js Express), calculates tiered delivery fees ($2.99 <= 3 km, $4.99 <= 5.5 km, $6.99 <= 8 km) and traffic-aware ETA, renders custom AdvancedMarkerElement pins (Kitchen, Customer, and smoothly animated Courier interpolated along the decoded route polyline via requestAnimationFrame), and generates an Order Receipt Card embedding a live Maps Static API route summary image. Zero legacy/deprecated APIs are used, mapId="DEMO_MAP_ID" and internalUsageAttributionIds=["gmp_git_agentsamples_v1.0.0"] are enforced everywhere, and all servers bind strictly to 127.0.0.1 with security headers.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Address Validation API, Maps Static API**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Places Autocomplete and Address Validation API deliverability results are displayed
- Delivery polygon zone, route polyline, delivery fee, and ETA are visible on the map
- Courier Advanced Marker animates smoothly along the computed delivery route
- Order receipt section renders a valid Maps Static API route preview image
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Geocoding`, `Address Validation`, `Maps Static`
- **Maps JS Libraries Used (Union Across Stacks):** `addressValidation`, `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/address/validate` | `addressvalidation.googleapis.com/v1:validateAddress` | Optional (`POST` with `X-Goog-Api-Key`) | Server-side BFF proxy for Address Validation API (v1:validateAddress) returning validationGranularity, geocodeGranularity, addressComplete, standardized address lines, coordinates, Place ID, property metadata, and USPS CASS/DPV deliverability signals with X-Goog-Api-Key kept on the server. |
| `POST` | `/api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | `X-Goog-Api-Key` + `X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps...` | Server-side BFF proxy for Routes API v2 (computeRoutes) calculating traffic-aware driving distanceMeters, duration, encodedPolyline, and turn-by-turn steps between the Chicago kitchen hub and validated drop-off location. |
| `GET` | `/api/maps/static-receipt` | `maps.googleapis.com/maps/api/staticmap` | None (binary PNG `GET ?size=...&key=`) | Server-side BFF proxy for Maps Static API returning PNG route summary map bytes for the order receipt card (kitchen marker, drop-off marker, and encoded route polyline) without exposing the server API key in client HTML image URLs. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 3 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client + Local Proxy (Vite Middleware) | `VITE_GOOGLE_MAPS_API_KEY` | 1 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 3 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
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
