# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)

A standalone, zero-deprecation **Vue 3 + Vite + TypeScript** environmental intelligence and rooftop sustainability dashboard built with `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`), `google.maps.Map` (`mapId: "DEMO_MAP_ID"`), `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Geocoder`, and `ImageMapType`, integrated with the Google Maps Platform **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.

Pre-seeded in Downtown Phoenix (`Phoenix City Hall, Phoenix, AZ`), users can search any address or city with Places Autocomplete or click any building on the map to inspect real-time weather and 5-day forecast metrics, Air Quality Index (AQI) and pollutant concentrations (with an optional `US_AQI` raster tile overlay), Tree/Grass/Weed pollen forecasts, and rooftop solar panel capacity and annual sunshine hours.

---

## Features & Google Maps Platform APIs

- **[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)**: 2D Vector Map (`mapId: "DEMO_MAP_ID"`), `AdvancedMarkerElement`, `PinElement`, `ImageMapType` (for WebGL-free `US_AQI` heatmap tiles), `Rectangle` (rooftop bounding-box highlight), and `Geocoder` (reverse geocoding on map click).
- **[Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `PlaceAutocompleteElement` (`<gmp-place-autocomplete>` listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields()`) and `Place.searchByText()` for resolving the initial Phoenix seed.
- **[Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `currentConditions:lookup` and `forecast/days:lookup` with live `IMPERIAL` / `METRIC` unit switching.
- **[Air Quality API](https://developers.google.com/maps/documentation/air-quality/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `currentConditions:lookup` (AQI, dominant pollutant, pollutant concentrations, demographic health recommendations) and `mapTypes/US_AQI/heatmapTiles` raster overlay.
- **[Pollen API](https://developers.google.com/maps/documentation/pollen/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `forecast:lookup` for Tree, Grass, and Weed Universal Pollen Index (UPI) levels, active plant allergens, and health guidance.
- **[Solar API](https://developers.google.com/maps/documentation/solar/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `buildingInsights:findClosest` for rooftop panel count, kW capacity, annual sunshine hours, roof area, carbon offset factor, and graceful 404 non-coverage handling.

---

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Prototyping with Maps Demo Key (No billing card required):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key. *(Note: Maps Demo Keys have a daily quota reset and are not for production use; see [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).)*

**Option B — Production Google Cloud Key:**
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.
3. Restrict your key by HTTP referrer and enabled APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Billing Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account. Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

---

## Architecture Summary

- **`vite.config.ts`**: Configures `@vitejs/plugin-vue` with `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-place-autocomplete>` renders natively without Vue component resolution warnings.
- **`src/services/mapsLoader.ts`**: Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) as a singleton loader configured with `mapIds: ['DEMO_MAP_ID']`.
- **`src/components/TopHeaderBar.vue`**: Hosts `PlaceAutocompleteElement` (listening to `gmp-select`), the active coordinate badge, Phoenix preset reset, Imperial/Metric units toggle, AQI tile overlay toggle, and Roadmap/Hybrid toggle.
- **`src/components/MapCanvas.vue`**: Renders the interactive 2D Vector Map with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `AdvancedMarkerElement` + `PinElement`, `ImageMapType` for `US_AQI` tiles, `Rectangle` for the Solar API building footprint, `Place.searchByText()` for the Phoenix seed, and `Geocoder` for map-click reverse geocoding.
- **`src/services/environmentalApi.ts`**: Typed HTTP fetchers for Weather, Air Quality, Pollen, and Solar REST endpoints with `AbortController` cancellation and clean 404 Solar non-coverage handling.

### Core Implementation Snippet

```ts
const [{ Map, ImageMapType }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
])

const map = new Map(containerEl, {
  center: { lat: 33.4484, lng: -112.074 },
  zoom: 16,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
})

const pin = new PinElement({
  background: '#0f766e',
  borderColor: '#ffffff',
  glyphColor: '#ffffff',
  glyphText: '★',
})

const marker = new AdvancedMarkerElement({
  map,
  position: { lat: 33.4484, lng: -112.074 },
  content: pin,
})
```

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
