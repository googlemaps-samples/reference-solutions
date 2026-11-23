# Python FastAPI Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `places:searchText`, `computeRoutes`, `computeRouteMatrix`, `geometry`) — Rideshare Booking, Fare Estimator & Live Driver Tracking

A 100% standalone, zero-deprecation Los Angeles rideshare passenger booking, transparent fare estimation, eco-friendly route comparison, and live driver-dispatch application built with **Python FastAPI** (`httpx` async BFF) and a modern **Vanilla ES6 Web Frontend** powered by the Google Maps JavaScript API (`weekly` channel).

## Features

- **Pre-Seeded Los Angeles Trip Planner:** Resolves `"Union Station, Los Angeles, CA"` to `"Santa Monica Pier, Santa Monica, CA"` immediately on load using Places API (New) (`places:searchText`) and renders interactive `PlaceAutocompleteElement` inputs listening to `gmp-select`.
- **Fastest vs. Eco-Friendly Route Comparison:** Proxies `directions/v2:computeRoutes` via FastAPI with `TRAFFIC_AWARE_OPTIMAL`, `requestedReferenceRoutes: ["FUEL_EFFICIENT"]`, `extraComputations: ["FUEL_CONSUMPTION"]`, and switchable `vehicleInfo.emissionType` (`GASOLINE`, `HYBRID`, `ELECTRIC`). Highlights fuel/energy and CO₂ savings on the map and sidebar.
- **Transparent Fare Estimator:** Computes live itemized **Economy**, **Comfort**, and **Green EV / Hybrid** fares directly from route distance and traffic-aware duration.
- **Closest Driver Matrix & Live Driver Animation:** Evaluates nearby simulated candidate vehicles via `distanceMatrix/v2:computeRouteMatrix`, dispatches the closest driver along a road-snapped approach polyline, and smoothly animates its custom rotatable `AdvancedMarkerElement` along the pickup and trip polylines using `geometry.encoding.decodePath` and `geometry.spherical` interpolation with live ETA updates.

## Prerequisites & Google Maps Platform Key Setup

> **Cost Notice:** Usage of Google Maps Platform APIs may incur charges against your Google Cloud billing account in production. For zero-cost prototyping, use the **Maps Demo Key** below.

### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and reveal your Demo Key.
5. Copy `.env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`:
   ```bash
   cp .env.example .env
   ```
   *(Note: Maps Demo Keys have daily quota limits and are for prototyping only.)*

### Option B: Production Google Cloud API Key
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Follow the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and permitted APIs.

## Running Locally

```bash
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x '^\./?\.venv' .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000` in your browser.

## Architecture Summary

- **FastAPI BFF (`main.py`):**
  - Validates all incoming requests with strict Pydantic v2 models.
  - Injects `X-Goog-Api-Key` and minimal `X-Goog-FieldMask` headers server-side for `places.googleapis.com/v1/places:searchText`, `routes.googleapis.com/directions/v2:computeRoutes`, and `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`.
  - Adds `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` security headers and binds strictly to `127.0.0.1`.
- **Frontend (`static/index.html`, `static/styles.css`, `static/app.js`):**
  - Loads Maps JS dynamically via `google.maps.importLibrary` (`core`, `maps`, `marker`, `places`, `routes`, `geometry`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Uses safe DOM APIs (`createElement`, `textContent`, `replaceChildren`) with zero `innerHTML`.

### Core Implementation Snippet (`main.py`)

```python
headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": api_key,
    "X-Goog-FieldMask": (
        "routes.distanceMeters,"
        "routes.duration,"
        "routes.staticDuration,"
        "routes.polyline.encodedPolyline,"
        "routes.routeLabels,"
        "routes.travelAdvisory.fuelConsumptionMicroliters,"
        "routes.localizedValues"
    ),
}
upstream = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    json=body,
    headers=headers,
)
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
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
