# Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

Interactive Photorealistic 3D terrain storytelling and hiking trail explorer in **Lake Tahoe (Emerald Bay State Park)** built with **Next.js App Router + TypeScript**, **`@vis.gl/react-google-maps/3d`** (`Map3D` / `<gmp-map-3d>`, `Polyline3D` / `Polyline3DElement`, `Marker3D` / `Marker3DInteractiveElement`, `Popover` / `PopoverElement`, `Pin` / `PinElement`), **`PlaceAutocompleteElement`** (`gmp-select`), **Places API (New)** (`places:searchText`, `places:autocomplete`), and the **Elevation API** (`maps/api/elevation/json`).

---

## Features

- **Photorealistic 3D Terrain (`Map3D` / `<gmp-map-3d>`):** Renders Lake Tahoe's Sierra Nevada topography in `HYBRID` 3D mode with usage attribution `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Extruded 3D Trail Route (`Polyline3D` / `Polyline3DElement`):** Renders the 14-point Emerald Bay / Eagle Falls / Rubicon Ridge trail in bright red `rgb(255, 0, 0)` with `strokeWidth: 8`, `altitudeMode: 'RELATIVE_TO_GROUND'`, and `extruded: true`.
- **Interactive 3D Viewpoint Markers (`Marker3D` / `Marker3DInteractiveElement` + `PinElement`):** Numbered 3D pins for all 5 scenic chapters plus dynamically placed pins for searched landmarks and elevation profile focus points, paired with a `<Popover>` info overlay.
- **Guided 3D Camera Tour & Auto-Play:** Smooth `flyCameraTo()` transitions adjusting `center` (lat/lng/altitude), `heading`, `tilt`, and `range`, plus live telemetry readout (`HDG`, `TILT`, `RNG`) via `onCameraChanged`.
- **Places API (New) Landmark Search:** Imperatively mounted `PlaceAutocompleteElement` (`gmp-select` + `placePrediction.toPlace()` + `place.fetchFields()`) alongside a BFF search bar backed by Next.js Route Handlers (`/api/places/autocomplete` and `/api/places/search`).
- **Live Elevation Profile & Trail Metrics:** Samples equidistant trail elevations via `/api/elevation/profile` (Elevation REST API), computes distance, peak elevation, total ascent/descent, and renders an interactive SVG chart where hovering or clicking flies the 3D camera along the trail.

---

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your demo key. *(Note: The Demo Key has a daily reset limit and is for prototyping only, not production.)*

#### Option B: Google Cloud Console Key (Production)
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable the following APIs:
   - [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (including Photorealistic 3D Maps)
   - [Map Tiles API](https://developers.google.com/maps/documentation/tile/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
3. Restrict your API key by HTTP referrer (client) and IP address / designated APIs per the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://developers.google.com/maps/documentation/javascript/get-api-key?utm_campaign=gmp_git_agentsamples_v1.0.0#restrict_key).

> **Cost Notice:** Usage of Google Maps Platform products and services in production may incur costs against your Google Cloud billing account. Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key
```

*(Never commit `.env.local` or hardcode API keys in source files.)*

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

---

## Architecture Summary

- **Frontend (`src/components/`):**
  - [`TrailExplorerApp.tsx`](src/components/TrailExplorerApp.tsx) wraps the explorer inside `<APIProvider version="beta" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` and coordinates camera fly-to presets, auto-play tours, live Places search, and Elevation API sampling.
  - [`TrailMap3D.tsx`](src/components/TrailMap3D.tsx) renders `<Map3D>` (`mode={MapMode.HYBRID}`), the bright-red extruded `<Polyline3D>`, interactive `<Marker3D>` + `<Pin>` viewpoints, and `<Popover>`.
  - [`PlaceSearchBar.tsx`](src/components/PlaceSearchBar.tsx) imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` (`gmp-select` -> `toPlace()` -> `fetchFields()`) alongside a keyboard-accessible search input backed by `/api/places/*`.
  - [`ElevationProfileChart.tsx`](src/components/ElevationProfileChart.tsx) renders trail distance/ascent/descent metrics and an interactive SVG elevation profile chart.
- **Backend-for-Frontend Route Handlers (`src/app/api/`):**
  - `POST /api/places/search` -> `places.googleapis.com/v1/places:searchText` (`X-Goog-Api-Key` + `X-Goog-FieldMask`)
  - `POST /api/places/autocomplete` -> `places.googleapis.com/v1/places:autocomplete` (`X-Goog-Api-Key` + `X-Goog-FieldMask`)
  - `POST /api/elevation/profile` -> `maps.googleapis.com/maps/api/elevation/json`
- **Security Headers (`next.config.mjs`):** Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

### Core Implementation Snippet

```tsx
<Map3D
  ref={map3dRef}
  mode={MapMode.HYBRID}
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 38.9542, lng: -120.1103, altitude: 1920 }}
  defaultHeading={38}
  defaultTilt={66}
  defaultRange={4200}
  onCameraChanged={handleCameraChanged}
>
  <Polyline3D
    path={TAHOE_TRAIL_PATH}
    strokeColor="rgb(255, 0, 0)"
    strokeWidth={8}
    altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
    extruded={true}
  />
  {CHAPTER_STOPS.map((stop) => (
    <Marker3D
      key={stop.id}
      position={stop.position}
      altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
      extruded={true}
      onClick={() => onSelectChapter(stop)}
    >
      <Pin glyphText={stop.markerGlyph} background="#ff0000" glyphColor="#ffffff" />
    </Marker3D>
  ))}
</Map3D>
```

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
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
