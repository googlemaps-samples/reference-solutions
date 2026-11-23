# Agent Guidelines — Google Maps Platform Zero-Deprecation & Security Mandate

This repository implements **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** (`python-fastapi`). Any future agent or developer modifying this codebase **MUST** adhere strictly to these standards:

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`v=weekly`, Dynamic Library Import via `google.maps.importLibrary`):**
  - `Map` (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`)
  - `AdvancedMarkerElement` and `PinElement` (using `glyphText` directly; pass `PinElement` directly without `.element` or `.glyph`)
  - `PlaceAutocompleteElement` (listening to `gmp-select`, calling `event.placePrediction.toPlace()` and `place.fetchFields()`)
  - `Polyline`, `InfoWindow`, `LatLngBounds`, `geometry.encoding.decodePath`
  - `StreetViewPanorama` and `StreetViewService.getPanorama`
- **Places API (New) REST (proxied via FastAPI BFF `/api/places/*`):**
  - `https://places.googleapis.com/v1/places:searchText`
  - `https://places.googleapis.com/v1/places:searchNearby`
  - `https://places.googleapis.com/v1/places/{placeId}`
  - `https://places.googleapis.com/v1/{photoName}/media`
- **Routes API v2 REST (proxied via FastAPI BFF `/api/routes/compute`):**
  - `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` and `optimizeWaypointOrder`
- **Time Zone API REST (proxied via FastAPI BFF `/api/timezone`):**
  - `https://maps.googleapis.com/maps/api/timezone/json`

## Strictly Forbidden Deprecated / Legacy APIs

NEVER introduce any of the following deprecated or disabled Google Maps Platform APIs or patterns:

1. `google.maps.Marker` — use `AdvancedMarkerElement`.
2. `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement` or Places API (New).
3. `gmp-placeselect` event — use `gmp-select`.
4. `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use Routes API v2 (`computeRoutes` / `Route.computeRoutes`).
5. `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
6. `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly and use `glyphText` / `glyphSrc`.
7. `place.isOpen()` on the `weekly` channel — inspect `regularOpeningHours.weekdayDescriptions` or `openNow`.
8. Client-side browser `fetch()` calls directly to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/timezone` — always route through FastAPI `/api/...` endpoints.

## Mandatory Security & ToS Rules

- **Never hardcode API keys** in source files, `.env.example`, or tests. Load `GOOGLE_MAPS_API_KEY` from environment variables / `.env`.
- **Never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`** — construct DOM nodes with `document.createElement()`, `textContent`, and `replaceChildren()`.
- **Bind strictly to `127.0.0.1`** and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
- **No fabricated/hardcoded place ratings, hours, or reviews** — all place details must originate from live Google Maps Platform API responses.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `itinerary-planner` — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub (Travel, Navigation & Itineraries)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Time Zone API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`

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
