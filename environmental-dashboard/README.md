# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — Google Maps Platform Reference (Maps JS 2D, Places (New), Geocoding, Weather API, Air Quality, Pollen API, Solar API)

> **Category:** Environmental & Civic Intelligence | **Solution ID:** `environmental-dashboard` | **Agent Router:** [`AGENTS.md`](./AGENTS.md) | **Catalog:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../INDEX.md`](../INDEX.md)

Reference architecture for the Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard pre-seeded in Downtown Phoenix (Phoenix City Hall). Uses zero-deprecation Maps JS API v2 (2D Vector Map with mapId='DEMO_MAP_ID', AdvancedMarkerElement, PlaceAutocompleteElement with gmp-select, Place.searchByText, Geocoder for map-click reverse geocoding, and native ImageMapType for WebGL-free AQI heatmap tiles) paired with live Weather, Air Quality, Pollen, and Solar APIs—via direct browser calls on client-only stacks and secure /api/* BFF proxies with X-Goog-Api-Key and X-Goog-FieldMask on full-stack frameworks.

> **Google Cloud Billing Key Required:** Uses APIs not covered by the free Maps Demo Key (**Air Quality API, Pollen API, Solar API**). Enable these APIs on a billed Google Cloud project and restrict your key via [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Verified Capabilities

- Interactive map and Places Autocomplete location search are visible and pre-seeded
- Live Weather API current conditions and forecast metrics are displayed
- Live Air Quality API index/health guidance and Pollen API indicators are rendered
- Solar API rooftop sunshine/panel potential metrics (or graceful non-coverage status) are displayed for the selected building
- No console errors

## Google Maps Platform APIs, JS Libraries & Geo Packages

- **Canonical APIs & Libraries:** `Maps JS 2D`, `Places (New)`, `Geocoding`, `Weather API`, `Air Quality`, `Pollen API`, `Solar API`
- **Maps JS Libraries Used (Union Across Stacks):** `core`, `geocoding`, `maps`, `marker`, `places`
- **3rd-Party Geo Libraries:** None
- **Photorealistic 3D Map (`<gmp-map-3d>`):** No (2D Vector Map with `mapId`)

## Server-Side BFF Proxy Endpoints

| Method | Route | Upstream GMP Service | Header / FieldMask Rule | Purpose |
| :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/weather/current` | `weather.googleapis.com/v1/currentConditions:lookup` | Optional (`GET ?key=` or `X-Goog-Api-Key`) | Proxy current real-time weather conditions from Weather API (currentConditions:lookup) for lat/lng coordinates with X-Goog-Api-Key and unitsSystem support. |
| `GET` | `/api/weather/forecast` | `weather.googleapis.com/v1/forecast/days:lookup` | Optional (`GET ?key=` or `X-Goog-Api-Key`) | Proxy 5-day daily weather forecast from Weather API (forecast/days:lookup) for lat/lng coordinates. |
| `POST` | `/api/air-quality/current` | `airquality.googleapis.com/v1/currentConditions:lookup` | Optional (`POST ?key=` or `X-Goog-Api-Key`) | Proxy current AQI, local/universal indexes, pollutant concentrations, and demographic health recommendations from Air Quality API (currentConditions:lookup). |
| `GET` | `/api/air-quality/tiles` | `airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}` | None (binary PNG tile `GET ?key=`) | Proxy 256x256 PNG Air Quality heatmap tiles (US_AQI / UAQI_RED_GREEN) for the optional ImageMapType map overlay without exposing server API keys. |
| `GET` | `/api/pollen/forecast` | `pollen.googleapis.com/v1/forecast:lookup` | Optional (`GET ?key=` or `X-Goog-Api-Key`) | Proxy 3-to-5-day localized Tree, Grass, and Weed pollen index levels, allergen plant info, and health guidance from Pollen API (forecast:lookup). |
| `GET` | `/api/solar/building-insights` | `solar.googleapis.com/v1/buildingInsights:findClosest` | Optional (`GET ?key=` or `X-Goog-Api-Key`; expect HTTP 404 outside coverage) | Proxy rooftop solar panel capacity, annual sunshine hours, roof area, and carbon offset factor from Solar API (buildingInsights:findClosest), returning a clean 404/non-coverage JSON payload when no building is within 50m. |
| `POST` | `/api/places/search-text` | `places.googleapis.com/v1/places:searchText` | `X-Goog-Api-Key` + `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location` | Server-side Places API (New) Text Search proxy for resolving the initial Phoenix seed_search_query on full-stack stacks with explicit X-Goog-FieldMask. |

## Choose Your Framework (Standalone Implementations)

| Framework | Transport Mode (Code-Detected) | Env Var | BFF Routes | Docs & Code | Screenshot |
| :--- | :--- | :--- | :---: | :--- | :---: |
| [`static-vanilla-js`](./static-vanilla-js/) | Client + Local Server Proxy (`server.mjs`) | `GOOGLE_MAPS_API_KEY` | 8 | [README](./static-vanilla-js/README.md) · [AGENTS](./static-vanilla-js/AGENTS.md) | [PNG](./screenshots/static-vanilla-js.png) |
| [`react-vite`](./react-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./react-vite/README.md) · [AGENTS](./react-vite/AGENTS.md) | [PNG](./screenshots/react-vite.png) |
| [`nextjs`](./nextjs/) | Full-Stack Server BFF | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 7 | [README](./nextjs/README.md) · [AGENTS](./nextjs/AGENTS.md) | [PNG](./screenshots/nextjs.png) |
| [`sveltekit`](./sveltekit/) | Full-Stack Server BFF | `PUBLIC_GOOGLE_MAPS_API_KEY` | 7 | [README](./sveltekit/README.md) · [AGENTS](./sveltekit/AGENTS.md) | [PNG](./screenshots/sveltekit.png) |
| [`vue-vite`](./vue-vite/) | Client JS SDK + Browser CORS REST | `VITE_GOOGLE_MAPS_API_KEY` | 0 | [README](./vue-vite/README.md) · [AGENTS](./vue-vite/AGENTS.md) | [PNG](./screenshots/vue-vite.png) |
| [`angular`](./angular/) | Client + Local Server Proxy (`serve-dist.mjs`) | `GOOGLE_MAPS_API_KEY` | 8 | [README](./angular/README.md) · [AGENTS](./angular/AGENTS.md) | [PNG](./screenshots/angular.png) |
| [`python-fastapi`](./python-fastapi/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 7 | [README](./python-fastapi/README.md) · [AGENTS](./python-fastapi/AGENTS.md) | [PNG](./screenshots/python-fastapi.png) |
| [`nodejs-web`](./nodejs-web/) | Full-Stack Server BFF | `GOOGLE_MAPS_API_KEY` | 8 | [README](./nodejs-web/README.md) · [AGENTS](./nodejs-web/AGENTS.md) | [PNG](./screenshots/nodejs-web.png) |

Full Playwright WebGL & ToS verification matrix: [`verification_report.md`](./verification_report.md).

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping on supported APIs only.)
2. **API Key Restrictions:** Restrict browser keys by HTTP referrer and server BFF keys by IP/API via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (covers Google-sourced snippets only, not the full generated project).
4. **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or train AI/ML models on GMP content.
