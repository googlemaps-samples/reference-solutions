# React + Vite + TypeScript (`@vis.gl/react-google-maps`) — `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `RouteMatrix`, `Route`, `StreetViewPanorama`: Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer

A Zillow-style split-screen San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer built with **React 19**, **Vite**, **TypeScript**, and the official [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) SDK.

## Features & Modern Google Maps Platform APIs

- **Interactive Vector Map & Cloud Map ID (`@vis.gl/react-google-maps`)**: Renders a full-height vector map with `mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`, and a live **Roadmap / Satellite** toggle.
- **Custom HTML Price-Pill `AdvancedMarkerElement` & Clustering (`@googlemaps/markerclusterer`)**: Renders synchronized HTML price pills (`$1.49M`, `$2.7M`, etc.) with bidirectional card/marker hover highlighting and automatic marker clustering.
- **Cadastral Lot / Parcel Outlines (`google.maps.Polygon`)**: Highlights the selected property's lot boundary polygon and assessor metadata (APN, zoning, lot square footage) directly on the map.
- **Polygon Search-Area Filter (`terra-draw` + `terra-draw-google-maps-adapter` + `google.maps.geometry.poly.containsLocation`)**: Allows users to draw a custom search polygon on the map using Terra Draw and filter visible homes in real time.
- **Location Autocomplete (`PlaceAutocompleteElement`)**: Imperatively mounted Google Maps Places UI widget listening to the modern `gmp-select` event (`event.placePrediction.toPlace()` + `place.fetchFields()`).
- **Embedded Street View Preview (`StreetViewPanorama` + `StreetViewService`)**: Displays an interactive 360° street-level panorama for the selected property.
- **5 km Neighborhood Amenities (`Place.searchNearby`)**: Discovers nearby schools, grocery stores, and transit stations within a 5 km radius using Places API (New) with category tabs and distance sorting.
- **Workplace Commute Time Calculator (`RouteMatrix.computeRouteMatrix` + `Route.computeRoutes`)**: Resolves workplace destinations via `Place.searchByText` (with `Geocoder` fallback) and computes live **Driving (Traffic-Aware)** and **Public Transit** ETAs plus a map route polyline overlay.

## Architecture Summary

```text
src/
├── App.tsx                       # <APIProvider>, filter & Terra Draw containment orchestration
├── types.ts                      # Property, Parcel, Amenity, and CommuteEstimate types
├── data/properties.ts            # San Francisco property listings & cadastral parcel polygons
└── components/
    ├── TopSearchBar.tsx          # Imperative PlaceAutocompleteElement + price/bed/type filters
    ├── PropertyList.tsx          # Synchronized scrollable property cards with hover/selection
    ├── ListingDetailPanel.tsx    # Parcel stats, StreetViewPanorama, 5km Places, RouteMatrix calculator
    └── RealEstateMap.tsx         # <Map>, ClusteredPropertyMarkers, ParcelPolygonLayer, TerraDraw
```

### Core Implementation Snippet

```tsx
<APIProvider
  apiKey={apiKey}
  language="en"
  region="US"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
>
  <GoogleMap
    mapId="DEMO_MAP_ID"
    internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
    defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
    defaultZoom={13}
    mapTypeId={mapTypeId}
    gestureHandling="greedy"
  >
    <ParcelPolygonLayer selectedProperty={selectedProperty} hoveredProperty={hoveredProperty} />
    <TerraDrawPolygonFilter isDrawing={isDrawing} onPolygonCompleted={handlePolygonCompleted} />
    <ClusteredPropertyMarkers properties={filteredProperties} ... />
  </GoogleMap>
</APIProvider>
```

## Setup & Local Development

### 1. Obtain an API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project setup required).
3. Accept the Maps Demo Project Terms and generate your key. *(Note: Demo Keys have a daily reset quota and are strictly for prototyping, not production.)*

**Option B — Production Google Cloud API Key:**
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer and enabled APIs.

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot module replacement:

```bash
npm run dev
```

## Documentation References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) in Maps JS](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Route Matrix](https://developers.google.com/maps/documentation/javascript/route-matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
