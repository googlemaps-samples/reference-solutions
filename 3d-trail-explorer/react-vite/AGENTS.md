# Agent Guidelines — Lake Tahoe 3D Trail Explorer (`react-vite`)

This repository uses **only modern, non-deprecated Google Maps Platform APIs** via `@vis.gl/react-google-maps` (`^1.10.2`) and `@types/google.maps`.

## Modern Google Maps Platform APIs Used

- **Initialization & Attribution:** `<APIProvider>` from `@vis.gl/react-google-maps` with `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map3D>` and `Place.searchByText` / `PlaceAutocompleteElement`.
- **Photorealistic 3D Maps (`maps3d`):** `Map3D` (`Map3DElement` / `<gmp-map-3d>`), `Polyline3D` (`Polyline3DElement`), `Marker3D` (`Marker3DInteractiveElement`), `Popover` (`PopoverElement`), `MapMode`, `AltitudeMode`, and `flyCameraTo`.
- **Modern Markers (`marker`):** `Pin` / `PinElement` using `glyphText`, `background`, `borderColor`, and `glyphColor` (and `AdvancedMarkerElement` if adding 2D map markers).
- **Places API (New) (`places`):**
  - Imperatively mounted `PlaceAutocompleteElement` listening to `gmp-select` (`event.placePrediction.toPlace()` + `place.fetchFields()`).
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions` with `AutocompleteSessionToken`.
  - `Place.searchByText` with explicit `fields` masks.
- **Elevation (`elevation`):** `ElevationService.getElevationAlongPath` and `ElevationService.getElevationForLocations`.
- **Routing (if added in future):** Use `Route.computeRoutes` (`importLibrary('routes')`), never legacy services.

## Strict Zero-Deprecation Rules for Future Agents

1. **NEVER** use `google.maps.Marker` — use `Marker3DInteractiveElement` (3D) or `AdvancedMarkerElement` (2D).
2. **NEVER** use `google.maps.places.Autocomplete`, `SearchBox`, `PlacesService`, or `AutocompleteService` — use `PlaceAutocompleteElement`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `Place.searchByText`, and `Place.fetchFields`.
3. **NEVER** listen to retired `gmp-placeselect` — always listen to `gmp-select`.
4. **NEVER** use `DirectionsService`, `DirectionsRenderer`, or `DistanceMatrixService` — use `Route.computeRoutes`.
5. **NEVER** use `PinElement.element` or `PinElement.glyph` — use `PinElement` directly with `glyphText` / `glyphSrc`.
6. **NEVER** install banned wrappers (`google-map-react`, `@react-google-maps/api`, `use-places-autocomplete`, `@googlemaps/react-wrapper`, `@googlemaps/extended-component-library`).
7. **NEVER** hardcode API keys in source files or `.env.example`; always read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
8. **NEVER** shadow JavaScript's built-in `Map` constructor when importing `{ Map }` from `@vis.gl/react-google-maps`; use `Record<string, T>` or alias the import.

<!-- BEGIN GMP-AGENT-REFERENCE -->
---

## Quick Reference Metadata (Auto-Extracted)

- **Solution:** `3d-trail-explorer` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (Advanced Spatial Analytics & 3D)
- **Framework:** `react-vite` (React + Vite + TypeScript (@vis.gl/react-google-maps))
- **Transport Mode:** Client JS SDK
- **API Key Tier:** Billed Google Cloud key required (Elevation API (REST))
- **Environment Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
- **Detected JS Libraries:** `elevation`, `maps3d`, `places`
- **Geo Libraries:** None

### Key Implementation Files

- **Places, Routes & Geo Services:** [`src/App.tsx`](./src/App.tsx), [`src/components/TopBar.tsx`](./src/components/TopBar.tsx)
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
