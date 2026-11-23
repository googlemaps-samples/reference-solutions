# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map3DElement`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PinElement`, `PlaceAutocompleteElement`, `ElevationService`)

An interactive **Lake Tahoe 3D Trail Explorer & Guided Camera Tour** web application built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a full-viewport glassmorphic web frontend powered by the Google Maps Platform **Maps JavaScript API (`maps3d`, `marker`, `places`, `elevation`)**, **Map Tiles API (Photorealistic 3D Tiles)**, **Places API (New)**, and **Elevation API**.

---

## Key Capabilities

- **Photorealistic 3D Terrain (`<gmp-map-3d>` / `Map3DElement`)**: Renders Lake Tahoe's Emerald Bay and Rubicon Ridge with smooth 3D camera orbit, tilt, heading, and range controls (`HYBRID` and `SATELLITE` 3D modes) and attribution ID `gmp_git_agentsamples_v1.0.0`.
- **Extruded 3D Trail Route (`Polyline3DElement`)**: Plots the 16-waypoint Rubicon & Emerald Bay hiking corridor in bright red `rgb(255, 0, 0)` with `altitudeMode: 'RELATIVE_TO_GROUND'` and `extruded: true`.
- **Interactive 3D Viewpoint Markers (`Marker3DInteractiveElement` + `PinElement` + `PopoverElement`)**: Numbered 3D pins along the trail respond to `gmp-click` events, open accessible 3D popovers, and synchronize the active tour chapter.
- **Guided Camera Tour & Auto-Play (`flyCameraTo`)**: Five preset chapters (`Emerald Bay Overview`, `Eagle Falls Trailhead`, `Rubicon Ridge`, `Eagle Point Overlook`, `Tahoe Summit Panorama`) execute smooth 3D `flyCameraTo` transitions while updating live camera telemetry (`HDG`, `TILT`, `RNG`).
- **Live Elevation Profile & Metrics (`/api/elevation/profile` + `ElevationService`)**: Samples 48 equidistant terrain points along the trail path via the Elevation API, calculates total distance, min/max elevation, and cumulative ascent/descent, and renders an interactive SVG elevation chart that lets you click any point to fly the 3D camera there.
- **Places Landmark Search (`PlaceAutocompleteElement` + `/api/places/search` + `/api/places/autocomplete`)**: Supports both the official Maps JS `PlaceAutocompleteElement` (`gmp-select`) widget and a server-side BFF search bar backed by Places API (New) to fly the 3D camera to any Lake Tahoe landmark.

---

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A — Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and copy your generated demo key.

> **Note:** The Maps Demo Key is intended for prototyping only, has daily quota limits, and is governed by the Maps Demo Project Terms of Service.

#### Option B — Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable the following APIs:
   - [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Map Tiles API](https://developers.google.com/maps/documentation/tile/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
3. Restrict your key following the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in a WebGL2-capable browser.

---

## Architecture Summary

```text
nodejs-web/
├── src/server.ts        # Express + TypeScript BFF server (127.0.0.1)
│   ├── GET  /api/health
│   ├── GET  /api/config
│   ├── POST /api/places/search        -> places.googleapis.com/v1/places:searchText
│   ├── POST /api/places/autocomplete  -> places.googleapis.com/v1/places:autocomplete
│   └── POST /api/elevation/profile    -> maps.googleapis.com/maps/api/elevation/json
└── public/
    ├── index.html       # Full-viewport <gmp-map-3d> shell + floating sidebar & header
    ├── styles.css       # Dark-slate glassmorphic styling (min-height >= 540px map)
    └── app.js           # Dynamic importLibrary loader, 3D overlays, camera tour, SVG chart
```

### Core Implementation Snippet

```js
const [{ Polyline3DElement, Marker3DInteractiveElement, PopoverElement }, { PinElement }] =
  await Promise.all([
    google.maps.importLibrary('maps3d'),
    google.maps.importLibrary('marker'),
  ]);

const map3d = document.querySelector('gmp-map-3d');
map3d.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];

const trailPolyline = new Polyline3DElement({
  path: TRAIL_PATH,
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
  drawsOccludedSegments: true,
});
map3d.append(trailPolyline);

map3d.flyCameraTo({
  endCamera: {
    center: { lat: 38.9587, lng: -120.0985, altitude: 1915 },
    range: 1750,
    tilt: 74,
    heading: 315,
  },
  durationMillis: 2200,
});
```

---

## Compliance & Terms of Service

- Usage of Google Maps Platform APIs and SDKs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Do not cache or store place content beyond permitted Terms limits, and never hardcode API keys in source files.

---

## Related Framework Implementations

Explore the other standalone implementations of this solution:

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
