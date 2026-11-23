# AGENTS.md — Google Maps Platform Engineering Guardrails

This standalone `python-fastapi` sample implements the **Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer** using strictly modern, non-deprecated Google Maps Platform APIs and secure Backend-for-Frontend (BFF) patterns.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`google.maps.importLibrary`, `mapId: 'DEMO_MAP_ID'`)**
  - Usage attribution ID `gmp_git_agentsamples_v1.0.0` configured in both the dynamic loader bootstrap and `MapOptions.internalUsageAttributionIds`.
  - `google.maps.Polygon` and `google.maps.Polyline` for cadastral parcel outlines and commute routes.
- **Advanced Markers & Clustering**
  - `AdvancedMarkerElement` (`importLibrary('marker')`) using `marker.append(htmlElement)` for custom HTML price-pill pins.
  - `@googlemaps/markerclusterer` (`MarkerClusterer`) with custom `AdvancedMarkerElement` cluster badges.
- **Places API (New)**
  - Client-side `PlaceAutocompleteElement` (`importLibrary('places')`) listening to `gmp-select` + `event.placePrediction.toPlace()` + `place.fetchFields()`.
  - Server-side FastAPI BFF endpoints (`/api/places/search-text` and `/api/places/nearby`) calling `https://places.googleapis.com/v1/places:searchText` and `https://places.googleapis.com/v1/places:searchNearby` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask` headers.
- **Routes API v2**
  - Server-side FastAPI BFF endpoints (`/api/routes/matrix` and `/api/routes/compute`) calling `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` and `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` headers (`RouteMatrix` / `Route.computeRoutes` pattern).
- **Street View, Geometry & Geocoding**
  - `StreetViewPanorama` + `StreetViewService` (`importLibrary('streetView')`).
  - `geometry.poly.containsLocation` + `geometry.encoding.decodePath` (`importLibrary('geometry')`).
  - `Geocoder` (`importLibrary('geocoding')`).
- **Terra Draw**
  - `terra-draw` + `terra-draw-google-maps-adapter` for user-drawn search-area polygons.

## Mandatory Rules for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`, or `Place.searchNearby`).
   - NEVER listen to retired `gmp-placeselect` (use `gmp-select`).
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use Routes API `computeRoutes` / `computeRouteMatrix`).
   - NEVER use `google.maps.drawing` (use Terra Draw) or `google.maps.visualization.HeatmapLayer`.
   - NEVER use `@googlemaps/js-api-loader` v1 `new Loader().load()` or `PinElement.element` / `PinElement.glyph`.
   - NEVER import banned wrapper libraries or `<gmpx-*>` extended component library tags.
2. **Security & Compliance:**
   - NEVER hardcode `GOOGLE_MAPS_API_KEY` in source files or commit `.env`.
   - NEVER call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com` REST endpoints directly from browser `fetch()` (always route through FastAPI `/api/*` BFF endpoints).
   - NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML` in `static/` files; always use `document.createElement()`, `textContent`, and `replaceChildren()`.
   - ALWAYS keep `127.0.0.1` binding and `X-Content-Type-Options: nosniff` / `X-Frame-Options: SAMEORIGIN` headers.
   - NEVER hardcode synthetic place ratings, customer reviews, or opening hours.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `real-estate` — Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer (Real Estate & Property Mapping)
- **Framework:** `python-fastapi` (Python FastAPI Backend + Interactive Web Frontend)
- **Transport Mode:** Full-Stack Server BFF
- **API Key Tier:** Maps Demo Key supported (prototyping only)
- **Environment Variable:** `GOOGLE_MAPS_API_KEY` in `.env`
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Server `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`

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
