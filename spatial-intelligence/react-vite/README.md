# React + Vite + TypeScript (@vis.gl/react-google-maps) — `Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `ElevationService` — Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics

An enterprise Web GIS spatial analytics workbench centered on New York City (`40.73061, -73.98661`), integrating:

- **Google Maps JavaScript API** via [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Live Basemap Switcher**: Switch between `roadmap`, `satellite`, `hybrid`, and `terrain` basemaps in real time.
- **GeoJSON Infrastructure Districts Layer**: Dedicated `google.maps.Data` layer rendering NYC infrastructure districts styled by capacity load (`Optimal <66%`, `Elevated 66–81%`, `Critical ≥82%`) with smooth `map.fitBounds()` zoom-on-select.
- **WebGL-Accelerated deck.gl Overlay**: Toggleable `ScatterplotLayer` and `HexagonLayer` via `GoogleMapsOverlay` visualizing 2,400 NYC infrastructure sensor nodes with a pre-flight WebGL2 capability check for zero-error graceful fallback in headless environments.
- **Interactive Terra Draw Polygon Tool**: Powered by `terra-draw` and `terra-draw-google-maps-adapter` (`TerraDrawPolygonMode`, `TerraDrawSelectMode`, `TerraDrawRenderMode`) to draw and edit custom study zones, compute point-in-polygon metrics, and measure geodesic area.
- **Terrain Elevation Inspector**: Live `ElevationService.getElevationForLocations()` profiling across Terra Draw polygon vertices, district boundaries, or a NYC harbor transect.
- **Places API (New)**: Imperative `PlaceAutocompleteElement` (`gmp-select` event) for location jumping and `Place.searchByText()` for live NYC civic transit hub reference markers.

## Quickstart & Maps Demo Key Setup

### 1. Obtain an API Key

**Option A — Free Maps Demo Key (Prototyping, Zero Billing Setup):**
1. Open [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and click to generate/reveal your key.
   *(Note: Maps Demo Keys have a daily reset limit and are intended for prototyping only.)*

**Option B — Google Cloud Console Key (Production):**
1. Create or select a project in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Restrict your API key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set:
# VITE_GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
npm run dev
```

### 3. Typecheck, Build & Preview

```bash
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture Summary

| Module | Responsibility |
| --- | --- |
| [`src/App.tsx`](./src/App.tsx) | Root state, `<APIProvider>`, `<Map>`, `MapServicesBridge` (`Place.searchByText`, `ElevationService`), and `<AdvancedMarker>` civic hubs. |
| [`src/components/GeoJsonDistrictLayer.tsx`](./src/components/GeoJsonDistrictLayer.tsx) | Isolated `google.maps.Data` layer for NYC district polygons styled by capacity tier. |
| [`src/components/DeckGlSensorsOverlay.tsx`](./src/components/DeckGlSensorsOverlay.tsx) | WebGL2-guarded `GoogleMapsOverlay` rendering `ScatterplotLayer` and `HexagonLayer`. |
| [`src/components/TerraDrawController.tsx`](./src/components/TerraDrawController.tsx) | `TerraDraw` + `TerraDrawGoogleMapsAdapter` lifecycle for custom polygon study zones. |
| [`src/components/PlaceAutocompleteControl.tsx`](./src/components/PlaceAutocompleteControl.tsx) | Imperative `PlaceAutocompleteElement` mounted via `useRef` + `useEffect` (`gmp-select`). |
| [`src/utils/geometry.ts`](./src/utils/geometry.ts) | Ray-casting point-in-polygon filtering, geodesic area (`km²`), bounds, and WebGL2 detection. |

### Core Implementation Snippet

```tsx
<APIProvider apiKey={apiKey} libraries={['places', 'marker', 'elevation']} language="en" region="US">
  <GoogleMap
    defaultCenter={{ lat: 40.73061, lng: -73.98661 }}
    defaultZoom={12}
    mapId="DEMO_MAP_ID"
    mapTypeId={basemap}
    internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
    gestureHandling="greedy"
  >
    <GeoJsonDistrictLayer visible={showGeoJson} selectedDistrictId={selectedDistrictId} onSelectDistrict={handleSelectDistrict} />
    <DeckGlSensorsOverlay allSensors={NYC_SENSORS} activeSensorIds={activeSensorIds} mode={deckMode} isDrawingMode={drawMode !== 'static'} />
    <TerraDrawController activeMode={drawMode} clearSignal={clearDrawSignal} onPolygonsChange={handlePolygonsChange} />
  </GoogleMap>
</APIProvider>
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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
