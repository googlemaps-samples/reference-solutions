# Coding Agent Instructions (`python-fastapi`)

This repository implements the **Field Workforce Geofenced Attendance & Site Audit Router** using a **Python FastAPI** Backend-for-Frontend (`main.py`) and modern **Google Maps Platform** Web APIs (`static/app.js`).

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import)**: `google.maps.importLibrary('core' | 'maps' | 'marker' | 'geometry' | 'geocoding')`
- **Map Initialization**: `new Map(..., { mapId: 'DEMO_MAP_ID', internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'] })`
- **Markers**: `AdvancedMarkerElement` and `PinElement` (`glyphText`, `marker.append(pin)`)
- **Polygon Drawing**: `TerraDraw` + `TerraDrawGoogleMapsAdapter` (via `terra-draw` and `terra-draw-google-maps-adapter`)
- **Geofencing & Polyline Decoding**: `google.maps.geometry.poly.containsLocation()` and `google.maps.geometry.encoding.decodePath()`
- **Places API (New)**: `POST https://places.googleapis.com/v1/places:searchText` via `/api/places/search` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API (v2)**: `POST https://routes.googleapis.com/directions/v2:computeRoutes` (`optimizeWaypointOrder: true`, `routingPreference: "TRAFFIC_AWARE"`) via `/api/routes/compute` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Geocoding API (v4)**: `GET https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}` via `/api/geocode/reverse` with `X-Goog-Api-Key` and `X-Goog-FieldMask`

## Strictly Prohibited (Deprecated / Legacy / Insecure)

Future coding agents MUST NEVER introduce any of the following:

1. **Legacy Maps JS Classes & Libraries**:
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchByText`, or Places API (New) REST via `/api/places/search`).
   - NEVER listen to retired `gmp-placeselect` (use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2 REST via `/api/routes/compute`).
   - NEVER use `google.maps.drawing` (use Terra Draw) or `google.maps.visualization.HeatmapLayer`.
   - NEVER use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`).
2. **Legacy Loaders & Wrappers**:
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader(...).load()` or `<gmpx-*>` (`@googlemaps/extended-component-library`).
   - ALWAYS retain `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `mapId: 'DEMO_MAP_ID'`.
3. **Security & Data Integrity**:
   - NEVER hardcode API keys in source files or `.env.example`; always read `GOOGLE_MAPS_API_KEY` from `.env`.
   - NEVER call `googleapis.com` REST endpoints directly from browser `fetch()` (CORS-blocked); route REST calls through FastAPI `/api/*` endpoints.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; build DOM nodes with `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER bind the local server to `0.0.0.0`; bind strictly to `127.0.0.1` and preserve security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
   - NEVER hardcode fake place names, ratings, reviews, or opening hours in place of live Google Maps Platform responses.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `driving-and-geofencing` — Field Workforce Geofenced Attendance & Site Audit Router (Logistics, Dispatch & Tracking)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`
- **Geo Libraries:** `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`

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
