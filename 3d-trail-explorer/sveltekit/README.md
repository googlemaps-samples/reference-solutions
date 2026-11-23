# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)

An interactive **Photorealistic 3D terrain storytelling and trail exploration** web application in **Lake Tahoe (Emerald Bay & Rubicon Ridge)** built with **SvelteKit + TypeScript** and modern Google Maps Platform Web Components & APIs:

- [`Map3DElement`](https://developers.google.com/maps/documentation/javascript/reference/3d-map#Map3DElement?utm_campaign=gmp_git_agentsamples_v1.0.0) (`<gmp-map-3d>`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`
- `Polyline3DElement` rendering an extruded bright-red `rgb(255, 0, 0)` 3D hiking trail route (`altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`)
- `Marker3DInteractiveElement` + `PinElement` (`glyphText`) + `PopoverElement` with `gmp-click` listeners
- `PlaceAutocompleteElement` (`gmp-select` + `placePrediction.toPlace().fetchFields(...)`) & `Place.searchByText` / Places API (New) BFF endpoints
- `ElevationService.getElevationAlongPath` & Elevation REST API BFF proxy for interactive trail elevation profiling and gain/loss metrics

## Sample Implementations Across Frameworks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Architecture Summary

- **SSR-Safe Client Initialization (`src/routes/+page.svelte`, `src/lib/maps3dClient.ts`)**: All browser-only Google Maps loading is guarded inside Svelte's `onMount` lifecycle using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary('maps3d' | 'marker' | 'places' | 'elevation' | 'core')`) and `$env/dynamic/public` (`env.PUBLIC_GOOGLE_MAPS_API_KEY`).
- **Server-Side BFF Proxy Endpoints (`src/routes/api/.../+server.ts`)**:
  - `POST /api/places/search`: Proxies Places API (New) `places:searchText` and Place Details with `X-Goog-FieldMask` to eliminate browser CORS failures.
  - `POST /api/places/autocomplete`: Proxies Places API (New) `places:autocomplete` with `X-Goog-FieldMask`.
  - `POST /api/elevation/profile`: Proxies the Google Maps Elevation API (`maps.googleapis.com/maps/api/elevation/json`) for equidistant path sampling and point elevations.
- **Security Headers (`src/hooks.server.ts`)**: Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` on all responses.

### Core 3D Map & Extruded Trail Snippet

```ts
const modules = await loadMaps3DLibraries(apiKey);
await customElements.whenDefined('gmp-map-3d');

const { Polyline3DElement, Marker3DInteractiveElement } = modules.maps3d;
const { PinElement } = modules.marker;

map3d.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
map3d.mode = 'HYBRID';

const trailPolyline = new Polyline3DElement({
  path: EMERALD_BAY_TRAIL_PATH.map((pt) => ({ lat: pt.lat, lng: pt.lng, altitude: 18 })),
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
  drawsOccludedSegments: true
});
map3d.append(trailPolyline);

// Smooth 3D camera storytelling animation
map3d.flyCameraTo({
  endCamera: {
    center: chapter.camera.center,
    altitudeMode: 'RELATIVE_TO_GROUND',
    heading: chapter.camera.heading,
    tilt: chapter.camera.tilt,
    range: chapter.camera.range
  },
  durationMillis: 2000
});
```

## Quickstart & API Key Setup

### Option A: Zero-Billing Prototyping with Maps Demo Key

1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted and generate/reveal your demo key.
4. Copy `.env.example` to `.env` and set `PUBLIC_GOOGLE_MAPS_API_KEY`:

```bash
cp .env.example .env
```

### Option B: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Map Tiles API**, **Places API (New)**, and **Elevation API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer / server IP and allowed APIs.

## Install, Typecheck, Build & Preview

```bash
npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Google Maps Platform Resources & Terms

- [Maps JavaScript API Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d-maps-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Documentation](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
