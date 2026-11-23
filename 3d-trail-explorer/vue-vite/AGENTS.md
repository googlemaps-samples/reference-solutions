# AGENTS.md — Google Maps Platform Modern API Mandates

This `vue-vite` sample implements the **Lake Tahoe 3D Trail Explorer** using modern, non-deprecated Google Maps Platform APIs and Web Components. Future coding agents modifying this repository **MUST** preserve these standards and **NEVER** introduce deprecated or disabled Google Maps APIs.

## Modern Google Maps Platform APIs Used

- **Loader**: `@googlemaps/js-api-loader` v2 functional API (`setOptions()` + `importLibrary()`). NEVER use deprecated `new Loader(...).load()`.
- **3D Map & Overlays (`maps3d` library)**:
  - `<gmp-map-3d>` / `Map3DElement` with `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"` (`internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`).
  - `Polyline3DElement` (`strokeColor: 'rgb(255, 0, 0)'`, `altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`).
  - `Marker3DInteractiveElement`, `Marker3DElement`, and `PopoverElement` with `gmp-click` listeners.
- **Markers (`marker` library)**:
  - `PinElement` using `glyphText` / `glyphSrc` (and `AdvancedMarkerElement` if 2D maps are added). NEVER use deprecated `google.maps.Marker`, `PinElement.element`, or `PinElement.glyph`.
- **Places (`places` library — Places API (New))**:
  - `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`). NEVER listen to retired `gmp-placeselect`.
  - `Place.searchByText()` and `Place.fetchFields()`. NEVER use legacy `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService`.
- **Elevation (`elevation` library)**:
  - `ElevationService.getElevationAlongPath()` and `ElevationService.getElevationForLocations()`.
- **Routing (if added later)**:
  - Use `Route.computeRoutes()` (`routes` library) instead of legacy `DirectionsService` / `DirectionsRenderer` / `DistanceMatrixService`.

## Security & Compliance Rules

1. NEVER hardcode API keys in source files or `.env.example`. Always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
2. NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`; build DOM nodes with `document.createElement()`, `textContent`, and `append()` / `replaceChildren()`.
3. NEVER call `places.googleapis.com`, `routes.googleapis.com`, or `maps.googleapis.com` REST endpoints directly via browser `fetch()` (CORS trap); always use the Maps JS SDK libraries.
4. Keep `gmp_git_agentsamples_v1.0.0` configured in `internalUsageAttributionIds` / `internal-usage-attribution-ids`.
5. Keep Vite configured with `isCustomElement: (tag) => tag.startsWith('gmp-')` and bind dev/preview servers strictly to `127.0.0.1`.
6. Never hardcode fake place ratings, reviews, or opening hours—always fetch live data from Places API (New) and Elevation API at runtime.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/App.vue`](./src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./src/App.vue)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.vue`](./src/App.vue), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx vue-tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4175 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`react-vite`](../react-vite/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
