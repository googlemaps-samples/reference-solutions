# Agent Guidelines — `python-fastapi` Storefront Sample

This repository implements the **Single-Venue Storefront, Booking & Get Directions Hub** (`storefront-sample`) on **Python FastAPI + Vanilla ES Modules**.

## Modern Google Maps Platform APIs Used

Future coding agents modifying this codebase **MUST** continue using only current, non-deprecated Google Maps Platform APIs and patterns:

1. **Maps JavaScript API (`v=weekly`, Dynamic Library Import):**
   - `google.maps.importLibrary("core" | "maps" | "marker" | "places" | "routes" | "streetView" | "geometry")`
   - `google.maps.Map` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
   - `google.maps.marker.AdvancedMarkerElement` (DOM-composed markers, never `google.maps.Marker`)
   - `google.maps.places.PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()` (and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`)
   - `google.maps.StreetViewService` + `google.maps.StreetViewPanorama` + `google.maps.geometry.spherical.computeHeading`
   - `google.maps.Circle`, `google.maps.Polyline`, and `google.maps.geometry.encoding.decodePath`
2. **Backend-for-Frontend (BFF) REST Proxies (`main.py`):**
   - **Places API (New):** `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`
   - **Place Photos (New):** `https://places.googleapis.com/v1/{name}/media` proxied through `GET /api/places/photo` so API keys never appear in client image URLs
   - **Routes API v2:** `https://routes.googleapis.com/directions/v2:computeRoutes` (`Route.computeRoutes` equivalent on server) with `X-Goog-Api-Key` and `X-Goog-FieldMask`

## Strictly Forbidden Legacy APIs & Security Anti-Patterns

- **NEVER** introduce `google.maps.Marker`, `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, `AutocompleteService`, `gmp-placeselect`, `DirectionsService`, `DirectionsRenderer`, `DistanceMatrixService`, `google.maps.visualization.HeatmapLayer`, `google.maps.drawing`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
- **NEVER** call `Place.prototype.isOpen()` on the `weekly` channel (it is beta-only and throws at runtime on `weekly`).
- **NEVER** call `googleapis.com` REST endpoints directly from browser `fetch()`; keep REST calls behind the FastAPI BFF endpoints in `main.py`.
- **NEVER** hardcode API keys in code or `.env.example`, never bind the server to `0.0.0.0`, and never use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/`.
- **NEVER** hardcode fake venue ratings, hours, or reviews, and never collect HIPAA/PHI medical records in the scheduling form.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `storefront-sample` — Single-Venue Storefront, Booking & Get Directions Hub (Local Discovery & Storefronts)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** None
- **Server `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`

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
