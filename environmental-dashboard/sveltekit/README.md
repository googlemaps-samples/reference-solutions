# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)

An interactive hyperlocal environmental intelligence and rooftop sustainability dashboard built with **SvelteKit + TypeScript** using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), native Google Maps Platform Web Components and modern classes (`google.maps.Map` with `mapId: 'DEMO_MAP_ID'`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement` listening to `gmp-select`, `Geocoder`, `ImageMapType`), and secure SvelteKit `/api/*` Backend-for-Frontend (BFF) proxy routes for **Weather API**, **Air Quality API**, **Pollen API**, **Solar API**, and **Places API (New)**.

Pre-seeded in **Downtown Phoenix (Phoenix City Hall)**, users can search any address or city via `PlaceAutocompleteElement` or click any building footprint on the map to inspect real-time weather conditions & 5-day forecast, Air Quality Index (AQI) + pollutant concentrations + health guidance, US_AQI raster tile overlays, Tree/Grass/Weed pollen levels, and rooftop solar panel capacity & annual sunshine hours.

---

## Quickstart & API Key Setup

### 1. Obtain a Free Maps Demo Key (Prototyping)

If you do not yet have a Google Cloud billing account configured, you can mint a zero-billing **Maps Demo Key** for prototyping:

1. Open [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and reveal the demo key, then copy it.

> **Note:** The Maps Demo Key has a daily quota reset, covers core prototyping APIs (Maps JS API, Places API, Geocoding API, Weather API, etc.), and is not intended for production workloads.

### 2. Configure Production Google Cloud APIs (Optional / Production)

For full production access across all environmental endpoints, create and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable:

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Air Quality API](https://developers.google.com/maps/documentation/air-quality/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Pollen API](https://developers.google.com/maps/documentation/pollen/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Solar API](https://developers.google.com/maps/documentation/solar/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)

Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict keys by HTTP referrer (browser) or IP address (server) and limit enabled APIs. Usage of Google Maps Platform APIs may incur charges against your Google Cloud billing account in production.

### 3. Install, Configure `.env`, & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

---

## Architecture Summary

- **SSR-Safe Maps Loading (`$env/dynamic/public` + `onMount`)**: Client-side Maps JavaScript API libraries (`maps`, `marker`, `places`, `geocoding`) are loaded strictly inside Svelte's `onMount` lifecycle via `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Modern Zero-Deprecation UI**:
  - `PlaceAutocompleteElement` mounted imperatively in `HeaderBar.svelte`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
  - `AdvancedMarkerElement` + `PinElement` (`glyphText`) on a 2D vector map (`mapId: 'DEMO_MAP_ID'`).
  - `Geocoder` for map-click reverse geocoding and `google.maps.Rectangle` for highlighting the Solar API building `boundingBox`.
  - Native `google.maps.ImageMapType` overlaying `US_AQI` raster heatmap tiles from `/api/air-quality/tiles` without WebGL dependencies.
- **SvelteKit BFF Proxy Routes (`src/routes/api/*`)**:
  - `GET /api/weather/current` → `weather.googleapis.com/v1/currentConditions:lookup`
  - `GET /api/weather/forecast` → `weather.googleapis.com/v1/forecast/days:lookup`
  - `POST /api/air-quality/current` → `airquality.googleapis.com/v1/currentConditions:lookup`
  - `GET /api/air-quality/tiles` → `airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`
  - `GET /api/pollen/forecast` → `pollen.googleapis.com/v1/forecast:lookup`
  - `GET /api/solar/building-insights` → `solar.googleapis.com/v1/buildingInsights:findClosest` (returns graceful `404` non-coverage payload when no building is within 50m)
  - `POST /api/places/search-text` → `places.googleapis.com/v1/places:searchText` (used to resolve the Phoenix City Hall seed location)

### Core Implementation Snippet (`src/lib/components/GoogleMapPanel.svelte`)

```ts
const [mapsLib, markerLib, geocodingLib] = await Promise.all([
  importLibrary('maps') as Promise<google.maps.MapsLibrary>,
  importLibrary('marker') as Promise<google.maps.marker.MarkerLibrary>,
  importLibrary('geocoding') as Promise<google.maps.GeocodingLibrary>
]);

const map = new mapsLib.Map(mapElement, {
  center: { lat: 33.4484, lng: -112.074 },
  zoom: 16,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const pin = new markerLib.PinElement({
  background: '#059669',
  borderColor: '#064e3b',
  glyphColor: '#ffffff',
  glyphText: '★'
});

const marker = new markerLib.AdvancedMarkerElement({
  map,
  position: { lat: 33.4484, lng: -112.074 },
  title: 'Phoenix City Hall'
});
marker.append(pin);
```

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Terms of Service

Use of Google Maps Platform services is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
