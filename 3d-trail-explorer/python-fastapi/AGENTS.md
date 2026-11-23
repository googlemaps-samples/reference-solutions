# Coding Agent Instructions (`python-fastapi`)

This standalone repository implements **Lake Tahoe 3D Trail Explorer** using Python FastAPI + vanilla ES modules and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Photorealistic 3D Maps (`maps3d` library)**:
  - `Map3DElement` (`<gmp-map-3d>`) with `mode: 'HYBRID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `Polyline3DElement` with `altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`, `strokeColor: 'rgb(255, 0, 0)'`, and `path` (never deprecated `coordinates`)
  - `Marker3DInteractiveElement` (`gmp-click`) + `PopoverElement`
  - Smooth camera storytelling with `map3d.flyCameraTo()`
- **Markers (`marker` library)**:
  - `PinElement` (`glyphText`, never deprecated `PinElement.element` or `PinElement.glyph`)
  - `AdvancedMarkerElement` (with `mapId: 'DEMO_MAP_ID'` whenever 2D markers are used)
- **Places API (New)**:
  - Server-side BFF proxies to `https://places.googleapis.com/v1/places:searchText` and `https://places.googleapis.com/v1/places:autocomplete` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - Client-side `Place` / `PlaceAutocompleteElement` (`gmp-select`)
- **Elevation API**:
  - Server-side BFF proxy to `https://maps.googleapis.com/maps/api/elevation/json` for path sampling and point elevations
- **Routes (when adding routing features)**:
  - Always use `Route.computeRoutes` or Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`)

## Strict Zero-Deprecation & Security Rules

Future coding agents MUST NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement` or `Marker3DInteractiveElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or `gmp-placeselect`
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `@googlemaps/extended-component-library` (`<gmpx-*>`)
- Hardcoded API keys in any source file or `.env.example`
- `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` (use `document.createElement`, `document.createElementNS`, `textContent`, `replaceChildren`)
- Binding servers to `0.0.0.0` (always bind to `127.0.0.1`)
- Removing `X-Content-Type-Options: nosniff` or `X-Frame-Options: SAMEORIGIN` headers

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`static/index.html`](./static/index.html)
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
