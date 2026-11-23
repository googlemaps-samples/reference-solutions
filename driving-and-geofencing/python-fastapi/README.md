# Python FastAPI Backend + Interactive Web Frontend: Field Workforce Geofenced Attendance & Site Audit Router (`AdvancedMarkerElement`, `PinElement`, Places API (New), Routes API v2, Geocoding API v4, Terra Draw)

A standalone, production-structured **Python FastAPI** Backend-for-Frontend (BFF) and interactive web application for Austin, TX field workforce geofenced attendance check-in and multi-site store audit routing.

## Features

- **Austin Operations Map (`Maps JavaScript API`)**: Initializes a vector Google Map centered on Austin, TX (`30.2672, -97.7431`, zoom `12`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Pre-Seeded & Supervisor-Drawn Geofences (`Terra Draw` + `geometry.poly.containsLocation`)**: Renders 3 pre-seeded Austin commercial geofence polygons and mounts an interactive **Terra Draw** polygon drawing/editing toolbar (`terra-draw` + `terra-draw-google-maps-adapter`) so supervisors can draw, select, edit, or clear custom polygon zones.
- **Simulated Worker GPS & Verified Clock-In (`Geocoding API v4`)**: Switch between inside/outside Austin coordinate presets (or click the map in Pan mode) to test polygon entry/exit detection, reverse-geocode coordinates via `GET /api/geocode/reverse` (`geocode.googleapis.com/v4/geocode/location/{lat},{lng}`), and dynamically unlock or lock the **Verified Clock-In** badge.
- **Live Audit Site Discovery (`Places API (New)`)**: Queries `POST /api/places/search` (`places.googleapis.com/v1/places:searchText`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers (seeded with `"retail stores in Austin, TX"`).
- **Optimized Multi-Stop Driving Route (`Routes API v2`)**: Computes an optimal visit sequence via `POST /api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes`) with `optimizeWaypointOrder: true` and `routingPreference: "TRAFFIC_AWARE"`, rendering the decoded polyline and numbered `AdvancedMarkerElement` + `PinElement` stop pins with `InfoWindow` popups.

## Setup & Quickstart

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and generate your key.
4. See the [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for daily quota limits and supported APIs.

#### Option B: Google Cloud Console Key (Production)
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restricting API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and API scope.

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-api-key>
```

### 3. Install, Verify, and Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Syntax / bytecode check
.venv/bin/python -m compileall -q -x ^\./?\.venv .

# Start FastAPI server (bound strictly to 127.0.0.1)
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Architecture Summary

- **[`main.py`](main.py)**: Async FastAPI server using `httpx.AsyncClient` and Pydantic request validation. Keeps server-side Web Service calls off the browser (preventing CORS traps and hiding upstream REST calls behind `/api/places/search`, `/api/routes/compute`, and `/api/geocode/reverse`), while injecting `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
- **[`static/app.js`](static/app.js)**: Vanilla ES module client using the [Maps JavaScript API Dynamic Library Import](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0), [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0), [`geometry` library](https://developers.google.com/maps/documentation/javascript/geometry?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Terra Draw](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0).

### Core Backend & Frontend Snippets

```python
# main.py — Routes API v2 proxy with waypoint optimization
upstream_resp = await client.post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,"
            "routes.duration,routes.polyline.encodedPolyline,"
            "routes.legs.distanceMeters,routes.legs.duration"
        ),
    },
    json={
        "origin": _to_routes_waypoint(payload.origin),
        "destination": _to_routes_waypoint(payload.destination),
        "intermediates": [_to_routes_waypoint(s) for s in payload.intermediates],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "optimizeWaypointOrder": True,
    },
)
```

```javascript
// static/app.js — Map initialization & geofence containment check
state.map = new Map(dom.mapContainer, {
  center: { lat: 30.2672, lng: -97.7431 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const matched = allZones.filter((zone) => poly.containsLocation(point, zone.polygon));
```

## Framework Implementations

Explore this solution across all standalone web sample implementations:

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/) *(current implementation)*
- [`nodejs-web`](../nodejs-web/)

---

Use of Google Maps Platform is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
