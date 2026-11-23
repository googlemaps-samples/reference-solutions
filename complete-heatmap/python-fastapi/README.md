# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Python FastAPI Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PinElement`, `Polygon`, `Polyline`, `deck.HeatmapLayer`, `Places API (New)`, `Routes API v2`, `Geocoding API`, `Elevation API`, `Weather API`)

A standalone, zero-deprecation civic flood/storm hazard monitor, citizen incident reporter, and emergency shelter evacuation router centered in Miami, FL (`25.7743, -80.1937`).

## Architecture Summary

- **FastAPI Backend-for-Frontend (`main.py`)**:
  - Validates all requests with strict **Pydantic v2** schemas and attaches security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
  - Proxies server-side Google Maps Platform REST calls asynchronously via `httpx.AsyncClient` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers:
    - `POST /api/places/search` → [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (`places.googleapis.com/v1/places:searchText`)
    - `POST /api/routes/compute` → [Routes API v2 Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`routes.googleapis.com/directions/v2:computeRoutes`)
    - `GET /api/geocode/reverse` → [Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
    - `GET /api/elevation` → [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
    - `GET /api/weather/current` → [Weather API](https://developers.google.com/maps/documentation/weather/current-conditions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`weather.googleapis.com/v1/currentConditions:lookup`)
  - Serves `GET /api/config`, `GET /api/flood-zones`, `GET/POST /api/incidents`, and the static frontend under `static/`.
- **Interactive Web Frontend (`static/index.html`, `static/app.js`, `static/styles.css`)**:
  - Loads Maps JS dynamically via `google.maps.importLibrary()` (`core`, `maps`, `marker`, `geometry`) using `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Renders a **deck.gl `HeatmapLayer`** via `GoogleMapsOverlay` (with an automatic 2D Canvas `OverlayView` fallback for GPU-less headless environments) alongside active Miami flood-hazard `Polygon` zones.
  - Clicking anywhere on the map drops an `AdvancedMarkerElement` (`PinElement`) and enriches the civic incident report in parallel via reverse geocoding, terrain elevation, and live wind/precipitation conditions.
  - Evaluates evacuation route polylines with `google.maps.geometry.poly.containsLocation()` and injects safe perimeter `via: true` waypoints into `/api/routes/compute` when the direct route intersects an active flood-hazard polygon.

### Core Implementation Snippet

```python
headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": api_key,
    "X-Goog-FieldMask": (
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
        "routes.routeLabels,routes.legs.duration,routes.legs.distanceMeters,"
        "routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters"
    ),
}
resp = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    json=body,
    headers=headers,
)
```

## Setup & Local Execution

### 1. Obtain an API Key (Maps Demo Key Quickstart)

For zero-billing prototyping, generate a free **Maps Demo Key**:

1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and click to generate your key.
4. Copy `.env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`:

```bash
cp .env.example .env
```

> **Production Note:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud billing account. For production deployments (and APIs such as Elevation API or higher quotas), create and restrict your key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0). See [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Install, Check & Run

```bash
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x ^\./?\.venv .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Other Standalone Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
