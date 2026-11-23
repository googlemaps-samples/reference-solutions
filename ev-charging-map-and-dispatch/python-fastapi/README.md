# Python FastAPI Backend + Interactive Web Frontend — On-Demand Local Services & EV Roadside Dispatch (`Map`, `Circle`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Polyline`, Places API (New), Routes API, Geocoding API)

An interactive, Seattle-centered EV fast-charging and roadside auto-service locator & dispatch dashboard built with a **Python FastAPI** Backend-for-Frontend (BFF) and a zero-dependency modern **Maps JavaScript API** frontend.

Drivers can drag or click anywhere on the map—or search via `PlaceAutocompleteElement` (`gmp-select`)—to set their breakdown location, inspect nearby EV charging stations (`electric_vehicle_charging_station`) and auto repair providers (`car_repair`) within a 5 km / 10 km / 15 km search radius, rank options by live traffic-aware driving ETA via **Routes API** (`computeRouteMatrix`), and draw turn-by-turn dispatch polylines (`computeRoutes`).

---

## Quickstart & API Key Setup

### Option 1: Free Maps Demo Key (Zero-Cost Prototyping)

You can prototype immediately without setting up a Google Cloud billing account:

1. Open the [Maps Demo Key generator](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Click to generate/reveal your key and copy it.
4. Create a `.env` file in this directory:

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

> **Note:** The Maps Demo Key has daily quota limits and is intended strictly for prototyping, not production workloads. See the [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).

### Option 2: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) (HTTP referrer restrictions for client Maps JS usage; IP/API restrictions for server-side REST calls).

---

## Install & Run Locally

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

---

## Architecture Summary

- **FastAPI Backend (`main.py`):**
  - Validates all incoming requests with strict Pydantic models and reuses a pooled `httpx.AsyncClient`.
  - Attaches `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` security headers on all responses and binds strictly to `127.0.0.1`.
  - Exposes BFF proxy endpoints so server-side REST requests to Google Maps Platform include `X-Goog-Api-Key` and minimal `X-Goog-FieldMask` headers without browser CORS issues:
    - `GET /api/config` — provides runtime map config (`apiKey`, `mapId: "DEMO_MAP_ID"`, `attributionId: "gmp_git_agentsamples_v1.0.0"`).
    - `POST /api/places/nearby` — proxies [Places API (New) Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search?utm_campaign=gmp_git_agentsamples_v1.0.0).
    - `POST /api/places/search-text` — proxies [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0).
    - `POST /api/routes/matrix` — proxies [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0).
    - `POST /api/routes/compute` — proxies [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0).
    - `GET /api/geocode/reverse` — proxies [Geocoding API Reverse Geocoding](https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Interactive Frontend (`static/index.html`, `static/styles.css`, `static/app.js`):**
  - Loads the [Maps JavaScript API dynamic bootstrap](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) (`importLibrary`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Renders draggable `AdvancedMarkerElement` + `PinElement` pins, a configurable 5 km–15 km `Circle` ring, `PlaceAutocompleteElement` (`gmp-select`), `InfoWindow`, and decoded `Polyline` dispatch routes using safe DOM construction (`document.createElement` + `textContent`, zero `innerHTML`).

### Core Implementation Snippet

```python
# main.py — BFF Routes API Compute Routes proxy with explicit field mask
headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": api_key,
    "X-Goog-FieldMask": (
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
        "routes.viewport,routes.legs.duration,routes.legs.distanceMeters,"
        "routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,"
        "routes.legs.steps.staticDuration"
    ),
}
resp = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    json=payload,
    headers=headers,
)
```

---

## Terms of Service & Related Samples

Use of Google Maps Platform is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and applicable regional terms.

Explore all standalone implementations of this solution:

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
