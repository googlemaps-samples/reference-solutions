# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Google Maps Platform Reference (Maps JS 2D, Places (New), Elevation, deck.gl, Terra Draw)

> **Category:** Advanced Spatial Analytics & 3D | **Solution ID:** `spatial-intelligence` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Enterprise Web GIS spatial analytics workbench centered on New York City (40.73061, -73.98661) integrating a 2D/Vector Google Map (mapId: DEMO_MAP_ID, internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']) with a live basemap switcher (roadmap, satellite, hybrid, terrain), a GeoJSON Data Layer rendering NYC infrastructure districts styled by capacity metrics with smooth fitBounds zoom-on-select, a WebGL-accelerated deck.gl GoogleMapsOverlay (ScatterplotLayer and HexagonLayer toggleable for ~2,400 infrastructure sensor points with graceful WebGL2 availability checks so headless environments emit zero console errors), an interactive Terra Draw polygon toolbar (terra-draw + terra-draw-google-maps-adapter) for custom study-zone filtering and point-in-polygon metrics computation, live Elevation API terrain profiling (ElevationService on client-only stacks; /api/elevation BFF proxy on full-stack frameworks), and live Places API (New) civic reference anchors (Place.searchByText / PlaceAutocompleteElement on client-only stacks; /api/places/search BFF proxy on full-stack frameworks) rendered via AdvancedMarkerElement.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Elevation API (REST)**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Map renders GeoJSON district polygons and high-density deck.gl spatial layers
- Basemap type switcher (roadmap, satellite, terrain) is functional
- Terra Draw toolbar allows drawing a custom polygon zone to filter spatial metrics in the sidebar
- Selecting a district zooms/fits the map bounds smoothly and displays zone analytics
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Elevation`, `deck.gl`, `Terra Draw`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `elevation`, `maps`, `marker`, `places`
- **3rd-Party Geo Libraries:** `deck.gl`, `terra-draw`
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/places/search` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types` | Server-side BFF proxy for live NYC civic infrastructure seed query and spatial reference search via Places API (New) with X-Goog-Api-Key and explicit X-Goog-FieldMask, avoiding client-side CORS issues and key exposure. |
| `POST` | `/api/elevation` | `maps.googleapis.com/maps/api/elevation/json` | None (legacy `GET ?path=...&key=`) | Server-side BFF proxy for querying terrain elevation (meters above mean sea level) across Terra Draw polygon vertices, zone centroids, and sampled points via the Elevation API REST endpoint, projecting only elevation, location, resolution, and status. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 2 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 2 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 2 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client + Local Server Proxy (`serve-dist.mjs`) | `GOOGLE_MAPS_API_KEY` | 2 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 2 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 2 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
