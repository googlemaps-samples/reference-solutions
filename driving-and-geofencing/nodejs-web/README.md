# Field Workforce Geofenced Attendance & Site Audit Router — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `TerraDrawGoogleMapsAdapter`, Places API New, Routes API v2, Geocoding API v4)

An Austin, TX field workforce geofenced attendance check-in and multi-site retail audit planner built with a **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and an interactive **Maps JavaScript API** web frontend.

## Key Capabilities

- **Pre-Seeded & Supervisor-Drawn Geofences (Terra Draw):** Displays 3 Austin client site geofence polygons and mounts [Terra Draw](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0) (`terra-draw` + `terra-draw-google-maps-adapter`) so supervisors can draw and edit new polygon zones on the map.
- **Geofenced Attendance Verification:** Evaluates simulated or dragged worker GPS coordinates against all active polygons via `google.maps.geometry.poly.containsLocation` to unlock or lock the **Verified Clock-In** badge.
- **Server-Side Reverse Geocoding (Geocoding API v4):** Converts worker lat/lng coordinates into human-readable Austin street addresses via `GET /api/geocode/reverse` (`X-Goog-Api-Key` + `X-Goog-FieldMask`).
- **Live Audit Site Discovery (Places API New + `PlaceAutocompleteElement`):** Discovers live Austin retail audit sites via `POST /api/places/search` (`places:searchText`) and allows adding custom stops via `PlaceAutocompleteElement` (`gmp-select`).
- **Optimized Multi-Stop Driving Route (Routes API v2):** Computes traffic-aware, waypoint-optimized audit loops via `POST /api/routes/compute` (`optimizeWaypointOrder: true`, `TRAFFIC_AWARE`) and renders the decoded route polyline and numbered `AdvancedMarkerElement` pins.

## Quickstart & API Key Setup

### Option A: Zero-Billing Maps Demo Key (Prototyping)

1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted and generate your key.
4. Copy `.env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`:

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>
```

> **Note:** The Maps Demo Key has a daily reset quota and is intended for prototyping only. Review the [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for limits.

### Option B: Production Google Cloud API Key

1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [Restricting an API Key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Install, Build & Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

- **`src/server.ts` (Express + TypeScript BFF):**
  - Binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and validates incoming request payloads.
  - Exposes `/api/config`, `/api/places/search`, `/api/routes/compute`, and `/api/geocode/reverse` using explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers.
  - Serves local browser ESM bundles from `node_modules` via `/vendor/*` alongside static assets in `public/`.
- **`public/app.js` (Interactive Maps JS UI):**
  - Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
  - Uses `AdvancedMarkerElement` + `PinElement`, `PlaceAutocompleteElement` (`gmp-select`), `geometry.poly.containsLocation`, `geometry.encoding.decodePath`, and `TerraDrawGoogleMapsAdapter`.
  - Builds all dynamic DOM elements safely via `document.createElement()`, `textContent`, and `replaceChildren()` (zero `innerHTML`).

### Core Implementation Snippet (Routes API v2 Proxy)

```ts
const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation',
  },
  body: JSON.stringify({
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    intermediates: intermediates.map((pt) => ({
      location: { latLng: { latitude: pt.lat, longitude: pt.lng } },
    })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: intermediates.length > 0,
  }),
});
```

## Google Maps Platform Documentation & Terms

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes & Waypoint Optimization](https://developers.google.com/maps/documentation/routes/opt-way?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API v4 Reverse Geocoding](https://developers.google.com/maps/documentation/geocoding/reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Framework Samples

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
