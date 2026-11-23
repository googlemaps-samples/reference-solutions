# Coding Agent Guidelines — NYC Multi-Branch Store, ATM & Inventory Locator (`python-fastapi`)

This project is a 100% standalone **Python FastAPI + Vanilla ES Module** Google Maps Platform web application. Any agent modifying this codebase MUST follow these non-negotiable standards.

## Modern Google Maps Platform APIs Used

1. **Maps JavaScript API (Dynamic Library Import):**
   - Loaded via `google.maps.importLibrary(...)` (`core`, `maps`, `marker`, `places`, `routes`, `geocoding`, `geometry`).
   - Map instance initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
2. **Markers & Clustering:**
   - `google.maps.marker.AdvancedMarkerElement` (DOM attached via `marker.append(el)` / `marker.replaceChildren(el)`).
   - `@googlemaps/markerclusterer` (`MarkerClusterer`, `SuperClusterAlgorithm`) with a custom `AdvancedMarkerElement` cluster renderer.
3. **Places API (New) via FastAPI BFF (`main.py`):**
   - `POST https://places.googleapis.com/v1/places:searchText` (`/api/places/search`)
   - `POST https://places.googleapis.com/v1/places:autocomplete` (`/api/places/autocomplete`) with `sessionToken`
   - `GET https://places.googleapis.com/v1/places/{placeId}` (`/api/places/details`)
   - Client-side fallback: `google.maps.Geocoder` via `importLibrary("geocoding")`.
4. **Routes API v2 via FastAPI BFF (`main.py`):**
   - `POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` (`/api/routes/matrix`)
   - `POST https://routes.googleapis.com/directions/v2:computeRoutes` (`/api/routes/compute`)
   - Encoded polylines decoded on the client via `google.maps.geometry.encoding.decodePath()`.

## Prohibited Deprecated APIs & Patterns (NEVER Introduce)

- NEVER use `google.maps.Marker` — always use `AdvancedMarkerElement`.
- NEVER use `PinElement.element`, `PinElement.glyph`, `AdvancedMarkerElement.content`, or `AdvancedMarkerElement.element` — use `marker.append(...)` / `marker.replaceChildren(...)` and `glyphText` / `glyphSrc`.
- NEVER use legacy `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService`.
- NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
- NEVER call beta-only `place.isOpen()` on the `weekly` channel — inspect `regularOpeningHours.weekdayDescriptions` instead.
- NEVER use `@googlemaps/extended-component-library` (`<gmpx-*>`).
- NEVER call `googleapis.com` REST endpoints directly from browser `fetch()` (CORS trap) — route through FastAPI `/api/...` endpoints with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask`.
- NEVER hardcode API keys in source files or `.env.example`.
- NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` — use `document.createElement()`, `document.createElementNS()`, and `textContent`.
- NEVER bind the server to `0.0.0.0` — always bind to `127.0.0.1` and preserve security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
- NEVER hardcode fake reviews, ratings, or opening hours from LLM memory — always fetch live Place data at runtime.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `store-locator` — Multi-Branch Store, ATM & Inventory Locator (Local Discovery & Storefronts)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `@googlemaps/markerclusterer`
- **Server `/api/*` Proxy Routes:** `/api/places/autocomplete`, `/api/places/details`, `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`

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
