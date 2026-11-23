# Agent Engineering Guidelines (`python-fastapi`)

This repository is a standalone **Python FastAPI + Interactive Web Frontend** Google Maps Platform application built strictly under the **Zero-Deprecation & Security Mandate**.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`google.maps.importLibrary`)**:
  - `Map` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - `AdvancedMarkerElement` and `PinElement` (using `glyphText` and `marker.append(pin)`)
  - `Polygon`, `Polyline`, `InfoWindow`, `OverlayView`
  - `geometry.encoding.decodePath`, `geometry.poly.containsLocation`, `geometry.spherical`
- **Data Visualization**:
  - `deck.HeatmapLayer` via `deck.GoogleMapsOverlay` (with graceful 2D Canvas `OverlayView` fallback when WebGL2 is unavailable)
- **Server-Side BFF Proxies (`main.py` via `httpx.AsyncClient`)**:
  - **Places API (New)**: `POST https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - **Routes API v2**: `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key`, `X-Goog-FieldMask`, and `intermediates` (`via: true`)
  - **Geocoding API**: `GET https://maps.googleapis.com/maps/api/geocode/json`
  - **Elevation API**: `GET https://maps.googleapis.com/maps/api/elevation/json`
  - **Weather API**: `GET https://weather.googleapis.com/v1/currentConditions:lookup`

## Forbidden Legacy APIs & Anti-Patterns

Future coding agents **MUST NOT** introduce any of the following deprecated/disabled APIs or insecure patterns:

1. **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement` + `PinElement` (never `.element` or `.glyph`).
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `Place`, or Places API (New) endpoints.
3. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) or `Route.computeRoutes`.
4. **NEVER** use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
5. **NEVER** call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly via browser `fetch()` — route through the FastAPI `/api/*` BFF endpoints.
6. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in frontend JS — use `document.createElement()`, `textContent`, and `replaceChildren()`.
7. **NEVER** hardcode `GOOGLE_MAPS_API_KEY` or bind uvicorn to `0.0.0.0` (always bind to `127.0.0.1`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `complete-heatmap` — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (Environmental & Civic Intelligence)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`
- **Geo Libraries:** `deck.gl`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`

### Key Implementation Files

- **Map & Markers:** [`static/app.js`](./static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./static/app.js)
- **Backend API Proxy:** [`main.py`](./main.py)
- **App Entry & Config:** [`static/index.html`](./static/index.html)

### Verified Commands

```bash
# Install
python3 -c import pathlib, venv; p=pathlib.Path('.venv'); venv.create(p, with_pip=True) if not (p/'bin'/'pip').exists() else None && .venv/bin/pip install -q -r requirements.txt
# Typecheck
.venv/bin/python -m compileall -q -x ^\./?\.venv .
# Build
.venv/bin/python -m compileall -q -x ^\./?\.venv .
# Serve (loopback 127.0.0.1)
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 4177
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
