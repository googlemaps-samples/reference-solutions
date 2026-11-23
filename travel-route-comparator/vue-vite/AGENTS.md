# AGENTS.md — Coding Agent Mandates for `vue-vite`

This project implements the **Multi-Modal Commute Comparator & Trail Elevation Tracker** using **Vue 3 + Vite + TypeScript** and strictly modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **`@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`)**: Dynamic library loading (`core`, `maps`, `marker`, `places`, `routes`, `elevation`).
- **`google.maps.Map`** with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **`google.maps.marker.AdvancedMarkerElement` & `PinElement`**: Uses `glyphText` and `marker.append(element)` for origin, destination, and elevation hover indicators.
- **`PlaceAutocompleteElement` (`<gmp-place-autocomplete>`)**: Configured with Vue `isCustomElement: (tag) => tag.startsWith('gmp-')`, listening to `gmp-select` → `event.placePrediction.toPlace()` → `place.fetchFields()`.
- **`Place.searchByText()` (Places API New)**: Resolves seeded endpoints (`Denver Union Station, Denver, CO` and `Chautauqua Park, Boulder, CO`).
- **`Route.computeRoutes()` (Routes API JS)**: Computes multi-modal routes (`DRIVING`, `BICYCLING`, `WALKING`, `TRANSIT`) with explicit `fields`, `computeAlternativeRoutes`, `routeModifiers`, `extraComputations`, and `requestedReferenceRoutes: ['FUEL_EFFICIENT']`.
- **`ElevationService.getElevationAlongPath()`**: Samples 64 equidistant elevation points along the active cycling/walking route path.

## Hard Prohibitions for Future Coding Agents

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - Do NOT use `google.maps.Marker` (use `AdvancedMarkerElement`).
   - Do NOT use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` (use `PlaceAutocompleteElement`, `AutocompleteSuggestion`, `Place.searchByText`).
   - Do NOT listen to retired `gmp-placeselect` (always use `gmp-select`).
   - Do NOT use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` (use `Route.computeRoutes` / `RouteMatrix`).
   - Do NOT use `new Loader(...).load()` from `@googlemaps/js-api-loader` v1 (use `setOptions()` + `importLibrary()`).
   - Do NOT use `PinElement.element` or `PinElement.glyph` (pass `PinElement` directly and use `glyphText` / `glyphSrc`).
   - Do NOT use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
2. **NEVER hardcode API keys** in source files or `.env.example` (always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`).
3. **NEVER call `googleapis.com` REST endpoints directly via browser `fetch()`** (avoid CORS failures; use the Maps JS SDK libraries).
4. **NEVER use `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`** (use Vue templates or `document.createElement` + `textContent`).
5. **NEVER hardcode fake place ratings, reviews, or opening hours** from LLM memory.
6. **ALWAYS keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`** and explicit map container height (`min-height: 540px`).

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `travel-route-comparator` — Multi-Modal Commute Comparator & Trail Elevation Tracker (Travel, Navigation & Itineraries)
- **Framework:** `vue-vite` (Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/App.vue`](./src/App.vue)
- **Places, Routes & Geo Services:** [`src/components/PlaceSearchInput.vue`](./src/components/PlaceSearchInput.vue), [`src/services/mapsClient.ts`](./src/services/mapsClient.ts)
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
