# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — React + Vite + TypeScript (`@vis.gl/react-google-maps`)

A standalone Miami civic flood/storm hazard monitor, citizen incident reporter, and safe-shelter evacuation router built with **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** using **deck.gl `HeatmapLayer` (`GoogleMapsOverlay`)**, **`AdvancedMarker` / `Pin` (`AdvancedMarkerElement`)**, **`PlaceAutocompleteElement` (`gmp-select`)**, **`Place.searchByText` (Places API New)**, **`Route.computeRoutes` (Routes API)**, **`Geocoder`**, **`ElevationService`**, **`geometry.poly`**, and **Weather API (`currentConditions:lookup`)**.

---

## Features & Modern Google Maps Platform Architecture

- **Interactive Vector Map (`@vis.gl/react-google-maps`)**: Centered in Downtown Miami (`25.7743, -80.1937`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **High-Density Hazard Heatmap (`deck.gl HeatmapLayer` via `GoogleMapsOverlay`)**: Visualizes reported storm and flooding incidents across Brickell, Edgewater, Little Havana, and Miami Beach, with automatic WebGL2 preflight detection and graceful 2D Google Maps `Circle` fallback in headless/non-WebGL2 environments.
- **Active Flood-Hazard Zone Polygons**: Semi-transparent coastal surge and canal flood-basin `Polygon` overlays with click-through incident reporting.
- **Parallel Civic Incident Enrichment**: Clicking anywhere on the map (or selecting an address via `PlaceAutocompleteElement` listening to `gmp-select`) drops an `AdvancedMarker` and queries:
  1. `Geocoder` (`geocoding` library) — reverse-geocoded street address
  2. `ElevationService` (`elevation` library) — terrain elevation in meters above sea level
  3. Weather API v1 (`https://weather.googleapis.com/v1/currentConditions:lookup`) — live wind speed, gusts, direction, and precipitation probability/QPF
- **Emergency Shelter Discovery (`Place.searchByText`)**: Fetches live Miami hospitals and community centers, displays `AdvancedMarker` + `Pin` markers and an interactive `InfoWindow`, and highlights whether each shelter lies outside active flood zones.
- **Flood-Zone-Bypass Evacuation Routing (`Route.computeRoutes` + `geometry.poly`)**: Calculates a driving route from the incident/origin to the selected shelter, checks polygon intersection via `google.maps.geometry.poly.containsLocation`, and injects a safe perimeter `via: true` intermediate waypoint when needed to detour around active flood zones.

### Core Integration Snippet

```tsx
import { APIProvider, Map as GoogleMap } from '@vis.gl/react-google-maps';

<APIProvider apiKey={apiKey} version="weekly" language="en" region="US">
  <GoogleMap
    defaultCenter={{ lat: 25.7743, lng: -80.1937 }}
    defaultZoom={13}
    mapId="DEMO_MAP_ID"
    internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
    onClick={handleMapClick}
    style={{ width: '100%', height: '100%' }}
  >
    <DeckGlHeatmapOverlay incidents={incidents} visible={showHeatmap} />
    <FloodZonePolygons zones={MIAMI_FLOOD_ZONES} visible={showPolygons} />
    <EvacuationRouteLayer route={activeRoute} />
    <ShelterMarkers shelters={shelters} incidentLocation={incidentDraft?.location ?? null} />
  </GoogleMap>
</APIProvider>
```

---

## Quickstart & API Key Setup

### 1. Obtain a Free Prototyping Key (Maps Demo Key)

For zero-cost prototyping (no billing account or Google Cloud project setup required):
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with your Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo API key.

For production deployments, create and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) (follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0)), and enable:
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-api-key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot module replacement:

```bash
npm run dev
```

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Compliance & Terms

Use of Google Maps Platform APIs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and may incur charges on Google Cloud billing accounts in production. This application is intended solely for civic situational awareness and planning, not for life-safety emergency dispatch.

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
