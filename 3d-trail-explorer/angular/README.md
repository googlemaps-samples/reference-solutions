# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — Angular Standalone Components + TypeScript (@angular/google-maps)

An interactive Photorealistic 3D terrain storytelling and trail exploration application in **Lake Tahoe (Emerald Bay & Rubicon Trail)** built with **Angular Standalone Components + TypeScript (`@angular/google-maps`)**, **`@googlemaps/js-api-loader` (`setOptions` / `importLibrary`)**, **`Map3DElement` (`<gmp-map-3d>`)**, **`Polyline3DElement`**, **`Marker3DInteractiveElement`**, **`PopoverElement`**, **`PinElement`**, **`GoogleMap`**, **`MapAdvancedMarker`**, **`PlaceAutocompleteElement`**, **`Place.searchByText`**, and **`ElevationService.getElevationAlongPath`**.

---

## Features & Google Maps Platform Architecture

- **Photorealistic 3D Terrain (`maps3d` + Map Tiles API):** Renders `<gmp-map-3d>` (`Map3DElement`) with `mode="HYBRID"` (toggleable to `SATELLITE`) and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`.
- **Extruded 3D Trail Route (`Polyline3DElement`):** Draws the Rubicon Trail & Emerald Bay route in bright red `rgb(255, 0, 0)` (`strokeWidth: 8`, `altitudeMode: 'RELATIVE_TO_GROUND'`, `extruded: true`).
- **Interactive 3D Viewpoint Markers (`Marker3DInteractiveElement` + `PinElement` + `PopoverElement`):** Places numbered 3D trailhead and overlook markers with `gmp-click` handlers and safe DOM popovers.
- **Guided 3D Camera Storytelling (`flyCameraTo`):** 5 chapter tour presets (*Emerald Bay Overview*, *Eagle Falls Trailhead*, *Rubicon Ridge*, *Eagle Point Overlook*, *Tahoe Summit Panorama*) plus an Auto-Play tour toggle smoothly animating `center`, `heading`, `tilt`, and `range`.
- **Live Elevation Profile (`ElevationService.getElevationAlongPath`):** Samples 64 equidistant elevation points along the Lake Tahoe trail, calculates total distance, peak altitude, gain, and loss, and renders an interactive SVG elevation profile chart synchronized with the 3D map.
- **Landmark Search (`PlaceAutocompleteElement` + `Place.searchByText`):** Supports both live Places Autocomplete (`gmp-select` -> `placePrediction.toPlace()` -> `place.fetchFields()`) and direct landmark text search to fly the 3D camera to any Lake Tahoe destination.
- **2D / 3D Switcher (`@angular/google-maps`):** Includes an optional 2D Trail Map view built with standalone `GoogleMap`, `MapAdvancedMarker`, and `MapPolyline` using `mapId: 'DEMO_MAP_ID'`.

### Core Implementation Snippet

```typescript
const [{ Map3DElement, Polyline3DElement, Marker3DInteractiveElement }, { PinElement }] =
  await Promise.all([importLibrary('maps3d'), importLibrary('marker')]);

const polyline = new Polyline3DElement({
  path: LAKE_TAHOE_TRAIL_PATH.map((wp) => ({ lat: wp.lat, lng: wp.lng, altitude: 18 })),
  strokeColor: 'rgb(255, 0, 0)',
  strokeWidth: 8,
  altitudeMode: 'RELATIVE_TO_GROUND',
  extruded: true,
});

mapEl.flyCameraTo({
  endCamera: {
    center: { lat: 38.9578, lng: -120.1062, altitude: 1980 },
    heading: 135,
    tilt: 72,
    range: 1100,
  },
  durationMillis: 2400,
});
```

---

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your demo key. *(Note: demo keys have a daily reset limit and are not for production usage.)*

#### Option B: Production Google Cloud API Key
1. Create a key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Map Tiles API**, **Places API (New)**, and **Elevation API**.
3. Restrict your key by HTTP referrer and designated APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. Install, Typecheck, Build & Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200` in a WebGL2-enabled browser.

---

## Documentation References

- [Maps JavaScript API Photorealistic 3D Maps](https://developers.google.com/maps/documentation/javascript/3d/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation API Overview](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Framework Implementations

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
