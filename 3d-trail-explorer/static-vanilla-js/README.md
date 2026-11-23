# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) (`Map3DElement`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, `ElevationService`)

An interactive **Photorealistic 3D terrain storytelling and trail exploration** web application for **Lake Tahoe (Emerald Bay & Rubicon Trail)** built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (`maps3d`)**: [`Map3DElement`](https://developers.google.com/maps/documentation/javascript/3d-maps-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`<gmp-map-3d>`), `Polyline3DElement` (bright-red `rgb(255, 0, 0)` extruded trail path), `Marker3DInteractiveElement`, and `PopoverElement`.
- **Maps JavaScript API (`marker`)**: `PinElement` (`glyphText`, `glyphColor`, `background`, `borderColor`).
- **Elevation API (`elevation`)**: `ElevationService.getElevationAlongPath` (48-sample trail elevation profile) & `ElevationService.getElevationForLocations`.
- **Places API (New) (`places`)**: `PlaceAutocompleteElement` (`gmp-select` event + `placePrediction.toPlace().fetchFields(...)`) and `Place.searchByText` for Lake Tahoe landmark search.
- **Usage Attribution**: Configured with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`.

## Setup & Local Execution

### 1. Obtain a Google Maps Platform API Key

**Prototyping (Free Zero-Billing Maps Demo Key):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and generate/reveal your key.

> Note: The Maps Demo Key is for prototyping only and carries daily reset limits. For production deployments, create an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Map Tiles API**, **Places API (New)**, and **Elevation API**, and apply HTTP referrer + API restrictions per the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Install

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
```

### 3. Validate, Build & Run

```bash
# Syntax / typecheck validation
node --check app.js && node --check server.mjs

# Production static verification build
npm run build

# Start the loopback-bound static server (127.0.0.1)
node server.mjs --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in a WebGL2-capable browser.

## Architecture Summary

- **[`server.mjs`](./server.mjs)**: Lightweight zero-dependency Node.js HTTP server bound strictly to `127.0.0.1`. Reads `GOOGLE_MAPS_API_KEY` from `.env` / environment variables and exposes `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers, preventing path traversal and never exposing `.env`.
- **[`index.html`](./index.html)**: Uses a native `<script type="importmap">` pointing `@googlemaps/js-api-loader` to the locally installed v2 module and mounts `<gmp-map-3d>` with explicit non-zero viewport dimensions.
- **[`app.js`](./app.js)**: Bootstraps Maps JS via `setOptions()` + `importLibrary()`, renders the bright-red extruded 3D trail polyline, attaches interactive 3D chapter markers with `PinElement` + `PopoverElement`, animates smooth 3D fly-to transitions via `map3d.flyCameraTo()`, renders a live SVG elevation profile via `ElevationService.getElevationAlongPath`, and binds landmark search via `PlaceAutocompleteElement` + `Place.searchByText` using safe DOM APIs (`createElement`, `textContent`, `replaceChildren` — zero `innerHTML`).

### Core Implementation Snippet

```js
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: window.__GMP_CONFIG__.apiKey, v: 'weekly' });

const [{ Polyline3DElement, Marker3DInteractiveElement }, { PinElement }, { ElevationService }] =
  await Promise.all([
    importLibrary('maps3d'),
    importLibrary('marker'),
    importLibrary('elevation'),
  ]);

const map3d = document.getElementById('map-3d');
map3d.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];

const trailPolyline = new Polyline3DElement({
  path: trailWaypoints.map((pt) => ({ lat: pt.lat, lng: pt.lng, altitude: 14 })),
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
});
map3d.append(trailPolyline);
```

## Framework Samples

Explore all 8 standalone implementations of **Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route**:

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Terms of Service & Licensing

- Usage of Google Maps Platform APIs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Learn more about [Google Maps Platform Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d-maps-overview?utm_campaign=gmp_git_agentsamples_v1.0.0), [Elevation API](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Places API (New)](https://developers.google.com/maps/documentation/javascript/places?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
