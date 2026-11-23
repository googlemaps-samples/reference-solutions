# AGENTS.md — Google Maps Platform & Security Engineering Guidelines

This repository implements **On-Demand Local Services & EV Roadside Dispatch** using **Python FastAPI** and the **Google Maps JavaScript API** (`weekly` channel). All future coding agents modifying this codebase MUST follow these non-negotiable standards.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`google.maps.importLibrary`):**
  - `Map` initialized with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
  - `AdvancedMarkerElement` and `PinElement` (using `glyphText`, `background`, `borderColor`, `glyphColor`)
  - `PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`
  - `Circle`, `Polyline`, `InfoWindow`, `LatLngBounds`, and `encoding.decodePath`
- **Server-Side BFF Proxies (`main.py` via `httpx.AsyncClient`):**
  - **Places API (New):** `https://places.googleapis.com/v1/places:searchNearby` and `places:searchText` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - **Routes API:** `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` and `directions/v2:computeRoutes` with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - **Geocoding API:** `https://maps.googleapis.com/maps/api/geocode/json` for reverse geocoding

## Strictly Forbidden Legacy APIs & Patterns

NEVER introduce any of the following deprecated or unsafe APIs/patterns:

1. **Legacy Markers:** NEVER use `google.maps.Marker`. Always use `AdvancedMarkerElement` with a valid `mapId`.
2. **Legacy PinElement Properties:** NEVER use `PinElement.element` or `PinElement.glyph`. Pass `PinElement` directly and use `PinElementOptions.glyphText` or `glyphSrc`.
3. **Legacy Places:** NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, or the retired `gmp-placeselect` event.
4. **Legacy Routes / Distance Matrix:** NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
5. **Legacy Visualization / Drawing:** NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. **Beta-Only Calls on `weekly` Channel:** NEVER call `place.isOpen()` or rely solely on `gmp-click` when running on the `weekly` channel. Inspect `regularOpeningHours.openNow` / `weekdayDescriptions` and listen to `'click'` on `AdvancedMarkerElement`.
7. **Banned Wrapper Libraries:** NEVER install or import `@googlemaps/extended-component-library` (`<gmpx-*>`).
8. **Client-Side CORS Traps:** NEVER call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` directly via browser `fetch()`. Route through `/api/*` in `main.py`.
9. **XSS & Server Security:** NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/app.js`. Always use `document.createElement()`, `textContent`, and `replaceChildren()`. Always bind the server to `127.0.0.1` (never `0.0.0.0`), preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and never hardcode `GOOGLE_MAPS_API_KEY`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ev-charging-map-and-dispatch` — On-Demand Local Services & EV Roadside Dispatch (Local Discovery & Storefronts)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

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
