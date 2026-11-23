# React + Vite + TypeScript (`@vis.gl/react-google-maps`) — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route (`Map3DElement`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PopoverElement`, `PinElement`, `ElevationService`, `Place`, `PlaceAutocompleteElement`)

An interactive **Photorealistic 3D Lake Tahoe Trail Explorer & Camera Tour** built as a 100% standalone React + Vite + TypeScript application using [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) and the modern Google Maps Platform JavaScript SDK.

## Features

- **Photorealistic 3D Terrain (`Map3D` / `Map3DElement`)**: Full-viewport 3D satellite/hybrid terrain around Emerald Bay, Lake Tahoe with live heading, tilt, and range telemetry and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Extruded 3D Trail Polyline (`Polyline3D` / `Polyline3DElement`)**: Renders the Emerald Bay & Rubicon Ridge hiking corridor in bright red `rgb(255, 0, 0)` with `altitudeMode="RELATIVE_TO_GROUND"` and `extruded={true}`.
- **Interactive 3D Viewpoint Markers (`Marker3D` / `Marker3DInteractiveElement` + `PinElement` + `Popover`)**: Five trailhead and overlook pins using `PinElement` (`glyphText`, `background`, `borderColor`) and 3D `Popover` callouts.
- **Guided Camera Tour & Auto-Play (`flyCameraTo`)**: Five preset chapters (`1. Emerald Bay Overview` through `5. Tahoe Summit Panorama`) plus an Auto-Play Tour toggle that smoothly animates `center`, `heading`, `tilt`, and `range`.
- **Live Elevation Profile (`ElevationService`)**: Samples 64 equidistant points along the trail via `ElevationService.getElevationAlongPath` and queries point elevations via `getElevationForLocations` for an interactive SVG chart and distance/ascent/peak metrics.
- **Landmark Search (`Place` & `PlaceAutocompleteElement`)**: Combines an imperatively mounted `PlaceAutocompleteElement` (`gmp-select` -> `placePrediction.toPlace()` -> `place.fetchFields()`) with `AutocompleteSuggestion.fetchAutocompleteSuggestions` and `Place.searchByText` to fly the 3D camera to any Lake Tahoe landmark.

## Setup Instructions

1. **Obtain a Google Maps Platform API Key**
   - For rapid prototyping without billing setup, generate a free zero-billing **Maps Demo Key**:
     [Get a Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - For production deployments, create and restrict an API key in Google Cloud Console:
     [Google Maps Platform API Keys Guide](https://developers.google.com/maps/documentation/javascript/get-api-key?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - Ensure the **Maps JavaScript API**, **Map Tiles API (Photorealistic 3D Tiles)**, **Places API (New)**, and **Elevation API** are enabled.

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY` to your key.

3. **Install Dependencies & Run**
   ```bash
   npm install --no-audit --no-fund
   npx tsc --noEmit
   npm run build
   npx vite preview --host 127.0.0.1 --port 4173 --strictPort
   ```
   For local development with HMR:
   ```bash
   npm run dev
   ```

## Architecture Summary

- **`src/App.tsx`**: Initializes `<APIProvider>` with `libraries={['maps3d', 'marker', 'places', 'elevation']}`, loads the initial `Emerald Bay State Park, Lake Tahoe` seed place via `Place.searchByText`, samples the 3D trail elevation profile via `ElevationService.getElevationAlongPath`, and orchestrates `flyCameraTo` tour animations.
- **`src/components/TrailMap3D.tsx`**: Renders `@vis.gl/react-google-maps/3d` `<Map3D>` (`mode={MapMode.SATELLITE | MapMode.HYBRID}`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`), `<Polyline3D>`, `<Marker3D>` + `<Pin>`, and `<Popover>`.
- **`src/components/TopBar.tsx`**: Houses the landmark search bar (`Place.searchByText` + `AutocompleteSuggestion.fetchAutocompleteSuggestions`), an imperatively mounted `PlaceAutocompleteElement` listening to `gmp-select`, map mode toggle, and live camera telemetry.
- **`src/components/ElevationProfileChart.tsx`**: Interactive SVG elevation chart synced with 3D trail hover markers and click-to-fly camera focus.

### Core 3D Map & Trail Snippet

```tsx
<Map3D
  ref={map3dRef}
  mode={mapMode}
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 38.9542, lng: -120.1103, altitude: 1905 }}
  defaultHeading={315}
  defaultTilt={64}
  defaultRange={3400}
>
  <Polyline3D
    path={TAHOE_TRAIL_3D_PATH}
    altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
    extruded={true}
    strokeColor="rgb(255, 0, 0)"
    strokeWidth={8}
  />
</Map3D>
```

## Documentation References

- [Maps JavaScript API Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/javascript/place-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation Service in Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
