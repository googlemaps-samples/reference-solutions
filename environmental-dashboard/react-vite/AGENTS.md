# Coding Agent Instructions (`react-vite`)

This project implements the **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** using **React + Vite + TypeScript** and **`@vis.gl/react-google-maps`**.

## Modern Google Maps Platform APIs Used

- **SDK Wrapper:** `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `useMap`, `useMapsLibrary`)
- **Attribution & Map ID:** `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`
- **Markers:** `AdvancedMarkerElement` (via `<AdvancedMarker>` + `<Pin>`)
- **Places:** `PlaceAutocompleteElement` mounted imperatively via `useRef` + `useEffect` listening to `gmp-select` -> `event.placePrediction.toPlace().fetchFields(...)`, plus `Place.searchByText(...)`
- **Geocoding:** `google.maps.Geocoder` via `useMapsLibrary('geocoding')`
- **Tile Overlays & Geometry:** Native WebGL-free `google.maps.ImageMapType` on `map.overlayMapTypes` and `google.maps.Rectangle`
- **Environmental REST APIs:**
  - Weather API (`weather.googleapis.com/v1/currentConditions:lookup`, `forecast/days:lookup`)
  - Air Quality API (`airquality.googleapis.com/v1/currentConditions:lookup`, `mapTypes/US_AQI/heatmapTiles/{z}/{x}/{y}`)
  - Pollen API (`pollen.googleapis.com/v1/forecast:lookup`)
  - Solar API (`solar.googleapis.com/v1/buildingInsights:findClosest`)

## Non-Negotiable Rules for Future Edits

1. **NEVER introduce deprecated or disabled Google Maps Platform APIs:**
   - NEVER use `google.maps.Marker` or `<Marker>` — always use `AdvancedMarkerElement` / `<AdvancedMarker>`.
   - NEVER use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — always use `PlaceAutocompleteElement` (`gmp-select`), `AutocompleteSuggestion`, or `Place`.
   - NEVER listen to retired `gmp-placeselect` — always use `gmp-select`.
   - NEVER use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — always use `Route.computeRoutes` / Routes API v2.
   - NEVER use `google.maps.visualization.HeatmapLayer` or `google.maps.drawing`.
   - NEVER use `PinElement.element` or `PinElement.glyph` — pass `PinElement` directly with `glyphText` / `glyphSrc`.
2. **NEVER install banned wrapper packages:**
   - Do not install `google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, or `@googlemaps/extended-component-library` (`<gmpx-*>`).
3. **Avoid `Map` Identifier Shadowing:**
   - Always alias `import { Map as GoogleMap } from '@vis.gl/react-google-maps'` when importing the map component so JavaScript's built-in `Map` constructor is never shadowed.
4. **Security & Attribution:**
   - Never hardcode any API key in source files or `.env.example`; read strictly from `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
   - Always preserve `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>` and explicit non-zero CSS height (`>= 520px`) on `[data-testid="map-container"]`.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `environmental-dashboard` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (Environmental & Civic Intelligence)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK + Browser CORS REST
- **API Key Tier:** Billed Google Cloud key required (Air Quality API, Pollen API, Solar API)
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Map & Markers:** [`src/components/EnvironmentalMap.tsx`](./src/components/EnvironmentalMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/EnvironmentalMap.tsx`](./src/components/EnvironmentalMap.tsx), [`src/components/PlacesSearchInput.tsx`](./src/components/PlacesSearchInput.tsx), [`src/services/environmentalApi.ts`](./src/services/environmentalApi.ts)
- **App Entry & Config:** [`index.html`](./index.html), [`src/App.tsx`](./src/App.tsx), [`vite.config.ts`](./vite.config.ts)

### Verified Commands

```bash
# Install
npm install --no-audit --no-fund
# Typecheck
npx tsc --noEmit
# Build
npm run build
# Serve (loopback 127.0.0.1)
npx vite preview --host 127.0.0.1 --port 4172 --strictPort
```

### Navigation & Sibling Implementations

- **Parent Solution:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../verification_report.md`](../verification_report.md)
- **Catalog Routers:** [`../../AGENTS.md`](../../AGENTS.md) · [`../../BY_API.md`](../../BY_API.md) · [`../../BY_FRAMEWORK.md`](../../BY_FRAMEWORK.md) · [`../../INDEX.md`](../../INDEX.md)
- **Other Frameworks:** [`static-vanilla-js`](../static-vanilla-js/AGENTS.md), [`nextjs`](../nextjs/AGENTS.md), [`sveltekit`](../sveltekit/AGENTS.md), [`vue-vite`](../vue-vite/AGENTS.md), [`angular`](../angular/AGENTS.md), [`python-fastapi`](../python-fastapi/AGENTS.md), [`nodejs-web`](../nodejs-web/AGENTS.md)
<!-- END GMP-AGENT-REFERENCE -->
