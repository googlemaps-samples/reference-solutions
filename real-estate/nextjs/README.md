# Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

A Zillow-style San Francisco real estate search, cadastral lot-boundary, and neighborhood commute explorer built with **Next.js App Router + TypeScript**, **`@vis.gl/react-google-maps`**, **Terra Draw**, and server-side **Next.js Route Handlers** proxying **Places API (New)** and **Routes API v2**.

Modern Google Maps Platform classes and services used:
- `AdvancedMarkerElement` (via `@vis.gl/react-google-maps` `<AdvancedMarker>`) & `@googlemaps/markerclusterer` (`MarkerClusterer`)
- `PlaceAutocompleteElement` (`gmp-select` event + `placePrediction.toPlace().fetchFields()`)
- `google.maps.Polygon`, `google.maps.Polyline`, `google.maps.geometry.poly.containsLocation`, and `google.maps.geometry.encoding.decodePath`
- `google.maps.StreetViewPanorama` & `google.maps.StreetViewService`
- Places API (New) REST (`places:searchText` & `places:searchNearby`) via `/api/places/*`
- Routes API v2 REST (`distanceMatrix/v2:computeRouteMatrix` & `directions/v2:computeRoutes`) via `/api/routes/*`
- Terra Draw (`terra-draw` & `terra-draw-google-maps-adapter`) for interactive polygon search-area filtering

---

## Quickstart & API Key Setup

### 1. Obtain a Free Maps Demo Key (Prototyping) or Production Key

For fast zero-billing prototyping, generate a free **Maps Demo Key**:
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your key.

For production deployments:
- Provision an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, and **Street View**.
- Restrict your key by HTTP referrer / server IP and target APIs following the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Cost Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account in production. The Maps Demo Key is intended for prototyping only and has a daily reset limit.

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

---

## Architecture Summary

1. **Dynamic Server Entry (`src/app/page.tsx`)**: Reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (with server fallback to `GOOGLE_MAPS_API_KEY`) and passes it to the client workspace wrapped in `<APIProvider>`.
2. **Synchronized Split-Screen UI (`src/components/`)**:
   - **`TopSearchBar`**: Imperatively mounts `PlaceAutocompleteElement` (`gmp-select`) alongside max-price, min-beds, property-type filters, and live count badge.
   - **`PropertyList` & `RealEstateMap`**: Bidirectional hover and selection synchronization between scrollable property cards and clustered custom HTML price-pill `<AdvancedMarker>` pins (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`).
   - **Cadastral Parcel & Terra Draw Search Area**: Selecting a property renders its cadastral `google.maps.Polygon` lot boundary; clicking **Draw Search Area** activates Terra Draw polygon mode and filters visible homes with `google.maps.geometry.poly.containsLocation`.
   - **`ListingDetailPanel`**: Displays parcel APN/zoning metadata, an embedded `StreetViewPanorama`, live 5 km Schools/Groceries/Transit discovery via `/api/places/nearby`, and a Driving + Transit workplace **Commute Time Calculator** via `/api/routes/matrix` and `/api/routes/compute`.
3. **BFF Route Handlers (`src/app/api/`)**: Proxies CORS-restricted Places API (New) and Routes API v2 endpoints server-side with explicit `X-Goog-Api-Key`, `X-Goog-FieldMask`, and `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0` headers.

### Core Map Snippet

```tsx
<GoogleMap
  mapId="DEMO_MAP_ID"
  defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
  defaultZoom={13}
  mapTypeId={mapTypeId}
  gestureHandling="greedy"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
>
  <ClusteredPropertyMarkers properties={filteredProperties} ... />
  <SelectedParcelPolygon property={selectedProperty} />
</GoogleMap>
```

---

## Documentation References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw Google Maps Example](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Multi-Stack Sample Directory

Explore all standalone implementations of this solution:

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
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
