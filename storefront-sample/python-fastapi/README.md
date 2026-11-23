# Single-Venue Storefront, Booking & Get Directions Hub — Python FastAPI Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `StreetViewPanorama`, Places API (New), Routes API v2)

A production-oriented, standalone **Python FastAPI** Backend-for-Frontend (BFF) and modern interactive web application for a multi-specialty dental clinic in San Francisco (**450 Sutter Dental Specialists**).

## Key Features

- **Interactive 2D Google Map (`Map`, `AdvancedMarkerElement`, `Circle`, `Polyline`):** Centered on the clinic with a custom DOM-rendered clinic pin, a toggleable **3.5 km** home-visit service-area radius overlay, and live origin/route rendering (`v=weekly`, `mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`).
- **Synchronized Street View Entrance Preview (`StreetViewService`, `StreetViewPanorama`, `geometry.spherical.computeHeading`):** Queries outdoor street-level imagery near the clinic and automatically orients the camera heading toward the building entrance, with **Map / Split / Street View** toggle controls.
- **Live Storefront Details via Places API (New) BFF (`POST /api/places/search`, `GET /api/places/photo`):** Fetches live clinic address, phone number, website, star rating, review count, weekly opening hours, computed open-now status, Google Maps attribution link, user reviews, and proxied photos without exposing the server API key in `<img src>` URLs.
- **Visitor Origin Autocomplete & Multi-Modal Directions (`PlaceAutocompleteElement`, `POST /api/routes/compute`):** Pre-seeded with `Ferry Building, San Francisco, CA` on load and wired to `gmp-select` (`event.placePrediction.toPlace().fetchFields()`) plus **Driving (`DRIVE`)**, **Transit (`TRANSIT`)**, and **Walking (`WALK`)** route calculation via Routes API v2.
- **Non-PHI Appointment Booking (`POST /api/bookings`):** Collects scheduling metadata only (specialty, In-Clinic vs. Home Visit, preferred date/time, and contact details) with Pydantic validation and instant confirmation.

## Setup & Maps Demo Key Quickstart

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card or Cloud project required), generate a **Maps Demo Key**:

1. Open [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Copy your generated key. (Note: the Demo Key has daily quota limits and is intended only for prototyping.)

For production deployments, create a key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**, and apply [API key restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

## Architecture Summary

- **`main.py`:** Async FastAPI server (`httpx.AsyncClient` + Pydantic v2 models) bound to `127.0.0.1` with security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`). Proxies `places.googleapis.com/v1/places:searchText`, `places.googleapis.com/v1/{name}/media`, and `routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **`static/app.js`:** Loads Maps JavaScript API (`v=weekly`) via the [Dynamic Library Import](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) bootstrap, initializes `Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, and `StreetViewPanorama`, and builds all DOM nodes via `document.createElement` and `textContent` (zero `innerHTML`).

### Core Implementation Snippet (FastAPI Routes API v2 BFF Proxy)

```python
@app.post("/api/routes/compute")
async def compute_routes(body: RouteComputeRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    payload = {
        "origin": {"location": {"latLng": {"latitude": body.origin.lat, "longitude": body.origin.lng}}},
        "destination": {"location": {"latLng": {"latitude": body.destination.lat, "longitude": body.destination.lng}}},
        "travelMode": body.travelMode,
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": body.units,
    }
    if body.travelMode == "DRIVE":
        payload["routingPreference"] = "TRAFFIC_AWARE"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues",
    }
    upstream = await request.app.state.http_client.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=payload,
        headers=headers,
    )
    ...
```

## Documentation & Compliance Links

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
