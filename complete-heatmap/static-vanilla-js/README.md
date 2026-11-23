# Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)

Interactive Miami flood/storm hazard monitor, citizen incident reporter, and safe-shelter evacuation router built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern Google Maps Platform APIs (`Map`, `AdvancedMarkerElement`, `PinElement`, `Place.searchByText`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `Geocoder`, `ElevationService`, `geometry.poly`, Weather API `currentConditions:lookup`, and `deck.gl` `HeatmapLayer` via `GoogleMapsOverlay`).

---

## Features & Architecture

1. **Interactive Vector Map & Flood-Hazard Polygons (`Maps JavaScript API`)**
   - Centered in Downtown Miami (`25.7743, -80.1937`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
   - Displays semi-transparent active flood-hazard zone polygons with layer visibility toggles (`HeatmapLayer` and `Flood Zones`).
2. **High-Density Incident Heatmap (`deck.gl` `HeatmapLayer` + `GoogleMapsOverlay`)**
   - Renders storm and flood incident density in WebGL2 via `@deck.gl` `GoogleMapsOverlay`, with an automatic 2D density-halo fallback for headless or non-WebGL2 environments.
   - Logging a new hazard report dynamically clones and updates the `HeatmapLayer` in real time.
3. **Geotagged Civic Incident Reporter (`Geocoder`, `ElevationService`, `Weather API`)**
   - Clicking anywhere on the map places an `AdvancedMarkerElement` (`PinElement`) and enriches the location in parallel via:
     - **Geocoding API** (`Geocoder.geocode`) for street address
     - **Elevation API** (`ElevationService.getElevationForLocations`) for terrain elevation in meters above mean sea level
     - **Weather API** (`https://weather.googleapis.com/v1/currentConditions:lookup`) for live wind speed, gusts, direction, and precipitation
4. **Emergency Shelter Discovery & Autocomplete (`Places API (New)`)**
   - Queries nearby hospitals and community centers using `Place.searchByText` and mounts `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`).
5. **Flood-Zone-Bypass Evacuation Routing (`Routes API` + `geometry.poly`)**
   - Computes driving evacuation routes via `Route.computeRoutes` (`importLibrary("routes")`) and verifies every route segment against active flood polygons using `geometry.poly.containsLocation` and `isLocationOnEdge`.
   - When **Avoid Active Flood-Hazard Polygons** is enabled and a direct route crosses a flood zone, the router evaluates alternative routes and injects safe perimeter `via: true` waypoints to bypass the flooded area.

### Core Implementation Snippet (`app.js`)

```javascript
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({ key: window.__GMP_CONFIG__.apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place }, { Route }, { poly }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('geometry'),
  ]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 25.7743, lng: -80.1937 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { places } = await Place.searchByText({
  textQuery: 'hospital and community center in Miami, FL',
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating', 'businessStatus'],
  locationBias: { center: { lat: 25.7743, lng: -80.1937 }, radius: 10000 },
});
```

---

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Zero-Billing Prototyping)
1. Open the [Maps Demo Key quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms and generate your demo key.

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, **Elevation API**, and **Weather API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer and enabled APIs.

> **Cost Notice:** Usage of Google Maps Platform products and services in production may incur costs against your Google Cloud billing account. See the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>
```

### 3. Install, Verify & Start

```bash
npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

---

## Available Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Documentation Links
- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Overview](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Overview](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Weather API Current Conditions](https://developers.google.com/maps/documentation/weather/current-conditions?utm_campaign=gmp_git_agentsamples_v1.0.0)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
