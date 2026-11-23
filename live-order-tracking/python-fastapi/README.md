# On-Demand Delivery Checkout, Zone Validation & Live Tracker — Python FastAPI Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, Address Validation API, Routes API v2, Maps Static API)

End-to-end Chicago restaurant and grocery delivery checkout and live order-tracking web application built with a **Python FastAPI** Backend-for-Frontend (BFF) and a modern **Vanilla ES Module** frontend using **Google Maps Platform**.

Anchored at the **Fulton Market Kitchen Hub** (`41.8868, -87.6486`) and pre-seeded with `401 N Michigan Ave, Chicago, IL 60611`, the app validates deliverability and postal granularity with the **Address Validation API**, verifies eligibility against both a Chicago delivery zone **Polygon** (`google.maps.geometry.poly.containsLocation`) and an **8 km road-distance cap** computed via **Routes API v2**, calculates tiered delivery fees (`$2.99 <= 3 km`, `$4.99 <= 5.5 km`, `$6.99 <= 8 km`) and traffic-aware ETA, animates a courier **`AdvancedMarkerElement`** smoothly along the decoded route polyline, and generates an itemized order receipt embedding a **Maps Static API** route snapshot.

---

## Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`maps`, `marker`, `geometry`, `core`):** `google.maps.Map` (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`), `AdvancedMarkerElement`, `Polygon`, `Polyline`, `InfoWindow`, `geometry.poly.containsLocation`, `geometry.encoding.decodePath`, `geometry.spherical.interpolate` — [Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Places API (New) (`places`):** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`), `gmp-select` event, `event.placePrediction.toPlace().fetchFields()` — [Place Autocomplete Element Docs](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Address Validation API (BFF Proxy):** `POST https://addressvalidation.googleapis.com/v1:validateAddress` with USPS CASS/DPV metadata and `X-Goog-FieldMask` — [Address Validation API Docs](https://developers.google.com/maps/documentation/address-validation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Routes API v2 (BFF Proxy):** `POST https://routes.googleapis.com/directions/v2:computeRoutes` (`TRAFFIC_AWARE`) with explicit `X-Goog-FieldMask` — [Routes API Docs](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Maps Static API (BFF Proxy):** `GET https://maps.googleapis.com/maps/api/staticmap` proxied as PNG bytes without exposing server credentials in client image URLs — [Maps Static API Docs](https://developers.google.com/maps/documentation/maps-static/start?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your key.

> Note: The Maps Demo Key has daily quota limits, is for prototyping only (not production), and supports a subset of APIs. For full Address Validation + Maps Static API + Routes API coverage, use a standard Cloud API key.

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to apply HTTP referrer / IP and API restrictions.

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set:
# GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Install, Verify & Run

```bash
# Create virtual environment and install dependencies
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None" && .venv/bin/pip install -q -r requirements.txt

# Syntax / bytecode check
.venv/bin/python -m compileall -q -x ^\./?\.venv .

# Start FastAPI server bound strictly to 127.0.0.1
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

---

## Architecture Summary

- **FastAPI BFF ([`main.py`](./main.py)):**
  - Validates all incoming requests with strict **Pydantic** models (`AddressValidateRequest`, `RouteComputeRequest`).
  - Proxies `POST /api/address/validate`, `POST /api/routes/compute`, and `GET /api/maps/static-receipt` asynchronously via `httpx.AsyncClient` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask` headers.
  - Enforces security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) and binds to `127.0.0.1`.
- **Interactive Frontend ([`static/app.js`](./static/app.js)):**
  - Loads Maps JS dynamically via `google.maps.importLibrary()`, renders `AdvancedMarkerElement` pins without deprecated properties, and uses `createElement` + `textContent` (zero `innerHTML`).
  - Animates the courier marker smoothly along `encoding.decodePath()` vertices using `spherical.interpolate()` and `requestAnimationFrame`.

### Core Implementation Snippet

```python
@app.post("/api/routes/compute")
async def compute_route(payload: RouteComputeRequest) -> dict[str, Any]:
    api_key = require_api_key()
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_COMPUTE_FIELD_MASK,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        upstream = await client.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            headers=headers,
            json=request_body,
        )
```

---

## All Live Order Tracking Sample Stacks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/) *(current implementation)*
- [`nodejs-web`](../nodejs-web/)

> Usage of Google Maps Platform APIs and SDKs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
