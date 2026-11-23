# On-Demand Local Services & EV Roadside Dispatch — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) using `Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchNearby`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`

A standalone, zero-bundler ES module web application centered in **Downtown Seattle (`47.6062, -122.3321`)** for locating nearby EV fast-charging stations and roadside auto repair providers, ranking options by live traffic-aware driving ETA, and rendering turn-by-turn dispatch routes.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API** (`importLibrary('maps')`, `importLibrary('marker')`): `Map` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, `Circle`, `InfoWindow`, `AdvancedMarkerElement`, and `PinElement` — [Maps JS API Docs](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Places API (New)** (`importLibrary('places')`): `PlaceAutocompleteElement` (`gmp-select` event + `toPlace()` + `fetchFields()`) and `Place.searchNearby` (`electric_vehicle_charging_station`, `car_repair`, `evChargeOptions`, `regularOpeningHours`) — [Places API (New) Docs](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Routes API** (`importLibrary('routes')`): `RouteMatrix.computeRouteMatrix` for ETA-based ranking and `Route.computeRoutes` (`createPolylines()` + `legs[0].steps`) for dispatch polylines and turn-by-turn instructions — [Routes Library Docs](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Geocoding API** (`importLibrary('geocoding')`): `Geocoder.geocode({ location })` for reverse-geocoding the draggable breakdown pin — [Geocoding Docs](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Quickstart & Maps Demo Key Setup

### 1. Obtain a Free Maps Demo Key (Zero-Billing Prototyping)

1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project setup required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and copy your demo key.

> **Production Note:** When moving to production, create a dedicated key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**, and restrict it by HTTP referrer and allowed APIs per [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0). Note that utilizing Google Maps Platform services in production may incur costs against your Google Cloud billing account.

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

- **`server.mjs`**: Minimal Node HTTP server bound strictly to `127.0.0.1` with path-traversal protection, security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`), `/healthz`, and `/env-config.js` exposing `window.__GMP_CONFIG__` from `.env` / `process.env.GOOGLE_MAPS_API_KEY`.
- **`index.html` + `styles.css`**: Full-viewport (`100vh`) responsive split-screen dashboard with an import map for `@googlemaps/js-api-loader`, header controls (Places Autocomplete, category filters, 5 km / 10 km / 15 km radius pills), left dispatch sidebar, and right map pane (`min-height: 540px`).
- **`app.js`**: Zero-bundler ES module application using safe DOM construction (`document.createElement`, `textContent`, `replaceChildren` — no `innerHTML`).

### Core Implementation Snippet

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: window.__GMP_CONFIG__.apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  mapIds: ['DEMO_MAP_ID'],
});

const [{ Map }, { AdvancedMarkerElement }, { Place }, { RouteMatrix, Route }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
  ]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 47.6062, lng: -122.3321 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Related Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
