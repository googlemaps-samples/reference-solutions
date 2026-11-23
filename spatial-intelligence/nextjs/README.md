# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Places API (New)`, `Elevation API`)

An enterprise Web GIS spatial analytics workbench centered on New York City (`40.73061, -73.98661`) built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, **deck.gl (`GoogleMapsOverlay`)**, **Terra Draw**, and server-side **Route Handlers** proxying Google Maps Platform REST APIs.

## Features

- **Interactive Google Map & Basemap Switcher:** Powered by [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) with `mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`, and live switching between `roadmap`, `satellite`, `hybrid`, and `terrain` basemaps.
- **GeoJSON Infrastructure Capacity Districts:** Renders 8 NYC capacity districts on the Google Maps `Data` layer, dynamically styled by grid load (`Optimal`, `Elevated`, `Critical`) with smooth `map.fitBounds()` zoom-on-select.
- **High-Density deck.gl Analytics (`GoogleMapsOverlay`):** Visualizes 2,400 NYC infrastructure sensor nodes using toggleable `ScatterplotLayer` and `HexagonLayer` modes with automatic WebGL2 availability detection for graceful fallback in headless environments.
- **Interactive Terra Draw Polygon Filtering:** Uses `terra-draw` and `terra-draw-google-maps-adapter` so analysts can draw or edit custom study-zone polygons to filter sensor points in real time, compute polygon area (km²), and calculate average/peak capacity metrics.
- **Terrain Elevation Inspector (Elevation API):** Queries terrain elevation (min / mean / max meters AMSL and resolution) via a server-side Next.js Route Handler (`/api/elevation`) proxying the [Google Maps Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Live NYC Civic Reference Hubs & Location Jump:** Combines a server-side `/api/places/search` Route Handler calling [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) with an imperatively mounted `PlaceAutocompleteElement` (`gmp-select` + `place.fetchFields()`), rendered via `AdvancedMarkerElement` (`<AdvancedMarker>` + `<Pin>`).

## Quickstart & Maps Demo Key Setup

### 1. Obtain an API Key (Zero-Billing Demo Key or Cloud Console)

For prototyping without configuring billing or a Google Cloud project, obtain a free **Maps Demo Key**:

1. Open [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your demo key.

For production workloads, provision and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**. Follow the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer (client) and server IP / designated APIs.

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_copied_api_key
```

### 3. Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`.

## Architecture Summary

- **`src/app/page.tsx` & `src/components/GisWorkbench.tsx`:** Server Component passes `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to the split-screen `'use client'` GIS workbench wrapped in a single `<APIProvider>`.
- **`src/components/DistrictGeoJsonLayer.tsx`:** Loads NYC GeoJSON capacity polygons into `map.data` and syncs selection/hover styles.
- **`src/components/DeckGlOverlay.tsx`:** Mounts `GoogleMapsOverlay` with `ScatterplotLayer` and `HexagonLayer`, guarded by WebGL2 capability detection.
- **`src/components/TerraDrawController.tsx`:** Initializes `TerraDraw` with `TerraDrawGoogleMapsAdapter` once `map.getProjection()` is ready, enabling polygon creation and vertex editing.
- **`src/components/PlaceSearchBox.tsx`:** Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect`, listening for `gmp-select` and invoking `placePrediction.toPlace().fetchFields(...)`.
- **`src/app/api/places/search/route.ts` & `src/app/api/elevation/route.ts`:** Next.js Route Handlers acting as secure Backend-for-Frontend (BFF) proxies for `places.googleapis.com/v1/places:searchText` (with explicit `X-Goog-FieldMask`) and `maps.googleapis.com/maps/api/elevation/json`.

### Core Implementation Snippet

```tsx
<APIProvider
  apiKey={apiKey}
  libraries={['core', 'maps', 'marker', 'places', 'elevation']}
>
  <GoogleMap
    mapId="DEMO_MAP_ID"
    internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
    defaultCenter={{ lat: 40.73061, lng: -73.98661 }}
    defaultZoom={12}
    mapTypeId={basemap}
    gestureHandling="greedy"
    style={{ width: '100%', height: '100%', minHeight: '560px' }}
  >
    <DistrictGeoJsonLayer
      visible={showGeoJson}
      selectedDistrictId={selectedDistrictId}
      onSelectDistrict={handleSelectDistrict}
    />
    <DeckGlOverlay
      points={NYC_SENSOR_POINTS}
      highlightedIds={highlightedIds}
      mode={deckMode}
      visible={showDeckGl}
    />
    <TerraDrawController
      activeMode={drawMode}
      clearTrigger={clearDrawTrigger}
      onPolygonChange={handleTerraPolygonChange}
    />
  </GoogleMap>
</APIProvider>
```

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Terms of Service & Licensing

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Review the [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) for product documentation and usage guidelines.

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
