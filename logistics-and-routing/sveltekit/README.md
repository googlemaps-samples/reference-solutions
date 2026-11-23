# Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)

Built with **SvelteKit 2 + Svelte 5 + TypeScript**, [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) v2 (`setOptions` + `importLibrary`), and modern zero-deprecation Google Maps Platform APIs: **`AdvancedMarkerElement`**, **`PinElement`**, **`PlaceAutocompleteElement`**, **`Place.searchByText`**, **`Route.computeRoutes`**, **`RouteMatrix.computeRouteMatrix`**, and **Roads API `snapToRoads`**.

---

## Features

- **Distraction-Free Logistics Vector Map:** Initializes a Dallas vector map (`mapId: "DEMO_MAP_ID"`, `clickableIcons: false`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`) with an optional live `TrafficLayer` toggle.
- **Status-Coded Fleet Telemetry:** Displays active Dallas freight units (`En Route`, `Delayed`, `Idle`) using custom `AdvancedMarkerElement` badges, interactive `InfoWindow` popups, and synchronized status filter pills.
- **Raw GPS vs. Roads API Road-Snapping:** Calls `/api/roads/snap` (proxying `https://roads.googleapis.com/v1/snapToRoads?interpolate=true`) to compare noisy raw GPS breadcrumbs (dashed red `Polyline`) against road-snapped interpolated geometry (solid blue `Polyline`), reporting unique road segment Place IDs and mean snap offset in meters.
- **Live Dallas Hub Discovery & Autocomplete:** Discovers Dallas distribution centers at runtime via Places API (New) (`/api/places/search` + `Place.searchByText` fallback) and includes a native `PlaceAutocompleteElement` (`gmp-select` event) in the command bar to add custom stops.
- **Multi-Stop Dispatch & Route Matrix:** Calculates traffic-aware multi-stop corridor routes (with optional `optimizeWaypointOrder`) and depot-to-hub ETA/distance matrices via `/api/routes/compute` and `/api/routes/matrix` (with `Route.computeRoutes` / `RouteMatrix.computeRouteMatrix` JS SDK fallback).

---

## Quickstart & API Key Setup

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping Only):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your Demo Key and copy it.
*(Note: The Demo Key has a daily reset limit, is not for production, and may not include Roads API `snapToRoads`.)*

**Option B — Google Cloud Console Key (Full Production & Roads API Support):**
1. Create or select a project in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Roads API**.
3. Restrict your key following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Adding API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

---

## Architecture Summary

1. **SSR-Safe Dynamic Key & Loader:** The app reads `PUBLIC_GOOGLE_MAPS_API_KEY` via SvelteKit's `$env/dynamic/public` and initializes `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) strictly inside Svelte's `onMount` lifecycle so SSR never touches `window` or `document`.
2. **SvelteKit BFF Server Proxies (`src/routes/api/.../+server.ts`):**
   - `POST /api/places/search` → `places.googleapis.com/v1/places:searchText` (explicit `X-Goog-FieldMask`)
   - `POST /api/roads/snap` → `roads.googleapis.com/v1/snapToRoads` (`interpolate=true`)
   - `POST /api/routes/compute` → `routes.googleapis.com/directions/v2:computeRoutes` (explicit `X-Goog-FieldMask`)
   - `POST /api/routes/matrix` → `routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix` (explicit `X-Goog-FieldMask`)
3. **Core Client Initialization Snippet (`src/lib/maps/loader.ts`):**

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [core, maps, marker, places, routes, geometry] = await Promise.all([
	importLibrary('core'),
	importLibrary('maps'),
	importLibrary('marker'),
	importLibrary('places'),
	importLibrary('routes'),
	importLibrary('geometry')
]);

const map = new maps.Map(mapElement, {
	center: { lat: 32.7767, lng: -96.797 },
	zoom: 12,
	mapId: 'DEMO_MAP_ID',
	clickableIcons: false,
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

---

## Sample Implementations Across Stacks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

---

## Compliance & Terms

Use of Google Maps Platform APIs and SDKs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Roads API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
