# AGENTS.md — Engineering Guardrails for `python-fastapi`

This repository implements the **Chicago On-Demand Delivery Checkout, Zone Validation & Live Tracker** using **Python FastAPI** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase MUST use only these current, non-deprecated APIs:

1. **Maps JavaScript API (`importLibrary`)**
   - `google.maps.Map` initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
   - `AdvancedMarkerElement` (via `importLibrary("marker")`) using `marker.append(domElement)` and plain `"click"` listeners on the `weekly` channel
   - `google.maps.Polygon`, `google.maps.Polyline`, `google.maps.InfoWindow` (via `importLibrary("maps")`)
   - `google.maps.geometry.poly.containsLocation`, `encoding.decodePath`, `spherical.computeDistanceBetween`, `spherical.interpolate` (via `importLibrary("geometry")`)
   - `LatLng`, `LatLngBounds` (via `importLibrary("core")`)
2. **Places API (New)**
   - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) via `importLibrary("places")`
   - Listen strictly to `"gmp-select"` and resolve via `event.placePrediction.toPlace().fetchFields(...)`
3. **Address Validation API (Server-Side BFF Proxy)**
   - `POST https://addressvalidation.googleapis.com/v1:validateAddress` via `/api/address/validate` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
4. **Routes API v2 (Server-Side BFF Proxy)**
   - `POST https://routes.googleapis.com/directions/v2:computeRoutes` via `/api/routes/compute` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
5. **Maps Static API (Server-Side BFF Proxy)**
   - `GET https://maps.googleapis.com/maps/api/staticmap` via `/api/maps/static-receipt` returning image bytes so API keys stay on the server

## Strictly Forbidden Legacy APIs & Patterns

NEVER introduce any of the following deprecated or insecure patterns:

- **NEVER** use `google.maps.Marker` — always use `AdvancedMarkerElement`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement` / `Place` / `AutocompleteSuggestion`.
- **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use Routes API v2 (`routes.googleapis.com/directions/v2:computeRoutes`) or `Route.computeRoutes`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — use `PinElement` directly with `glyphText` / `glyphSrc`, or `marker.append(htmlElement)`.
- **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` — always use `document.createElement()`, `textContent`, and `replaceChildren()`.
- **NEVER** hardcode `GOOGLE_MAPS_API_KEY` in source files or `.env.example`.
- **NEVER** bind the local FastAPI server to `0.0.0.0` — always bind to `127.0.0.1`.
- **NEVER** call `googleapis.com` REST endpoints (`addressvalidation.googleapis.com`, `routes.googleapis.com`) directly from browser `fetch()` — always proxy through FastAPI `/api/...` routes.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `live-order-tracking` — On-Demand Delivery Checkout, Zone Validation & Live Tracker (Logistics, Dispatch & Tracking)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Address Validation API, Maps Static API)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`

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
