# Python FastAPI Backend + Interactive Web Frontend — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (`AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, Routes API, Roads API, Places API (New))

A standalone, zero-deprecation **Dallas Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** built with a **Python FastAPI** Backend-for-Frontend (BFF) and a modern vanilla JavaScript frontend using **Google Maps Platform** APIs.

## Features

- **Distraction-Free Logistics Vector Map:** Initializes a Google Vector Map (`mapId: "DEMO_MAP_ID"`, `clickableIcons: false`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`) centered on Dallas, TX (`32.7767, -96.797`) with an optional `TrafficLayer` toggle.
- **Status-Coded Fleet Telemetry (`AdvancedMarkerElement` + `PinElement`):** Displays active Dallas fleet units (`En Route`, `Delayed`, `Idle`) with synchronized sidebar cards showing speed, next stop, live ETA, and interactive `InfoWindow` popups.
- **Noisy GPS Trace vs. Road-Snapped Geometry (Roads API):** Sends raw vehicle GPS breadcrumbs to `/api/roads/snap` (`https://roads.googleapis.com/v1/snapToRoads?interpolate=true`), comparing the dashed raw trace against the solid road-snapped polyline alongside point counts, unique road segment Place IDs, and mean snap offset.
- **Live Dallas Hub Discovery & Search (`Places API (New)` + `PlaceAutocompleteElement`):** Discovers real Dallas distribution centers on load via `/api/places/search` (`places.googleapis.com/v1/places:searchText`) and allows dispatchers to add stops using `PlaceAutocompleteElement` (`gmp-select` -> `placePrediction.toPlace().fetchFields()`).
- **Multi-Stop Dispatch & Route Matrix (`Routes API v2`):** Computes optimized multi-stop corridor polylines (`/api/routes/compute` -> `routes.googleapis.com/directions/v2:computeRoutes`) decoded via `geometry.encoding.decodePath()`, plus depot-to-hub travel-time/distance matrices (`/api/routes/matrix` -> `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`) with explicit `X-Goog-FieldMask` headers.

## Architecture Summary

```text
Browser (static/index.html, static/app.js, static/styles.css)
  ├── Maps JS SDK (importLibrary: core, maps, marker, places, routes, geometry)
  └── Same-Origin BFF Calls
        ├── GET  /api/config          -> Runtime Map ID & API key bootstrap
        ├── POST /api/places/search   -> Places API (New) text search
        ├── POST /api/roads/snap      -> Roads API v1 snapToRoads
        ├── POST /api/routes/compute  -> Routes API v2 computeRoutes
        └── POST /api/routes/matrix   -> Routes API v2 computeRouteMatrix
```

### Core Backend Proxy Snippet (`main.py`)

```python
@app.post("/api/routes/compute")
async def compute_routes(body: ComputeRoutesRequest, request: Request) -> JSONResponse:
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    field_mask = (
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
        "routes.legs.duration,routes.legs.distanceMeters,"
        "routes.legs.startLocation,routes.legs.endLocation,"
        "routes.optimizedIntermediateWaypointIndex"
    )
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
        "X-Goog-Maps-Solution-ID": "gmp_git_agentsamples_v1.0.0",
    }
    ...
```

## Setup & Local Execution

### 1. Obtain a Google Maps Platform API Key

**Prototyping (Zero Billing / No Cloud Project Required):**
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your temporary Demo Key (see [Maps Demo Key Docs](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0)).

**Production:**
- Create a restricted key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**.
- Follow [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x ^\./?\.venv .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Documentation References

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Place Autocomplete Element](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes & Matrix](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Roads API Snap to Roads](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/) *(current implementation)*
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
