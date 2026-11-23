# AGENTS.md — Coding Agent Guardrails for `python-fastapi`

This repository implements the **Dallas Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** using **Python FastAPI** and modern, zero-deprecation **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):** `google.maps.importLibrary()` loading `core`, `maps`, `marker`, `places`, `routes`, and `geometry` (`encoding.decodePath`).
- **Vector Map & Attribution:** `google.maps.Map` configured with `mapId: "DEMO_MAP_ID"`, `clickableIcons: false`, and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Markers:** `google.maps.marker.AdvancedMarkerElement` with `google.maps.marker.PinElement` (`glyphText`, `background`, `borderColor`, `glyphColor`). Click events use `'click'` on `weekly` channel.
- **Autocomplete:** `google.maps.places.PlaceAutocompleteElement` listening to `'gmp-select'` (`event.placePrediction.toPlace()` -> `place.fetchFields(...)`).
- **Traffic Overlay:** `google.maps.TrafficLayer`.
- **Server-Side BFF REST Proxies (`main.py` via `httpx.AsyncClient`):**
  - `POST /api/places/search` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`
  - `POST /api/roads/snap` -> `https://roads.googleapis.com/v1/snapToRoads` (`interpolate=true`)
  - `POST /api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask`
  - `POST /api/routes/matrix` -> `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` with `X-Goog-FieldMask`

## Strictly Prohibited Legacy APIs & Antipatterns

Future coding agents MUST NEVER introduce any of the following:

1. **Legacy Markers:** NEVER use `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
2. **Legacy Places:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
3. **Legacy Routing:** NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
4. **Deprecated Map Layers / Wrappers:** NEVER use `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`, `@googlemaps/extended-component-library` (`<gmpx-*>`), or v1 `@googlemaps/js-api-loader`.
5. **Client-Side CORS Exposure:** NEVER call `places.googleapis.com`, `routes.googleapis.com`, or `roads.googleapis.com` directly from browser `fetch()`; always route REST calls through FastAPI `/api/...` endpoints with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
6. **DOM & Server Security:**
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/app.js` — always use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER bind FastAPI/Uvicorn to `0.0.0.0` — bind strictly to `127.0.0.1` and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `logistics-and-routing` — Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard (Logistics, Dispatch & Tracking)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Roads API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`

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
