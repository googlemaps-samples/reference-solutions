# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — Multi-Modal Commute Comparator & Trail Elevation Tracker (`Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `ElevationService`)

A 100% standalone, zero-bundler ES module geospatial web application for comparing multi-modal commutes (Driving, Cycling, Walking, Transit) and analyzing trail elevation profiles across the **Denver–Boulder, Colorado** Front Range corridor.

Built with modern, zero-deprecation **Google Maps Platform** JavaScript SDK libraries loaded via [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) (`setOptions` + `importLibrary`).

## Features

- **Pre-Seeded Denver ⇄ Boulder Endpoints:** Automatically resolves *Denver Union Station, Denver, CO* and *Chautauqua Park, Boulder, CO* at runtime using `Place.searchByText` (Places API New).
- **Modern Place Autocomplete:** Uses `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()` + `place.fetchFields()`) biased to the Front Range corridor, plus an interactive Origin/Destination swap button.
- **Multi-Modal Route Comparison:** Computes live routes across `DRIVING`, `BICYCLING`, `WALKING`, and `TRANSIT` via `Route.computeRoutes` with alternative routes, `BicyclingLayer`, `TrafficLayer`, `TransitLayer`, and Driving modifiers (`avoidTolls`, `avoidHighways`, and `FUEL_EFFICIENT` eco-friendly reference routing).
- **Interactive Elevation & Slope Profile:** Samples 64 equidistant points along the active route via `ElevationService.getElevationAlongPath`, computes cumulative elevation gain/loss, altitude range, and max grade %, and synchronizes chart hover scrubbing with a live `AdvancedMarkerElement` indicator on the map.
- **Zero-Trust Security:** Strictly uses safe DOM APIs (`document.createElement`, `textContent`, `replaceChildren`—never `innerHTML`), serves runtime configuration from `/env-config.js` via a local `127.0.0.1` Node server (`server.mjs`) with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and never hardcodes API keys.

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

**Option A — Zero-Billing Prototyping (Maps Demo Key):**
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms.
4. Generate and copy your Demo Key. *(Note: The Maps Demo Key is for prototyping only, has a daily reset limit, and is not for production usage.)*

**Option B — Production Google Cloud Key:**
1. Create or select a project in the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
3. Restrict your key by HTTP referrer and enabled APIs following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Verify, and Run

```bash
npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

- **`server.mjs`**: Lightweight Node.js HTTP server bound strictly to `127.0.0.1`. Loads `GOOGLE_MAPS_API_KEY` from `.env` / `process.env`, exposes `/env-config.js`, serves static assets and `@googlemaps/js-api-loader` safely without path traversal, and attaches security headers.
- **`index.html` & `styles.css`**: Responsive split-screen workspace with a 64px KPI header bar, 410px scrollable sidebar, explicit-height (`min-height: 540px`) 2D Vector Map stage, and 214px Elevation & Slope Profile panel.
- **`app.js`**: Pure ES module orchestrating `@googlemaps/js-api-loader`, `Place.searchByText`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `AdvancedMarkerElement`, `PinElement`, `Polyline`, and `ElevationService.getElevationAlongPath`.

### Core Implementation Snippet

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: window.__GMP_CONFIG__.apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Route }, { ElevationService }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('routes'),
    importLibrary('elevation'),
  ]);

const map = new Map(document.getElementById('map-canvas'), {
  center: { lat: 39.884, lng: -105.135 },
  zoom: 11,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await Route.computeRoutes({
  origin,
  destination,
  travelMode: 'BICYCLING',
  computeAlternativeRoutes: true,
  fields: ['path', 'routeLabels', 'distanceMeters', 'durationMillis', 'viewport'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Google Maps Platform Documentation & Compliance

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) & PlaceAutocompleteElement](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes (JS `Route` Class)](https://developers.google.com/maps/documentation/javascript/routes/route-class-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation Service (Maps JS API)](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

> *Note: Usage of Google Maps Platform APIs in production may incur billing charges against your Google Cloud account.*

## Related Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
