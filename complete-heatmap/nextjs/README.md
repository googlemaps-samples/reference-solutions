# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)

Built with **`@vis.gl/react-google-maps`** (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`), **`deck.gl` `HeatmapLayer` via `GoogleMapsOverlay`**, **`PlaceAutocompleteElement` (`gmp-select`)**, **`geometry.poly` / `geometry.encoding`**, and Next.js App Router **`/api/*` Route Handlers** proxying **Places API (New)**, **Routes API v2**, **Geocoding API**, **Elevation API**, and **Weather API**.

## Architecture Summary

- **Interactive Vector Map & Heatmap (`src/components/HazardMapCanvas.tsx`, `src/components/DeckGlHeatmapOverlay.tsx`)**: Renders a Miami-centered (`25.7743, -80.1937`, zoom `13`) 2D vector Google Map (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`) overlaid with a WebGL2 `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay` (including a graceful 2D circle fallback when WebGL2 is unavailable in headless environments) and active flood-hazard `Polygon` zones.
- **Parallel Incident Enrichment (`src/components/StormWatchDashboard.tsx`)**: Clicking the map or selecting an address via `PlaceAutocompleteElement` (`src/components/PlaceAutocompleteBox.tsx`) drops an `AdvancedMarker` origin pin and triggers parallel BFF requests to `/api/geocode/reverse`, `/api/elevation`, and `/api/weather/current`. Submitted civic reports dynamically append to the `HeatmapLayer`.
- **Flood-Avoidance Evacuation Routing (`src/lib/flood-routing.ts`)**: Searches nearby Miami hospitals and community centers via `/api/places/search` (`places.googleapis.com/v1/places:searchText`), renders them with `<Pin>` `<AdvancedMarker>` pins, computes routes via `/api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes`), inspects polyline intersections against flood polygons with `google.maps.geometry.poly.containsLocation`, and injects safe perimeter `via: true` waypoints when needed.

### Core Implementation Snippet (`DeckGlHeatmapOverlay` + `GoogleMapsOverlay`)

```tsx
const overlay = new GoogleMapsOverlay({ interleaved: false, layers: [] });
overlay.setMap(map);
overlay.setProps({
  layers: [
    new HeatmapLayer<HazardIncident>({
      id: 'miami-hazard-heatmap',
      data: incidents,
      getPosition: (d) => [d.lng, d.lat],
      getWeight: (d) => d.weight,
      radiusPixels: 48,
    }),
  ],
});
```

## Quickstart & API Key Setup

1. **Obtain an API Key (Free Prototyping with Maps Demo Key):**
   - Open [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) and sign in with a Google account (no billing setup required for prototyping).
   - Accept the Maps Demo Project Terms and copy the generated key.
   - Alternatively, for production, create and restrict a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, **Elevation API**, and **Weather API**.

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   # Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
   ```

3. **Install, Typecheck, Build & Start:**
   ```bash
   npm install --no-audit --no-fund
   npx tsc --noEmit
   npm run build
   npx next start --hostname 127.0.0.1 --port 3000
   ```

## Google Maps Platform Documentation

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Overview](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Weather API Overview](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
