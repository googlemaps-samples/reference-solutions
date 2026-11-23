# Python FastAPI Backend + Interactive Web Frontend — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub

A standalone, production-structured **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** powered by a **Python FastAPI** Backend-for-Frontend (BFF) and a zero-build modern web frontend using the **Google Maps JavaScript API** (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Polyline`, `InfoWindow`, `StreetViewPanorama`, `StreetViewService`), **Places API (New)** (`searchText`, `searchNearby`, `places/{placeId}`, Place Photos Media), **Routes API v2** (`directions/v2:computeRoutes` with `optimizeWaypointOrder`), and **Time Zone API**.

## Features

- **Pre-Seeded Live Tokyo Itinerary (Day 1 & Day 2):** Queries live Places API (New) attractions and restaurants on startup to populate Day 1 (Teal `#0F766E`) and Day 2 (Amber `#D97706`) without hardcoded place details.
- **Destination Search & Presets:** Interactive `PlaceAutocompleteElement` (`gmp-select` + `placePrediction.toPlace()`) alongside quick city presets (Tokyo, Kyoto, Paris, New York, London, Sydney).
- **Live Time Zone Hub:** Calls the Time Zone API via `/api/timezone` (with graceful `Place.utcOffsetMinutes` fallback) to display the destination's live local clock, time zone name, and UTC offset.
- **Attraction, Restaurant & Hotel Discovery:** Switch between Attractions, Restaurants, and Hotels (via Places Text Search and Nearby Search) with live photos proxied through `/api/places/photo`, star ratings, review counts, and opening hours (`regularOpeningHours.weekdayDescriptions`).
- **Numbered Day-Colored Markers & Optimized Multi-Stop Routes:** Renders numbered `AdvancedMarkerElement` pins with `PinElement` (`glyphText`), draws multi-stop `Polyline` geometries via Routes API v2 (`/api/routes/compute`), supports `DRIVE`, `WALK`, and `TRANSIT` modes, and optimizes intermediate stop order via `optimizeWaypointOrder`.
- **Embedded Street View Preview:** Docked `StreetViewPanorama` panel backed by `StreetViewService.getPanorama()` for inspecting landmarks, restaurants, and hotels.

## Architecture Summary

- **FastAPI BFF (`main.py`):**
  - Validates all requests with strict **Pydantic** models.
  - Proxies `places.googleapis.com/v1/places:searchText`, `places.googleapis.com/v1/places:searchNearby`, `places.googleapis.com/v1/places/{placeId}`, `places.googleapis.com/v1/{photoName}/media`, `routes.googleapis.com/directions/v2:computeRoutes`, and `maps.googleapis.com/maps/api/timezone/json` using `httpx.AsyncClient` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
  - Enforces security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) and binds strictly to `127.0.0.1`.
- **Interactive Frontend (`static/index.html`, `static/styles.css`, `static/app.js`):**
  - Loads `GOOGLE_MAPS_API_KEY` from `/api/config` and initializes the Maps JS Dynamic Library Import loader (`v: "weekly"`).
  - Configures `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Uses safe DOM construction (`document.createElement`, `textContent`, `replaceChildren`) with zero `innerHTML`.

### Core Backend Snippet (`main.py`)

```python
headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": api_key,
    "X-Goog-FieldMask": (
        "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,"
        "routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,"
        "routes.legs.duration"
    ),
}
resp = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    json=body,
    headers=headers,
)
```

## Quickstart & API Key Setup

### Option 1: Free Zero-Billing Maps Demo Key (Prototyping)

1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key. (Note: Demo keys have a daily reset limit and are not for production.)

### Option 2: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Time Zone API**, and **Street View**.
3. Restrict your key by HTTP referrer / server IP and API scope following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restricting API Keys guide](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m compileall -q -x ^\./?\.venv .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Google Maps Platform References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Time Zone API](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
