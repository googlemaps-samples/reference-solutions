# Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements) — `Map3DElement`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PinElement`, `PopoverElement`, `PlaceAutocompleteElement`, `Place`, `ElevationService` — Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route

An interactive Photorealistic 3D Lake Tahoe terrain storytelling and hiking trail explorer built with **Vue 3**, **Vite**, **TypeScript**, and the **Google Maps JavaScript API** (`maps3d`, `marker`, `places`, `elevation`) loaded via `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`).

## Features

- **Photorealistic 3D Lake Tahoe Terrain (`<gmp-map-3d>` / `Map3DElement`)**: Full-viewport 3D satellite/hybrid terrain centered over Emerald Bay (`38.9542, -120.1103`) with live camera telemetry (`heading`, `tilt`, `range`).
- **Extruded 3D Trail Route (`Polyline3DElement`)**: Bright red `rgb(255, 0, 0)` extruded 3D hiking trail path (`altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`) tracing Eagle Falls, Vikingsholm Cove, Rubicon Ridge, and Eagle Point Overlook.
- **Interactive 3D Viewpoint Markers (`Marker3DInteractiveElement` + `PinElement` + `PopoverElement`)**: Accessible numbered 3D pins with popovers and `gmp-click` handlers.
- **Guided 3D Camera Tour**: Five chapter presets (`1. Emerald Bay Overview`, `2. Eagle Falls Trailhead`, `3. Rubicon Ridge`, `4. Eagle Point Overlook`, `5. Tahoe Summit Panorama`) plus an Auto-Play Tour toggle driving smooth `map3d.flyCameraTo()` transitions.
- **Live Elevation API Profile & Metrics (`ElevationService.getElevationAlongPath`)**: Samples 48 equidistant terrain points along the trail to compute distance, min/max elevation, ascent/descent, and renders an interactive SVG profile chart synced with a 3D map probe marker.
- **Places API (New) Landmark Search (`PlaceAutocompleteElement` + `Place.searchByText`)**: Search any Lake Tahoe landmark via `gmp-select` autocomplete or text search to fly the 3D camera, drop a 3D marker, and display live place & elevation details.

## Google Maps Platform Products Used

- [Maps JavaScript API — Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`maps3d` library)
- [Maps JavaScript API — Marker Library](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`PinElement`)
- [Places API (New) — Places Library](https://developers.google.com/maps/documentation/javascript/place-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`PlaceAutocompleteElement`, `Place.searchByText`, `Place.fetchFields`)
- [Elevation API — ElevationService](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Map Tiles API — Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (subject to daily quota limits; not for production use).

**Option B — Production Google Cloud Key:**
1. Create a key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Restrict the key by HTTP referrer and allowed APIs per [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture & Core Implementation

Vite's Vue plugin (`vite.config.ts`) configures `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-map-3d>` compiles natively as a Web Component. Inside `onMounted`, `@googlemaps/js-api-loader` loads `maps3d`, `marker`, `places`, and `elevation` using `setOptions` and `importLibrary`:

```ts
setOptions({ key: apiKey, v: 'weekly' });

const [maps3d, marker, places, elevation] = await Promise.all([
  importLibrary('maps3d'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('elevation'),
]);

const trailPolyline = new maps3d.Polyline3DElement({
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
  path: TRAIL_WAYPOINTS.map((wp) => ({ lat: wp.lat, lng: wp.lng, altitude: 18 })),
});
mapEl.append(trailPolyline);
```

## Multi-Framework Samples

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

> *Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account. Use of this code is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).*

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
