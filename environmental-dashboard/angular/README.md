# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — Angular Standalone Components + TypeScript (@angular/google-maps) (`GoogleMap`, `MapAdvancedMarker`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `PinElement`, `Geocoder`, `ImageMapType`)

A hyperlocal environmental intelligence and rooftop sustainability dashboard built with **Angular Standalone Components**, **TypeScript**, **`@angular/google-maps`**, and **`@googlemaps/js-api-loader` (`setOptions` + `importLibrary`)**. Pre-seeded in Downtown Phoenix (`Phoenix City Hall`), the application lets users search any address or city via `PlaceAutocompleteElement` or click any building on the interactive 2D map to inspect real-time Weather, Air Quality, Pollen, and Rooftop Solar Building Insights.

## Google Maps Platform Products & Modern APIs Used

- **[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)**: Vector 2D Map (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `MapAdvancedMarker` (`AdvancedMarkerElement`), `PinElement`, `MapRectangle`, `Geocoder` (reverse geocoding on map click), and native `ImageMapType` for WebGL-free US AQI tile overlays.
- **[Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `PlaceAutocompleteElement` (`<gmp-place-autocomplete>` listening to `gmp-select` + `placePrediction.toPlace().fetchFields()`) and server-side `places:searchText` with `X-Goog-FieldMask`.
- **[Weather API](https://developers.google.com/maps/documentation/weather?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `currentConditions:lookup` and `forecast/days:lookup` (5-day forecast, `IMPERIAL` / `METRIC` toggle).
- **[Air Quality API](https://developers.google.com/maps/documentation/air-quality?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `currentConditions:lookup` (Universal + Local US EPA AQI, pollutant concentrations, health recommendations) and `mapTypes/US_AQI/heatmapTiles` PNG overlay.
- **[Pollen API](https://developers.google.com/maps/documentation/pollen?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `forecast:lookup` (Tree, Grass, and Weed UPI levels, in-season status, plant allergens, and allergy guidance).
- **[Solar API](https://developers.google.com/maps/documentation/solar?utm_campaign=gmp_git_agentsamples_v1.0.0)**: `buildingInsights:findClosest` (maximum panel capacity, array kW, annual sunshine hours, roof area, carbon offset factor, building bounding box highlight, and graceful 404 non-coverage fallback).

## Architecture Summary

- **Frontend (`src/app/`)**: Standalone Angular 19 components (`AppComponent`, `HeaderBarComponent`, `EnvironmentalSidebarComponent`, `EnvironmentalMapComponent`) using `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker`, `MapRectangle`) and `CUSTOM_ELEMENTS_SCHEMA` for `<gmp-*>` Web Components.
- **Dynamic Loader (`MapsLoaderService`)**: Reads `window.__ENV__.GOOGLE_MAPS_API_KEY` injected at runtime via `/env-config.js` (never hardcoded in `environment.ts`), initializes `@googlemaps/js-api-loader` via `setOptions()` and `importLibrary()`, and renders the map only after libraries resolve.
- **Backend-for-Frontend (`serve-dist.mjs`)**: Lightweight Node.js server bound strictly to `127.0.0.1` that serves Angular's built `dist/environmental-dashboard/browser` assets, generates `/env-config.js` from `process.env.GOOGLE_MAPS_API_KEY`, sets security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`), and proxies `/api/weather/*`, `/api/air-quality/*`, `/api/pollen/*`, `/api/solar/*`, and `/api/places/search-text` with `X-Goog-Api-Key` and `X-Goog-FieldMask`.

### Core Implementation Snippet

```typescript
// Dynamic Maps JS v2 initialization + PlaceAutocompleteElement selection
setOptions({
  key: apiKey,
  v: 'weekly',
  libraries: ['maps', 'marker', 'places', 'geocoding'],
  mapIds: ['DEMO_MAP_ID'],
});

const { PlaceAutocompleteElement } = await importLibrary('places');
const autocomplete = new PlaceAutocompleteElement({
  placeholder: 'Search any address, building, or city...',
});

autocomplete.addEventListener('gmp-select', async (event) => {
  const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
  const place = placePrediction.toPlace();
  await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
  // Inspect Weather, Air Quality, Pollen, and Solar at place.location
});
```

## Setup & Running Locally

### 1. Obtain an API Key

- **Fast Prototyping (Maps Demo Key — No Billing Required):**
  1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with a Google account and accept the Maps Demo Project Terms.
  3. Generate and copy your demo key. *(Note: daily quota limits apply; not for production.)*
- **Full Production / All Environment APIs:**
  Create an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**, and follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer (browser) / IP address (server) and API scope.

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>
```

### 3. Install, Typecheck, Build, and Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200` in your browser.

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
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
