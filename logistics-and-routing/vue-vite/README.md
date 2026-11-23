# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements) with `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, and Roads API `v1/snapToRoads`

A standalone Dallas fleet telematics, road-snapped GPS trace inspector, and multi-stop dispatch dashboard built with **Vue 3**, **Vite**, **TypeScript**, and zero-deprecation **Google Maps Platform** APIs.

## Architecture Summary

- **Vector Logistics Map (`Map` + `TrafficLayer`):** Initialized via `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`) with `mapId: 'DEMO_MAP_ID'`, `clickableIcons: false` to de-emphasize tourist POIs and highlight freight corridors, and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Status-Coded Fleet Markers (`AdvancedMarkerElement` + `PinElement`):** Renders active Dallas vehicles (`En Route`, `Delayed`, `Idle`) and numbered depot/drop-off hubs with DOM-safe `InfoWindow` popups and real-time status filtering.
- **Live Hub Discovery & Search (`Place.searchByText` + `PlaceAutocompleteElement`):** Discovers real Dallas distribution centers/logistics hubs on load via `Place.searchByText`, and mounts `<gmp-place-autocomplete>` natively in Vue (configured via `isCustomElement: (tag) => tag.startsWith('gmp-')`) listening to `gmp-select` + `placePrediction.toPlace().fetchFields()`.
- **GPS Road-Snapping (`Roads API v1/snapToRoads`):** Sends noisy raw vehicle GPS breadcrumbs to a same-origin Vite dev/preview proxy (`/api/roads/snap`) forwarding to `https://roads.googleapis.com/v1/snapToRoads?interpolate=true` with `X-Goog-Maps-Solution-ID: gmp_git_agentsamples_v1.0.0`, computing mean snap offset (meters) via the Geometry library (`spherical.computeDistanceBetween`), with automatic `Route.computeRoutes` corridor fallback if a prototyping key lacks Roads API permissions.
- **Multi-Stop Dispatch & Matrix (`Route.computeRoutes` + `RouteMatrix.computeRouteMatrix`):** Computes traffic-aware multi-stop dispatch corridor polylines (with optional `optimizeWaypointOrder`) and origin-to-hub travel-time/distance matrices.

### Core Implementation Snippet

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en-US',
  region: 'US',
});

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Route, RouteMatrix }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('routes'),
  ]);

const map = new Map(container, {
  center: { lat: 32.7767, lng: -96.797 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  clickableIcons: false,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

**Option A — Zero-Billing Maps Demo Key (Prototyping Only):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Demo Project Terms.
3. Generate and copy your demo key. *(Note: Demo keys have daily limits, are not for production, and may not include Roads API—the app automatically falls back to `Route.computeRoutes` corridor geometry for trace snapping when needed.)*

**Option B — Production Google Cloud API Key:**
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**.
3. Restrict the key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-key>
```

### 3. Install, Typecheck, Build, and Preview

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Documentation References

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Advanced Markers (`AdvancedMarkerElement`)](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) — Place Class & Autocomplete](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API — `Route` & `RouteMatrix`](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Roads API — Snap to Roads](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Standalone Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
