# Python FastAPI Backend + Interactive Web Frontend — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `RouteMatrix` / `Routes API`, `StreetViewPanorama`, `TerraDraw`)

A Zillow-style split-screen San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer powered by a **Python FastAPI** Backend-for-Frontend (BFF) and a zero-dependency modern ES module web frontend.

## Google Maps Platform Products & Classes Used

- **Maps JavaScript API (`importLibrary('maps')`, `DEMO_MAP_ID`)**: Vector map with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, cadastral parcel `google.maps.Polygon` lot outlines, and roadmap/satellite toggle ([Docs](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Advanced Markers & Clustering (`AdvancedMarkerElement`, `@googlemaps/markerclusterer`)**: Custom HTML price-pill markers synchronized with bidirectional hover/selection states ([Docs](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Places API (New) (`PlaceAutocompleteElement`, `places:searchNearby`, `places:searchText`)**: Top-bar `gmp-select` autocomplete and server-side 5 km nearby schools, groceries, and transit discovery with explicit `X-Goog-FieldMask` headers ([Docs](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Routes API v2 (`distanceMatrix/v2:computeRouteMatrix`, `directions/v2:computeRoutes`)**: Async FastAPI proxy calculating live `DRIVE` (`TRAFFIC_AWARE`) and `TRANSIT` commute ETAs and encoded route polylines ([Docs](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Street View & Geometry (`StreetViewPanorama`, `StreetViewService`, `geometry.poly.containsLocation`)**: Embedded 360° neighborhood preview and point-in-polygon filtering for user-drawn search boundaries ([Docs](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Terra Draw (`terra-draw`, `terra-draw-google-maps-adapter`)**: Interactive "Draw Search Area" polygon filter replacing the deprecated `google.maps.drawing` library ([Docs](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)).

## Architecture Summary

```text
python-fastapi/
├── main.py              # FastAPI server, Pydantic validation, security headers, async httpx GMP BFF
├── data/properties.py   # Curated San Francisco listings with APN metadata & cadastral lot polygons
├── static/
│   ├── index.html       # Split-screen layout + Terra Draw & MarkerClusterer CDN scripts
│   ├── styles.css       # Responsive 440px sidebar + flex-1 map layout (map >= 560px)
│   └── app.js           # Dynamic Maps JS bootstrap, bidirectional markers, Street View, BFF calls
├── requirements.txt     # FastAPI, Uvicorn, httpx, Pydantic, python-dotenv
└── .env.example         # GOOGLE_MAPS_API_KEY configuration guide
```

### Core Implementation Snippet (FastAPI Async BFF Proxy)

```python
@app.post("/api/routes/matrix")
async def routes_matrix(payload: RoutesMatrixRequest) -> JSONResponse:
    body: dict[str, Any] = {
        "origins": [
            {"waypoint": {"location": {"latLng": {"latitude": pt.lat, "longitude": pt.lng}}}}
            for pt in payload.origins
        ],
        "destinations": [
            {"waypoint": {"location": {"latLng": {"latitude": pt.lat, "longitude": pt.lng}}}}
            for pt in payload.destinations
        ],
        "travelMode": payload.travelMode,
        "units": "IMPERIAL",
        "languageCode": "en-US",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
    return await _proxy_gmp_post(ROUTES_MATRIX_URL, ROUTES_MATRIX_FIELD_MASK, body)
```

## Quickstart Setup

### 1. Get a Free Maps Demo Key (Prototyping)

No Google Cloud billing account or project setup is required for initial prototyping:

1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Click to generate and copy your demo key (supports Maps JavaScript API, Places API, Routes API, and Geocoding API; daily usage limits apply, not for production).

For production deployments, create a dedicated key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**, and follow the [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict keys by HTTP referrer / server IP and API scope.

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>
```

### 3. Install, Verify & Run

```bash
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -q -r requirements.txt
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Compliance & Terms

Usage of Google Maps Platform APIs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and regional terms including [EEA Service Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## All Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
