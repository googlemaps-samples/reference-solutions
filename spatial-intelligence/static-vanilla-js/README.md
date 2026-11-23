# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)

Built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** using modern **Google Maps Platform** classes: `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`), `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchByText()`, `ElevationService`, and `google.maps.Data` GeoJSON overlays, alongside `deck.gl` (`GoogleMapsOverlay`, `ScatterplotLayer`, `HexagonLayer`) and `terra-draw` (`TerraDrawGoogleMapsAdapter`).

## Setup & Quickstart

### 1. Install Dependencies

```bash
npm install --no-audit --no-fund
```

### 2. Configure Your Google Maps Platform API Key

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set `GOOGLE_MAPS_API_KEY` in `.env`:

- **Prototyping (Zero-Billing Maps Demo Key):**
  1. Open the [Maps Demo Key generator](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with a Google account (no billing card required).
  3. Accept the Maps Demo Project Terms when prompted.
  4. Generate and copy your Demo Key into `.env` as `GOOGLE_MAPS_API_KEY`.
  *(Note: The Maps Demo Key has a daily reset limit and is intended only for prototyping, not production.)*

- **Production:**
  1. Create an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
  3. Restrict your key by HTTP referrer and designated APIs following the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 3. Verify & Run

```bash
node --check app.js && node --check server.mjs
npm run build
node server.mjs --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173`.

## Architecture Summary

- **`server.mjs`:** Loopback-only (`127.0.0.1`) Node.js static and BFF server that loads `GOOGLE_MAPS_API_KEY` from `.env`, exposes `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, serves local ES module dependencies safely, and provides `/api/places/search` and `/api/elevation` REST proxies.
- **`index.html` & `styles.css`:** Full-viewport split-screen GIS workbench with top command bar (location autocomplete, basemap switcher, deck.gl/GeoJSON layer controls), analytical sidebar (Zone KPIs, Elevation profile inspector, District directory, Live NYC Civic Hubs), and explicitly sized map canvas with floating Terra Draw toolbar.
- **`app.js` & `nyc-data.js`:** Zero-bundler ES module application using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), GeoJSON `map.data` styling & smooth `fitBounds()`, WebGL2-guarded `GoogleMapsOverlay`, isolated-data `TerraDraw` polygon study-zone filtering, `ElevationService`, and `Place.searchByText()` + `PlaceAutocompleteElement`.

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

const [{ Map }, { Place, PlaceAutocompleteElement }, { ElevationService }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('places'),
    importLibrary('elevation'),
  ]);

const map = new Map(document.getElementById('map'), {
  center: { lat: 40.73061, lng: -73.98661 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Documentation](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw Integration Example](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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
