# Multi-Branch Store, ATM & Inventory Locator — Python FastAPI Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `MarkerClusterer`, Places API (New), Routes API)

A split-screen New York City retail chain locator built with a **Python FastAPI** Backend-for-Frontend (BFF) and a modern, zero-deprecation **Google Maps JavaScript API** frontend. The application discovers live NYC retail storefronts, espresso kiosks, and 24/7 ATMs via **Places API (New)**, groups nearby pins cleanly with **`MarkerClusterer`** + **`AdvancedMarkerElement`**, supports session-tokenized starting-location autocomplete with **Geocoding API** fallback, computes live road ETAs and distances via the **Routes API** Route Matrix, and draws the optimal route polyline to the selected or fastest nearby branch.

---

## Architecture Summary

- **FastAPI Backend-for-Frontend ([`main.py`](main.py)):**
  - Validates all incoming requests with strict Pydantic models and binds strictly to `127.0.0.1`.
  - Adds HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
  - Proxies server-side Google Maps Platform REST calls asynchronously via `httpx.AsyncClient` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask` headers:
    - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText`
    - `POST /api/places/autocomplete` → `https://places.googleapis.com/v1/places:autocomplete`
    - `GET /api/places/details` → `https://places.googleapis.com/v1/places/{placeId}`
    - `POST /api/routes/matrix` → `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
    - `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes`
- **Modern Web Frontend ([`static/index.html`](static/index.html), [`static/app.js`](static/app.js), [`static/styles.css`](static/styles.css)):**
  - Loads Maps JS via the Dynamic Library Import loader (`google.maps.importLibrary` for `core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `geometry`), configured with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Uses `@googlemaps/markerclusterer` (`MarkerClusterer` + `SuperClusterAlgorithm`) with a custom `AdvancedMarkerElement` cluster renderer and distinct custom-styled `AdvancedMarkerElement` pins for **Flagship Store**, **Express Kiosk**, **24/7 ATM**, and **Your Origin**.
  - Renders all dynamic DOM safely using `document.createElement()`, `document.createElementNS()`, and `textContent` (zero `innerHTML`).

### Core Implementation Snippet (FastAPI Route Matrix Proxy)

```python
@app.post("/api/routes/matrix")
async def routes_matrix(payload: RouteMatrixRequest, request: Request) -> Any:
    body: dict[str, Any] = {
        "origins": [
            {"waypoint": {"location": {"latLng": {
                "latitude": payload.origin.latitude,
                "longitude": payload.origin.longitude,
            }}}}
        ],
        "destinations": [
            {"waypoint": {"location": {"latLng": {
                "latitude": dest.latitude,
                "longitude": dest.longitude,
            }}}}
            for dest in payload.destinations
        ],
        "travelMode": payload.travelMode,
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"

    return await proxy_google_request(
        request=request,
        method="POST",
        url="https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
        field_mask="originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues",
        json_body=body,
    )
```

---

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms.
4. Click to generate/reveal your Demo Key.

**Option B — Production Google Cloud API Key:**
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and designated APIs.

### 2. Configure Environment Variable

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Verify & Start the Server

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

---

## Documentation & Compliance Links

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Advanced Markers Overview](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Marker Clustering Guide](https://developers.google.com/maps/documentation/javascript/marker-clustering?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
