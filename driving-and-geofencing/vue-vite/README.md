# Field Workforce Geofenced Attendance & Site Audit Router — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements, `AdvancedMarkerElement`, `Place.searchByText`, `Route.computeRoutes`, `Geocoder`, Terra Draw)

A standalone, zero-deprecation **Vue 3 + Vite + TypeScript** geospatial operations application centered in **Austin, TX** (`30.2672, -97.7431`). Supervisors can inspect pre-seeded client site geofence polygons, draw and edit custom polygon geofences using **Terra Draw**, simulate field worker GPS positions to test geofence entry/exit detection and live reverse geocoding (unlocking or locking the **Verified Clock-In** badge), discover live Austin audit locations via **Places API (New)** (`Place.searchByText`), and compute an optimized multi-stop driving itinerary via **Routes API** (`Route.computeRoutes` with `optimizeWaypointOrder: true`).

## Modern Google Maps Platform Stack Used

- **Maps JavaScript API (`maps` library):** `google.maps.Map` initialized with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`, plus `google.maps.Polygon` and `google.maps.InfoWindow`.
- **Advanced Markers (`marker` library):** `AdvancedMarkerElement` and `PinElement` (`glyphText`) for the simulated worker GPS pin and numbered audit stops (`1..N`).
- **Places API (New) (`places` library):** `Place.searchByText` with field masks (`id`, `displayName`, `formattedAddress`, `location`, `primaryTypeDisplayName`).
- **Routes API (`routes` library):** `Route.computeRoutes` with `optimizeWaypointOrder: true`, `routingPreference: "TRAFFIC_AWARE"`, `optimizedIntermediateWaypointIndices`, and `route.createPolylines()`.
- **Geocoding API (`geocoding` library):** `Geocoder.geocode({ location })` for live reverse geocoding of worker coordinates into street addresses.
- **Geometry Library (`geometry` library):** `google.maps.geometry.poly.containsLocation` for client-side point-in-polygon evaluation across both pre-seeded and Terra Draw polygons.
- **Polygon Drawing:** `terra-draw` + `terra-draw-google-maps-adapter` replacing the deprecated `google.maps.drawing` library.

## Quickstart & API Key Setup

### 1. Obtain a Free Maps Demo Key (Prototyping)

If you do not have a Google Cloud billing account configured yet, you can mint a free **Maps Demo Key** for prototyping:

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required for the Demo Key).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your Demo Key.

> **Note:** The Maps Demo Key has a daily reset limit and is intended for prototyping only. For production usage, create and restrict an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) (HTTP referrer + API restrictions per the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0)) and enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**. Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account.

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and paste your key:

```bash
cp .env.example .env.local
```

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local hot-reload development:

```bash
npm run dev
```

## Architecture Summary & Core Implementation Snippet

- **`vite.config.ts`:** Configures `@vitejs/plugin-vue` with `isCustomElement: (tag) => tag.startsWith('gmp-')` so Google Maps Platform Web Components work natively without Vue component warnings, and binds dev/preview servers to `127.0.0.1`.
- **`src/services/googleMapsService.ts`:** Encapsulates `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), `Place.searchByText`, `Geocoder` reverse geocoding, and `Route.computeRoutes` with waypoint optimization.
- **`src/App.vue`:** Coordinates the 56px top metrics bar, the 380px Operations Sidebar (Worker GPS & Attendance, Terra Draw Geofence Controls, Multi-Stop Audit Router), and the full-height Austin map stage while keeping Google Maps SDK and Terra Draw instances non-reactive to prevent Vue Proxy wrapping conflicts.

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'en-US', region: 'US' });

const [{ Map }, { Route }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('routes'),
]);

const map = new Map(mapEl, {
  center: { lat: 30.2672, lng: -97.7431 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await Route.computeRoutes({
  origin: stops[0].location,
  destination: stops[stops.length - 1].location,
  intermediates: stops.slice(1, -1).map((s) => ({ location: s.location })),
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  optimizeWaypointOrder: true,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'optimizedIntermediateWaypointIndices'],
});
```

## Documentation & Terms References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw on Google Maps Example](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes JS Migration](https://developers.google.com/maps/documentation/javascript/routes/routes-js-migration?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) JS Library](https://developers.google.com/maps/documentation/javascript/place-class?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
