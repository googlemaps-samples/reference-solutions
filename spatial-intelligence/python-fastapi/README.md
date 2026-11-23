# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Python FastAPI Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Places API (New)`, `Elevation API`)

An enterprise Web GIS spatial analytics workbench centered on New York City (`40.73061, -73.98661`), pairing an async **Python FastAPI** Backend-for-Frontend (BFF) proxy with a full-viewport split-screen web client powered by the **Google Maps JavaScript API**, **GeoJSON Data Layer**, **deck.gl `GoogleMapsOverlay`**, **Terra Draw**, **Places API (New)**, and the **Elevation API**.

## Architecture Summary

- **FastAPI BFF (`main.py`)**:
  - Serves the interactive frontend from `static/` (`index.html`, `styles.css`, `app.js`, `nyc-data.js`).
  - Exposes `/api/config` so `GOOGLE_MAPS_API_KEY` is loaded from `.env` at runtime and never hardcoded in client source files.
  - Proxies `POST /api/places/search` to `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and an explicit `X-Goog-FieldMask` (`places.id,places.displayName,places.formattedAddress,places.location,places.types`), avoiding browser CORS restrictions.
  - Proxies `POST /api/elevation` to `https://maps.googleapis.com/maps/api/elevation/json`, validating coordinates with Pydantic and projecting only `elevation`, `location`, `resolution`, and `status`.
  - Adds `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` security headers and binds strictly to `127.0.0.1`.
- **Interactive GIS Frontend (`static/app.js`)**:
  - Uses the Google Maps JS Dynamic Library Import bootstrap (`google.maps.importLibrary`) for `core`, `maps`, `marker`, `places`, and `elevation` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Live basemap switcher (`roadmap`, `satellite`, `hybrid`, `terrain`) and GeoJSON district boundary layer (`map.data.addGeoJson`) styled by grid capacity utilization with smooth `map.fitBounds()` zoom-on-select.
  - WebGL2-checked `deck.gl` `GoogleMapsOverlay` (`ScatterplotLayer` and `HexagonLayer`) visualizing 2,400 infrastructure sensor points with graceful 2D fallback in headless environments.
  - Interactive **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`) polygon drawing & editing toolbar for custom study-zone point-in-polygon filtering, area calculation, and Elevation API terrain profiling.
  - Live `PlaceAutocompleteElement` (`gmp-select` event) and civic reference hubs rendered with `AdvancedMarkerElement` and `PinElement`.

### Core Implementation Snippet

```python
@app.post("/api/places/search")
async def search_places(payload: PlaceSearchRequest) -> JSONResponse:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    }
    async with httpx.AsyncClient(timeout=12.0) as client:
        upstream = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json={"textQuery": payload.textQuery, "maxResultCount": payload.maxResultCount},
            headers=headers,
        )
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Open the [Google Maps Demo Key Console](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key (note: daily quota limits apply; not for production).

**Option B — Production Google Cloud Key:**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Follow [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and designated APIs.

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install & Run

```bash
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Google Maps Platform Documentation

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw on Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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
