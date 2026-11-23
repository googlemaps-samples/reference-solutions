# Python FastAPI Backend + Interactive Web Frontend — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (`Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Geocoder`, `ImageMapType`)

A standalone, zero-deprecation **Python FastAPI** Backend-for-Frontend (BFF) and modern vanilla JavaScript web dashboard pre-seeded in Downtown Phoenix (`Phoenix City Hall, Phoenix, AZ`). Users can search any address or city with [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) or click any building footprint on the 2D Google Map to inspect real-time weather, air quality, pollen, and rooftop solar panel potential.

## Features & Google Maps Platform APIs

- **Maps JavaScript API (Dynamic Library Import v2)**: Interactive 2D vector map (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`), [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) + [`PinElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization?utm_campaign=gmp_git_agentsamples_v1.0.0), [`ImageMapType`](https://developers.google.com/maps/documentation/javascript/maptypes?utm_campaign=gmp_git_agentsamples_v1.0.0) (`US_AQI` tile overlay), `Rectangle` building footprint highlight, and [`Geocoder`](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0) reverse geocoding on map click.
- **Places API (New)**: [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/reference/places-widget#PlaceAutocompleteElement?utm_campaign=gmp_git_agentsamples_v1.0.0) listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`) plus server-side [`places:searchText`](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) with strict `X-Goog-FieldMask` for the initial Phoenix seed lookup.
- **Weather API**: [`currentConditions:lookup`](https://developers.google.com/maps/documentation/weather/reference/rest/v1/currentConditions/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) and [`forecast/days:lookup`](https://developers.google.com/maps/documentation/weather/reference/rest/v1/forecast.days/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) with Imperial / Metric unit switching.
- **Air Quality API**: [`currentConditions:lookup`](https://developers.google.com/maps/documentation/air-quality/reference/rest/v1/currentConditions/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) for US AQI & Universal AQI, dominant pollutant, pollutant concentrations, health recommendations, and [`heatmapTiles`](https://developers.google.com/maps/documentation/air-quality/heatmap-tiles?utm_campaign=gmp_git_agentsamples_v1.0.0) PNG overlay proxied through FastAPI.
- **Pollen API**: [`forecast:lookup`](https://developers.google.com/maps/documentation/pollen/reference/rest/v1/forecast/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) for Tree, Grass, and Weed Universal Pollen Index (UPI), seasonality, plant allergens, and health guidance.
- **Solar API**: [`buildingInsights:findClosest`](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest?utm_campaign=gmp_git_agentsamples_v1.0.0) for max solar panel count, peak kW capacity, annual sunshine hours, roof area, CO₂ offset factor, and graceful `404` non-coverage handling.

## Architecture Summary

The FastAPI server (`main.py`) keeps your `GOOGLE_MAPS_API_KEY` on the backend for REST APIs, validates all inputs with Pydantic, enforces `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and proxies Google Maps Platform Web Services via `httpx.AsyncClient` using `X-Goog-Api-Key` and `X-Goog-FieldMask`:

```python
@app.get("/api/solar/building-insights")
async def solar_building_insights(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    requiredQuality: Literal["HIGH", "MEDIUM", "LOW"] = Query(default="MEDIUM"),
):
    api_key = require_configured_key()
    resp = await get_client().get(
        "https://solar.googleapis.com/v1/buildingInsights:findClosest",
        params={"location.latitude": lat, "location.longitude": lng, "requiredQuality": requiredQuality},
        headers={"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": SOLAR_INSIGHTS_FIELD_MASK},
    )
    if resp.status_code == 404:
        return JSONResponse(status_code=404, content={"coverage": False, "status": "NOT_FOUND"})
    return resp.json()
```

## Setup & API Key Instructions

### Option 1: Free Maps Demo Key (Zero-Billing Prototyping)

For quick local prototyping (Maps JavaScript API, Places API, Geocoding API, and Weather API):

1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted and generate/copy your key.
4. Note: The Maps Demo Key has daily usage limits and is not intended for production.

### Option 2: Google Cloud API Key (Full Environmental & Solar Suite)

To enable **Air Quality API**, **Pollen API**, and **Solar API** alongside Maps JS, Places, Geocoding, and Weather:

1. Create or select a project and generate an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable: **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) before deploying.

### Local Run

```bash
cp .env.example .env
# Add GOOGLE_MAPS_API_KEY=<your_key> inside .env

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
