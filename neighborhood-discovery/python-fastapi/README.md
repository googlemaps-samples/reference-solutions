# Python FastAPI Backend + Interactive Web Frontend — Hyperlocal Neighborhood Directory & Spot Mapper (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, Places API (New), Geocoding API)

A standalone **Hyperlocal Neighborhood Directory & Spot Mapper** pre-seeded in **Central London** (`51.5118, -0.1280`, Covent Garden / West End). Built with an async **Python FastAPI** Backend-for-Frontend (`httpx.AsyncClient` + Pydantic v2 validation) and a modern zero-framework ES module frontend powered by the **Google Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.

## Features

- **Central London Discovery on Load:** Initializes a 2D vector Google Map (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`) with a 5 km (`5000m`) search radius `Circle` and executes live **Places API (New)** Nearby Searches across **Restaurants**, **Cafés**, **Museums**, and **Parks**, rendering color-coded `AdvancedMarkerElement` + `PinElement` pins.
- **Address & Neighborhood Search:** Uses `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields()`), quick Central London neighborhood presets, forward Geocoding (`GET /api/geocode`), and 5 km text search (`POST /api/places/search`).
- **Live Details Drawer & Side-by-Side Comparison:** Fetches live ratings, review counts, `priceLevel`, weekly `regularOpeningHours.weekdayDescriptions`, place photos (`/api/places/photo`), and customer reviews (`GET /api/places/details`), and supports comparing up to 3 places side-by-side.
- **Map-Click Reverse Geocoding & Community Spots:** Clicking anywhere on the map calls `GET /api/geocode?lat=...&lng=...` to resolve the street address, Place ID, and Plus Code, letting users search around that coordinate or pin session-scoped community spots.

## Quickstart & Setup

### 1. Obtain a Google Maps Platform API Key

For zero-billing prototyping, generate a free **Maps Demo Key**:
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required for prototyping).
3. Accept the Maps Demo Project Terms when prompted and reveal your key.

For production deployments, create and restrict a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) with **Maps JavaScript API**, **Places API (New)**, and **Geocoding API** enabled, and follow the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and set:
# GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Install, Check & Run Locally

```bash
python3 -c "import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None"
.venv/bin/pip install -q -r requirements.txt
.venv/bin/python -m compileall -q -x ^\./?\.venv .
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000` in your browser.

## Architecture Summary

- **FastAPI Backend ([`main.py`](./main.py)):**
  - `GET /api/config` — Serves runtime map configuration (`mapId`, `attributionId`, center, and `GOOGLE_MAPS_API_KEY`).
  - `POST /api/places/nearby` — Proxies `https://places.googleapis.com/v1/places:searchNearby` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask` within a 5 km circular `locationRestriction`.
  - `POST /api/places/search` — Proxies `https://places.googleapis.com/v1/places:searchText` with a 5 km `locationBias`.
  - `GET /api/places/details` — Proxies `https://places.googleapis.com/v1/places/{placeId}` for full hours, ratings, and reviews.
  - `GET /api/places/photo` — Resolves Place Photos (New) `media` URIs server-side without exposing API keys in `<img>` URLs.
  - `GET /api/geocode` — Proxies `https://maps.googleapis.com/maps/api/geocode/json` for forward and reverse geocoding without browser CORS traps.
  - Enforces `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers on all responses and binds strictly to `127.0.0.1`.
- **Interactive Frontend ([`static/index.html`](./static/index.html), [`static/styles.css`](./static/styles.css), [`static/app.js`](./static/app.js)):**
  - Loads Maps JS via `google.maps.importLibrary()` (`maps`, `marker`, `places`, `core`).
  - Builds all DOM nodes safely via `document.createElement` and `textContent` (zero `innerHTML` sinks).

### Core Implementation Snippet

```python
# main.py — Server-side Places API (New) Nearby Search proxy
resp = await client.post(
    "https://places.googleapis.com/v1/places:searchNearby",
    json={
        "includedTypes": payload.includedTypes,
        "maxResultCount": payload.maxResultCount,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": payload.lat, "longitude": payload.lng},
                "radius": payload.radiusMeters,
            }
        },
    },
    headers={
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
)
```

```javascript
// static/app.js — Categorized AdvancedMarkerElement + PinElement on weekly channel
const pin = new PinElement({
  background: meta.bg,
  borderColor: meta.border,
  glyphColor: meta.glyph,
  glyphText: meta.glyphText,
  scale: isSelected ? 1.25 : 1.0,
});
const marker = new AdvancedMarkerElement({
  map: state.map,
  position: coords,
  title: getPlaceName(place),
});
marker.append(pin);
marker.addListener("click", () => inspectPlace(place));
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
