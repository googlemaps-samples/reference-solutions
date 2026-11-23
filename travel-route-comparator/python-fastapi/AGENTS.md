# Agent Engineering Guidelines (`python-fastapi`)

This repository implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using a Python FastAPI Backend-for-Frontend (`main.py`) and modern Google Maps Platform Web APIs (`static/app.js`).

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):**
  - `google.maps.importLibrary("core" | "maps" | "marker" | "places" | "geometry")`
  - `Map` configured with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - `AdvancedMarkerElement` + `PinElement` (using `PinElementOptions.glyphText` and `marker.append(pin)`)
  - `Polyline` and `BicyclingLayer`
- **Places API (New):**
  - Client widget: `PlaceAutocompleteElement` listening exclusively to `gmp-select`, resolving via `event.placePrediction.toPlace()` and `place.fetchFields(...)`
  - Server-side BFF (`main.py`): `POST https://places.googleapis.com/v1/places:searchText` and `POST https://places.googleapis.com/v1/places:autocomplete` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
- **Routes API v2:**
  - Server-side BFF (`main.py`): `POST https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`, supporting `DRIVE`, `BICYCLE`, `WALK`, `TRANSIT`, `routeModifiers` (`avoidTolls`, `avoidHighways`), `computeAlternativeRoutes`, and `FUEL_EFFICIENT` reference routing
- **Elevation API:**
  - Server-side BFF (`main.py`): `GET https://maps.googleapis.com/maps/api/elevation/json` with `path=enc:<encodedPolyline>` and `samples=64`

## Strict Prohibitions for Future Agents

1. **NEVER** reintroduce deprecated or disabled Google Maps Platform APIs:
   - No `google.maps.Marker` (always use `AdvancedMarkerElement`).
   - No `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (always use `PlaceAutocompleteElement` / Places API New).
   - No retired `gmp-placeselect` event (always use `gmp-select`).
   - No `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (always use `Route.computeRoutes` or Routes API v2 REST via BFF).
   - No `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText` / `glyphSrc`).
   - No `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
2. **NEVER** call `googleapis.com` REST endpoints directly from browser `fetch()`; route REST calls through FastAPI `/api/*` endpoints.
3. **NEVER** hardcode `GOOGLE_MAPS_API_KEY` or log it; always load from environment/`.env`.
4. **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/`; use `createElement` / `createElementNS`, `textContent`, and `replaceChildren`.
5. **NEVER** bind the server to `0.0.0.0`; bind to `127.0.0.1` and preserve security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`

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
