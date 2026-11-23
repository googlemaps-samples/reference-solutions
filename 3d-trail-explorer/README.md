# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — Google Maps Platform Reference (Maps JS 2D, Photorealistic 3D, Places (New), Elevation)

> **Category:** Advanced Spatial Analytics & 3D | **Solution ID:** `3d-trail-explorer` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Reference architecture for a Photorealistic 3D Lake Tahoe Trail Explorer & Camera Tour application across all 8 web framework stacks. Uses the Maps JavaScript API maps3d library (Map3DElement / <gmp-map-3d> with mode SATELLITE or HYBRID and internalUsageAttributionIds=['gmp_git_agentsamples_v1.0.0']), renders an extruded bright-red 3D hiking trail route (Polyline3DElement with strokeColor: 'rgb(255, 0, 0)', strokeWidth: 8, altitudeMode: 'RELATIVE_TO_GROUND', extruded: true), interactive 3D trailhead and viewpoint markers (Marker3DInteractiveElement with PinElement using glyphText and gmp-click listeners), smooth 3D camera storytelling animations (map3d.flyCameraTo adjusting center, tilt, heading, and range), live Elevation API path sampling for the interactive elevation profile chart and gain/loss metrics (ElevationService.getElevationAlongPath on client stacks; /api/elevation/profile BFF proxy on full-stack stacks), and live Places API (New) landmark search (PlaceAutocompleteElement listening to gmp-select + Place.searchByText for the initial seed search 'Emerald Bay State Park, Lake Tahoe'). Strictly enforces zero deprecated APIs, explicit non-zero map dimensions, and ToS/security compliance.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Elevation API (REST)**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- True Photorealistic 3D map (<gmp-map-3d> / Map3DElement) is rendered
- 3D hiking route polyline is visible in red color RGB(255, 0, 0) with 3D viewpoint markers
- Camera tour preset controls smoothly update 3D camera position, tilt, and heading
- Elevation profile or trail metrics and landmark search are functional
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Photorealistic 3D`, `Places (New)`, `Elevation`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `elevation`, `maps`, `maps3d`, `marker`, `places`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** Yes

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,plac...` | Server-side BFF proxy for Places API (New) Text Search to locate Lake Tahoe landmarks and viewpoints without exposing server keys or hitting browser CORS limits. |
| `POST` | `/api/places/autocomplete` | `places.googleapis.com/v1/places:autocomplete` | `X-Goog-Api-Key` + `X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placeP...` | Server-side BFF proxy for Places API (New) Autocomplete suggestions to support landmark search on full-stack frameworks. |
| `POST` | `/api/elevation/profile` | `maps.googleapis.com/maps/api/elevation/json` | None (legacy `GET ?path=...&key=`) | Server-side BFF proxy to sample equidistant elevation points along the Lake Tahoe hiking trail path and query point elevations for searched landmarks via the Elevation API. |

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
