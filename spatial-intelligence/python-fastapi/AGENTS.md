# AGENTS.md — Google Maps Platform Modern Engineering Guidelines

This repository implements **Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics** using **Python FastAPI** + **Vanilla JS/HTML/CSS** with **100% modern, zero-deprecation Google Maps Platform APIs**.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `core`)**:
  - Loaded via the Dynamic Library Import bootstrap (`google.maps.importLibrary`).
  - Configured with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
  - GeoJSON boundary rendering via `map.data.addGeoJson()`, `map.data.setStyle()`, and `map.fitBounds()`.
- **Markers (`marker`)**:
  - `AdvancedMarkerElement` and `PinElement` (using `glyphText` and `marker.append(pin)`).
- **Places (`places` & Places API New REST)**:
  - Client-side `PlaceAutocompleteElement` listening to the `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - Server-side FastAPI BFF (`POST /api/places/search`) calling `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.
- **Elevation (`elevation` & Elevation API REST)**:
  - Server-side FastAPI BFF (`POST /api/elevation`) calling `https://maps.googleapis.com/maps/api/elevation/json`.
- **Spatial Drawing & WebGL Overlays**:
  - `terra-draw` + `terra-draw-google-maps-adapter` (modern replacement for `google.maps.drawing`).
  - `deck.gl` `GoogleMapsOverlay` with `ScatterplotLayer` and `HexagonLayer` guarded by a WebGL2 capability check.

## Strictly Forbidden Legacy / Deprecated APIs

Future coding agents **MUST NEVER** introduce any of the following deprecated or disabled APIs or insecure patterns:

- **NEVER** use `google.maps.Marker` — use `AdvancedMarkerElement`.
- **NEVER** use `PinElement.element` or `PinElement.glyph` — append `PinElement` directly and use `glyphText` / `glyphSrc`.
- **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchByText`, or Places API (New) via `/api/places/search`.
- **NEVER** listen to `gmp-placeselect` — listen to `gmp-select`.
- **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes` or Routes API v2 (`routes.googleapis.com`).
- **NEVER** use `google.maps.drawing` — use `terra-draw` + `terra-draw-google-maps-adapter`.
- **NEVER** use `google.maps.visualization.HeatmapLayer` — use deck.gl layers (`HexagonLayer` / `HeatmapLayer`).
- **NEVER** call `places.googleapis.com` or `maps.googleapis.com/maps/api/elevation` directly from browser `fetch()` — route through the FastAPI BFF endpoints.
- **NEVER** use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` — use `document.createElement()`, `textContent`, and `replaceChildren()`.
- **NEVER** hardcode API keys or bind the server to wildcard interfaces; always bind strictly to `127.0.0.1` and keep `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers intact.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `spatial-intelligence` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics (Advanced Spatial Analytics & 3D)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`

### Key Implementation Files

- **Map & Markers:** [`static/app.js`](./static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./static/app.js), [`static/index.html`](./static/index.html)
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
