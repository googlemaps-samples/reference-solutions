# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components)

An enterprise Web GIS spatial analytics workbench centered on New York City, built with **SvelteKit 2 + TypeScript** and modern Google Maps Platform APIs (`google.maps.Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Elevation API`, and `Places API (New)`), paired with WebGL-accelerated **deck.gl** (`GoogleMapsOverlay`, `ScatterplotLayer`, `HexagonLayer`) and **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`).

## Features & Google Maps Platform Architecture

- **2D/Vector Google Map (`Map`)**: Loaded via `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) inside Svelte's `onMount` lifecycle with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`.
- **Live Basemap Switcher**: Instant switching across `roadmap`, `satellite`, `hybrid`, and `terrain` basemaps via `map.setMapTypeId()`.
- **GeoJSON Infrastructure Districts**: NYC utility/capacity districts rendered via `map.data.addGeoJson()` with choropleth styling by capacity utilization and smooth `map.fitBounds()` zoom-on-select.
- **High-Density deck.gl Analytics (`GoogleMapsOverlay`)**: Toggleable `ScatterplotLayer` and `HexagonLayer` visualizing 2,400 NYC infrastructure sensor points, guarded by a safe `WebGL2` availability check so headless environments emit zero console errors.
- **Interactive Terra Draw Polygon Zone Filtering**: Custom study-zone polygon drawing (`TerraDrawPolygonMode` + `TerraDrawSelectMode` via `TerraDrawGoogleMapsAdapter`) for dynamic point-in-polygon sensor filtering, spherical area calculation (`km²`), and live terrain profiling.
- **SvelteKit BFF Proxy Endpoints**:
  - `POST /api/places/search`: Server-side proxy to [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (`places.googleapis.com/v1/places:searchText`) with explicit `X-Goog-FieldMask`.
  - `POST /api/elevation`: Server-side proxy to [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`maps.googleapis.com/maps/api/elevation/json`) returning min/mean/max terrain elevation (m) and resolution.
- **Live Location Search (`PlaceAutocompleteElement`)**: Native `<gmp-place-autocomplete>` mounted imperatively with the modern `gmp-select` event (`placePrediction.toPlace()` + `place.fetchFields()`).

## Core Implementation Snippet

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [, mapsLib, markerLib, placesLib] = await Promise.all([
  importLibrary('core'),
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('elevation')
]);

const map = new mapsLib.Map(mapContainerEl, {
  center: { lat: 40.73061, lng: -73.98661 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const autocompleteEl = new placesLib.PlaceAutocompleteElement({
  includedRegionCodes: ['us']
});
autocompleteEl.addEventListener('gmp-select', async (event) => {
  const place = (event as google.maps.places.PlacePredictionSelectEvent)
    .placePrediction.toPlace();
  await place.fetchFields({
    fields: ['displayName', 'formattedAddress', 'location', 'viewport']
  });
});
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Visit the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key. *(Note: daily usage limits apply; not for production use.)*

**Option B — Production Google Cloud API Key:**
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Restrict your key by HTTP referrer / server IP and API restrictions following [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For development mode with hot reload:

```bash
npm run dev
```

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
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
