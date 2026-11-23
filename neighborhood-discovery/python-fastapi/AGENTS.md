# Agent Engineering Guidelines — `python-fastapi` Neighborhood Discovery

This project implements the **Hyperlocal Neighborhood Directory & Spot Mapper** using modern, non-deprecated Google Maps Platform APIs and secure Backend-for-Frontend (BFF) practices. Future coding agents modifying this repository **MUST** preserve these standards.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):**
  - Loaded via the `google.maps.importLibrary()` bootstrap (`maps`, `marker`, `places`, `core`) on the `weekly` channel.
  - Map initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - Markers use `AdvancedMarkerElement` paired with `PinElement({ background, borderColor, glyphColor, glyphText, scale })` attached via `marker.append(pin)` and standard `marker.addListener("click", ...)` (weekly-channel safe).
  - Autocomplete uses `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
  - Opening hours read `regularOpeningHours.weekdayDescriptions` directly (avoiding beta-only `place.isOpen()` on the `weekly` channel).
- **Places API (New) Web Service (Server-Side BFF in `main.py`):**
  - `POST https://places.googleapis.com/v1/places:searchNearby` via `/api/places/nearby`
  - `POST https://places.googleapis.com/v1/places:searchText` via `/api/places/search`
  - `GET https://places.googleapis.com/v1/places/{placeId}` via `/api/places/details`
  - `GET https://places.googleapis.com/v1/{photoName}/media` via `/api/places/photo`
  - All server-side Places calls send explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
- **Geocoding API (Server-Side BFF in `main.py`):**
  - `GET https://maps.googleapis.com/maps/api/geocode/json` via `/api/geocode` for forward and reverse geocoding.

## Strictly Forbidden Legacy / Deprecated APIs & Patterns

NEVER introduce any of the following:
- `google.maps.Marker` (use `AdvancedMarkerElement`)
- `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `Place.searchNearby`, `Place.searchText`, `Place.fetchFields`)
- Retired `gmp-placeselect` event (use `gmp-select`)
- `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` or Routes API v2)
- `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`
- `PinElement.element`, `PinElement.glyph`, or `marker.content = ...` (use `PinElement` with `glyphText`/`glyphSrc` and `marker.append(pin)`)
- `@googlemaps/extended-component-library` (`<gmpx-*>`) or legacy wrapper packages
- Direct browser `fetch()` calls to `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com/maps/api/geocode` (always proxy through FastAPI `/api/...` endpoints)

## Security & Compliance Mandates

- NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`. Always load from `.env` via `python-dotenv`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in frontend code; always use `document.createElement()`, `textContent`, and `replaceChildren()`.
- Always bind local dev/preview servers to `127.0.0.1` (never `0.0.0.0`) and preserve `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers.
- NEVER hardcode fabricated place ratings, opening hours, or reviews; all place data must originate from live Google Maps Platform API calls.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `neighborhood-discovery` — Hyperlocal Neighborhood Directory & Spot Mapper (Local Discovery & Storefronts)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`

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
