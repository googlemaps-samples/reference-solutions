# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `ImageMapType`, `Geocoder` — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard

A standalone, zero-bundler ES Modules web application built with **Static HTML + Vanilla JavaScript** and a lightweight Node.js Backend-for-Frontend (`server.mjs`). Pre-seeded in Downtown Phoenix (`Phoenix City Hall, Phoenix, AZ`), it lets users search any address via [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) or click any building on the interactive 2D Google Map to inspect real-time weather, 5-day forecasts, Air Quality Index (plus optional `US_AQI` heatmap tiles), Tree/Grass/Weed pollen levels, and rooftop solar panel potential.

## Features & Google Maps Platform APIs

- **Maps JavaScript API v2 (`@googlemaps/js-api-loader`)**: Loads `maps`, `marker`, `places`, and `geocoding` libraries via `setOptions()` and `importLibrary()` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **2D Vector Map & Markers**: Uses [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0), [`PinElement`](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers?utm_campaign=gmp_git_agentsamples_v1.0.0#PinElement), `google.maps.Rectangle` for building solar bounding boxes, and native WebGL-free [`ImageMapType`](https://developers.google.com/maps/documentation/javascript/maptypes?utm_campaign=gmp_git_agentsamples_v1.0.0#CustomMapTypes) for `US_AQI` raster tile overlays.
- **Places API (New)**: Client-side `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace().fetchFields()`) and server-side `places:searchText` proxy with `X-Goog-FieldMask`.
- **Geocoding API**: Client-side `Geocoder` for reverse-geocoding map clicks into human-readable addresses.
- **Weather API**: Proxied `/api/weather/current` (`currentConditions:lookup`) and `/api/weather/forecast` (`forecast/days:lookup`) with Imperial/Metric toggle.
- **Air Quality API**: Proxied `/api/air-quality/current` (`currentConditions:lookup`) and `/api/air-quality/tiles` (`mapTypes/US_AQI/heatmapTiles`).
- **Pollen API**: Proxied `/api/pollen/forecast` (`forecast:lookup`) showing Tree, Grass, and Weed UPI scores and allergenic plants.
- **Solar API**: Proxied `/api/solar/building-insights` (`buildingInsights:findClosest`) with graceful `404` non-coverage handling.

## Quickstart & API Key Setup

### Option A: Zero-Billing Prototyping with Maps Demo Key

1. Open the [Maps Demo Key generator](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key. *(Note: The Maps Demo Key has a daily reset limit, is not for production usage, and supports core APIs like Maps JavaScript API, Places API, Geocoding API, and Weather API; for Air Quality, Pollen, and Solar APIs, use Option B.)*

### Option B: Google Cloud Project Key (Full Environmental + Solar Suite)

1. Create or select a project in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.
3. Create an API key and follow the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Key Restriction Guide](https://developers.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and specific APIs.

### Configure & Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture & Core Implementation

- `server.mjs`: Binds strictly to `127.0.0.1`, loads `.env`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, injects `/env-config.js`, serves static assets + `/node_modules/@googlemaps/js-api-loader/dist/*`, and proxies all Google Maps Platform REST APIs using `X-Goog-Api-Key` and `X-Goog-FieldMask`.
- `index.html` & `styles.css`: Responsive split-screen layout with a 64px header bar, 420px scrollable intelligence sidebar, and explicit `>= 540px` height map stage.
- `app.js`: Zero-bundler ES module application using `document.createElement()`, `textContent`, and `replaceChildren()` (no `innerHTML`).

```js
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map, ImageMapType }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
  ]);

const map = new Map(document.getElementById('map'), {
  center: { lat: 33.4484, lng: -112.074 },
  zoom: 16,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const pin = new PinElement({ background: '#0f766e', borderColor: '#ffffff', glyphColor: '#ffffff' });
const marker = new AdvancedMarkerElement({ map, position: { lat: 33.4484, lng: -112.074 } });
marker.append(pin);
```

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
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
