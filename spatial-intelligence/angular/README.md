# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Angular Standalone Components + TypeScript (`@angular/google-maps`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `ElevationService`)

An enterprise Web GIS spatial analytics workbench centered on New York City (`40.73061, -73.98661`), built with **Angular Standalone Components**, **TypeScript**, **`@angular/google-maps`** (`GoogleMap`, `MapAdvancedMarker`), **deck.gl** (`GoogleMapsOverlay`, `ScatterplotLayer`, `HexagonLayer`), **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`), and the **Google Maps Platform** (`Maps JavaScript API`, `Places API (New)`, `Elevation API`).

---

## Features & Architecture

- **Dynamic Google Maps JS API Loader (`@googlemaps/js-api-loader` v2):** Uses `setOptions()` + `importLibrary()` to load `core`, `maps`, `marker`, `places`, and `elevation` dynamically using runtime configuration served from `/env-config.js` (never hardcoded in `environment.ts`).
- **Official Angular Google Maps Integration (`@angular/google-maps`):** Renders `<google-map>` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, plus `<map-advanced-marker>` for live civic reference hubs and search results.
- **Basemap Switcher:** Instant switching across `roadmap`, `satellite`, `hybrid`, and `terrain`.
- **GeoJSON District Boundary Layer (`google.maps.Data`):** 8 NYC infrastructure districts styled by capacity utilization (`< 70%`, `70–84%`, `>= 85%`) with smooth `map.fitBounds()` zoom-on-select from either the map or sidebar directory.
- **WebGL-Accelerated deck.gl Analytics (`GoogleMapsOverlay`):** Visualizes 2,400 NYC infrastructure sensor points with toggleable `ScatterplotLayer` and `HexagonLayer` modes, guarded by explicit WebGL2 availability checks so headless environments emit zero console errors.
- **Interactive Terra Draw Polygon Filtering:** Uses `TerraDraw` and `TerraDrawGoogleMapsAdapter` (`isolatedData: true`) for drawing, selecting, and editing custom study-zone polygons with real-time point-in-polygon telemetry and spherical polygon area computation (`km²`).
- **Terrain Elevation Inspector (`ElevationService`):** Queries surface elevation (`min`, `mean`, `max`, and DEM `resolution` in meters) for the active district, custom Terra Draw zone, or NYC centroids.
- **Live Civic Reference Hubs (`Place.searchByText` & `PlaceAutocompleteElement`):** Populates NYC civic transit hubs at startup via `Place.searchByText` and mounts a live `<gmp-place-autocomplete>` widget listening to the `gmp-select` event.

### Core Implementation Snippet

```ts
// Dynamically load Maps JS API libraries via @googlemaps/js-api-loader v2
setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
});

await Promise.all([
  importLibrary('core'),
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('elevation'),
]);

// Map options passed to <google-map>
const mapOptions: google.maps.MapOptions = {
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
};
```

---

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate/reveal your Demo Key and copy it.

> **Note:** The Maps Demo Key has daily reset limits, is not intended for production usage, and covers Maps JavaScript API and Places API (New). For full Elevation API support and production deployments, use Option B.

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Restrict your key by **HTTP referrer** and **API restrictions** following the [API Security Best Practices guide](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build & Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

---

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Documentation](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
