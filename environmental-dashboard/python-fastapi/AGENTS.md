# AGENTS.md — Google Maps Platform Coding Standards (`python-fastapi`)

This repository is a standalone **Python FastAPI + Vanilla JS** implementation of the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard**. All future coding agents modifying this codebase **MUST** strictly follow Google Maps Platform zero-deprecation and security rules.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import v2)**:
  - Loaded dynamically via `google.maps.importLibrary(...)` (`maps`, `core`, `marker`, `places`, `geocoding`).
  - `Map` initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - `AdvancedMarkerElement` + `PinElement` (using `PinElement` directly via `marker.append(pin)` and `glyphText`, never `.element` or `.glyph`).
  - `ImageMapType` for non-WebGL `US_AQI` heatmap tile overlays via `/api/air-quality/tiles`.
  - `Geocoder` for reverse geocoding on map click.
  - `Rectangle` for highlighting Solar `boundingBox` building footprints.
- **Places API (New)**:
  - `PlaceAutocompleteElement` (`gmp-select` event -> `event.placePrediction.toPlace().fetchFields(...)`).
  - Backend `POST /api/places/search-text` calling `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
- **Routes Standard**: If adding routing features, use `Route.computeRoutes` (`importLibrary("routes")`) or backend `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask`.
- **Environmental & Solar APIs (Backend BFF Proxies in `main.py`)**:
  - Weather API (`currentConditions:lookup`, `forecast/days:lookup`)
  - Air Quality API (`currentConditions:lookup`, `mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`)
  - Pollen API (`forecast:lookup`)
  - Solar API (`buildingInsights:findClosest`, returning clean 404 non-coverage JSON when no building is within 50m)

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, `AutocompleteSuggestion`)
- `gmp-placeselect` event (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService` (use `Route.computeRoutes` / Routes API v2)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `PinElement.element` or `PinElement.glyph`
- `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Raw browser `fetch()` to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode`
- Hardcoded API keys or `0.0.0.0` server bindings (always bind `127.0.0.1` and load `GOOGLE_MAPS_API_KEY` from `.env`)
- Unsafe DOM sinks (`innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`) — always use `document.createElement`, `textContent`, and `replaceChildren`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`

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
