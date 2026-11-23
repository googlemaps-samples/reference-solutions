# AGENTS.md — Coding Agent Guardrails for `python-fastapi`

This repository is a 100% standalone Google Maps Platform sample built on **Python FastAPI** and **Modern Maps JavaScript API (`weekly` channel)**.

## Approved Modern Google Maps Platform APIs in Use

- **Maps JavaScript API (2D Vector Map):** `google.maps.importLibrary("maps")`, `Map` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
- **Markers:** `google.maps.importLibrary("marker")` -> `AdvancedMarkerElement` and `PinElement` (using `glyphText` / `glyphSrc`, passing `PinElement` directly as marker `content`)
- **Places (Client & Server):**
  - `google.maps.importLibrary("places")` -> `PlaceAutocompleteElement` (`gmp-place-autocomplete`) listening to **`gmp-select`** (`event.placePrediction.toPlace()` + `place.fetchFields(...)`)
  - Backend proxy `/api/places/search` -> `https://places.googleapis.com/v1/places:searchText` with `X-Goog-FieldMask`
- **Routes (Server BFF):**
  - `/api/routes/compute` -> `https://routes.googleapis.com/directions/v2:computeRoutes` (`TRAFFIC_AWARE_OPTIMAL`, `FUEL_EFFICIENT`, `FUEL_CONSUMPTION`, `vehicleInfo.emissionType`)
  - `/api/routes/matrix` -> `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`
- **Geometry:** `google.maps.importLibrary("geometry")` -> `encoding.decodePath` and `spherical` (`computeDistanceBetween`, `computeHeading`, `interpolate`)

## Strict Prohibitions for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement` or Places API New).
   - NEVER listen to `gmp-placeselect` (always use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or the `/api/routes/*` Routes API v2 endpoints).
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `PinElement.element` or `PinElement.glyph` (use `PinElement` directly and `glyphText`/`glyphSrc`).
2. **NEVER bypass the FastAPI BFF for REST calls:**
   - NEVER call `routes.googleapis.com`, `places.googleapis.com`, or `maps.googleapis.com/maps/api/*` via client-side `fetch()` (CORS blocked).
3. **Security & DOM Safety:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/app.js`.
   - NEVER bind the server to `0.0.0.0` (always `127.0.0.1`) or remove `X-Content-Type-Options` / `X-Frame-Options` headers.
   - ALWAYS retain `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `ridesharing-and-tracker` — Rideshare Booking, Fare Estimator & Live Driver Tracking (Logistics, Dispatch & Tracking)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

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
