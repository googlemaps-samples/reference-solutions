# Python FastAPI Backend + Interactive Web Frontend — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (`Map3DElement`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PinElement`, `Places API (New)`, `Elevation API`)

An interactive Photorealistic 3D terrain storytelling and hiking trail explorer centered on Emerald Bay & Rubicon Ridge in Lake Tahoe, built with a **Python FastAPI** Backend-for-Frontend (BFF) and a zero-dependency modern ES module web frontend.

## Architecture Summary

- **Backend-for-Frontend (`main.py`)**:
  - Async **FastAPI** server using `httpx.AsyncClient` and strict **Pydantic** request validation.
  - Exposes `/api/config`, `/api/health`, `POST /api/places/search` ([Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)), `POST /api/places/autocomplete` ([Places API (New) Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete?utm_campaign=gmp_git_agentsamples_v1.0.0)), and `POST /api/elevation/profile` ([Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
  - Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy` headers on every response and binds strictly to `127.0.0.1`.
- **Interactive 3D Frontend (`static/`)**:
  - Loads runtime config from `/api/config` and initializes the [Maps JavaScript API Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d-maps-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) `maps3d` library with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
  - Renders `<gmp-map-3d>` (`Map3DElement`) in `HYBRID` mode, an extruded bright-red `RGB(255, 0, 0)` trail via `Polyline3DElement`, interactive 3D markers via `Marker3DInteractiveElement` + `PinElement` + `PopoverElement`, smooth `flyCameraTo()` chapter transitions, an interactive SVG Elevation Profile chart, and Lake Tahoe landmark search.

### Core Implementation Snippet

```javascript
const trailPolyline = new Polyline3DElement({
  path: TRAIL_PATH.map((pt) => ({ lat: pt.lat, lng: pt.lng, altitude: 18 })),
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  outerColor: 'rgba(255, 255, 255, 0.78)',
  outerWidth: 0.25,
  drawsOccludedSegments: true,
});
map3d.append(trailPolyline);

map3d.flyCameraTo({
  endCamera: {
    center: { lat: 38.9612, lng: -120.0978, altitude: 45 },
    heading: 120,
    tilt: 72,
    range: 1100,
  },
  durationMillis: 2200,
});
```

## Setup & API Key Instructions

### Option 1: Free Maps Demo Key (Prototyping, No Billing Required)

1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (see [Demo Key docs](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0)).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate/reveal your Demo Key and copy it.
4. Create `.env` from `.env.example` and set `GOOGLE_MAPS_API_KEY`:
   ```bash
   cp .env.example .env
   ```

> **Note:** The Maps Demo Key has daily quota limits, is for prototyping only, and is not for production workloads.

### Option 2: Production Google Cloud API Key

1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Map Tiles API**, **Places API (New)**, and **Elevation API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [restrict your API key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) by HTTP referrer / server IP and specific APIs.

> **Cost & Terms Notice:** Usage of Google Maps Platform APIs in production may incur billing charges against your Google Cloud account and is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Install, Check & Run

```bash
# 1. Create virtual environment & install dependencies
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None" && .venv/bin/pip install -q -r requirements.txt

# 2. Syntax / bytecode check
.venv/bin/python -m compileall -q -x '^\./?\.venv' .

# 3. Start the FastAPI server (bound to 127.0.0.1)
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in a WebGL2-capable browser.

## Standalone Framework Samples

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
