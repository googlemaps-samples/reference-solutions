# Python FastAPI Backend + Interactive Web Frontend — Multi-Modal Commute Comparator & Trail Elevation Tracker (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `PinElement`, `BicyclingLayer`, Routes API v2, Places API (New), Elevation API)

A standalone, zero-deprecation geospatial web application for comparing multi-modal commute options (**Driving**, **Cycling**, **Walking**, **Transit**) and inspecting interactive route elevation & slope profiles across the Denver–Boulder Front Range corridor.

## Architecture Overview

- **Backend-for-Frontend (`main.py`)**: Async Python FastAPI server using `httpx.AsyncClient`, strict Pydantic v2 payload validation, security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`), and server-side proxies so API requests with `X-Goog-Api-Key` and `X-Goog-FieldMask` never expose raw REST CORS calls in the browser:
  - `POST /api/places/search` &rarr; [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (`places.googleapis.com/v1/places:searchText`)
  - `POST /api/places/autocomplete` &rarr; [Places API (New) Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete?utm_campaign=gmp_git_agentsamples_v1.0.0) (`places.googleapis.com/v1/places:autocomplete`)
  - `POST /api/routes/compute` &rarr; [Routes API v2 `computeRoutes`](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`routes.googleapis.com/directions/v2:computeRoutes`) supporting `DRIVE`, `BICYCLE`, `WALK`, `TRANSIT`, `avoidTolls`, `avoidHighways`, `computeAlternativeRoutes`, and `FUEL_EFFICIENT` eco-friendly routing
  - `POST /api/elevation/profile` &rarr; [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`maps.googleapis.com/maps/api/elevation/json`) returning 64 sampled elevation points along the active route polyline with cumulative gain, loss, min/max altitude, and slope grade %
- **Interactive Frontend (`static/index.html`, `static/app.js`, `static/styles.css`)**:
  - Loads Maps JS via the official Dynamic Library Import bootstrap (`importLibrary("core")`, `"maps"`, `"marker"`, `"places"`, `"geometry"`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - Uses `PlaceAutocompleteElement` listening to `gmp-select` &rarr; `event.placePrediction.toPlace()` &rarr; `place.fetchFields()`
  - Renders `AdvancedMarkerElement` + `PinElement` (direct element appending, zero deprecated `.element` or `.glyph`), interactive `Polyline` alternatives, `BicyclingLayer` for cycling mode, and a bidirectional SVG elevation chart synchronized with a map hover marker
  - Builds all dynamic DOM and SVG nodes safely with `document.createElement` / `createElementNS` and `textContent` (no `innerHTML`)

### Core Backend Snippet (`main.py`)

```python
upstream = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    },
    json=build_compute_routes_body(payload),
)
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card or Google Cloud project required), obtain a **Maps Demo Key**:
1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.

For production deployments, create and restrict an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**, and follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Install Dependencies

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -r requirements.txt
```

### 3. Verify & Run

```bash
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

> **Cost & Terms Notice:** Utilizing Google Maps Platform APIs in production may incur billing charges against your Google Cloud account. Use of this sample is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## All Sample Implementations

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
