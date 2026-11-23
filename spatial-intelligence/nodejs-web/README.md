# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`)

An enterprise Web GIS spatial analytics workbench centered on New York City (`40.73061, -73.98661`), built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and an interactive ES module web client.

It integrates the Google Maps JavaScript API (`setOptions` + `importLibrary`, `mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), a live basemap switcher (`roadmap`, `satellite`, `hybrid`, `terrain`), GeoJSON district boundary polygons styled by grid capacity metrics with smooth `fitBounds()` zoom-on-select, a WebGL2-accelerated **deck.gl** `GoogleMapsOverlay` (`ScatterplotLayer` and `HexagonLayer` across 2,400 NYC infrastructure sensor points with graceful WebGL2 fallback), an interactive **Terra Draw** polygon toolbar (`terra-draw` + `terra-draw-google-maps-adapter`) for custom study-zone filtering, server-proxied **Elevation API** terrain profiling (`/api/elevation`), and **Places API (New)** civic reference hubs (`/api/places/search`) rendered with `AdvancedMarkerElement`.

---

## Quickstart & Maps Demo Key Setup

### 1. Obtain a Free Zero-Billing Maps Demo Key (Prototyping)
You can run this application immediately without setting up a Google Cloud billing account:
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and copy your Demo Key.

> **Production Note:** For production workloads, provision a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**, and restrict your key by HTTP referrer / server IP via [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0). Utilizing Google Maps Platform services in production may incur costs against your Google Cloud billing account.

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

---

## Architecture Summary

- **Backend-for-Frontend (`src/server.ts` -> `dist/server.js`):**
  - Strictly binds to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and validates all incoming JSON bodies.
  - `GET /api/config`: Supplies non-secret runtime map defaults and configuration status.
  - `GET /api/spatial-data`: Serves 8 NYC infrastructure district GeoJSON polygons and 2,400 deterministic sensor telemetry points (`src/data/nycSpatialData.ts`).
  - `POST /api/places/search`: Server-side proxy to `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and explicit `X-Goog-FieldMask` (`places.id,places.displayName,places.formattedAddress,places.location,places.types`).
  - `POST /api/elevation`: Server-side proxy to `https://maps.googleapis.com/maps/api/elevation/json`, projecting only `results.elevation`, `results.location`, `results.resolution`, and `status`.
- **Interactive GIS Frontend (`public/index.html`, `public/styles.css`, `public/app.js`):**
  - Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), bundled locally into `dist/assets/vendor.mjs` alongside `deck.gl` and `terra-draw`.
  - Uses safe DOM creation (`document.createElement`, `textContent`, `replaceChildren`) with zero `innerHTML` assignments.

### Core Implementation Snippet

```js
setOptions({ key: state.config.apiKey, v: 'weekly' });
const [, mapsLib, markerLib] = await Promise.all([
  importLibrary('core'),
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('elevation'),
]);

const map = new mapsLib.Map(document.getElementById('map-canvas'), {
  center: { lat: 40.73061, lng: -73.98661 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

---

## Related Standalone Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

---

## Terms of Service & Licensing

- Google Maps Platform usage is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- See [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0), [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Elevation API Documentation](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
