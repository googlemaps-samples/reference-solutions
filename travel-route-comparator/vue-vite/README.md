# Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements) — Multi-Modal Commute Comparator & Trail Elevation Tracker

A standalone Vue 3 + Vite + TypeScript web application implementing a Denver-to-Boulder **Multi-Modal Commute Comparator & Trail Elevation Tracker** using modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs & Classes Used

- **Maps JavaScript API Loader (`@googlemaps/js-api-loader` v2):** Uses `setOptions()` and `importLibrary()` (`core`, `maps`, `marker`, `places`, `routes`, `elevation`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **2D Vector Map & Layers:** `google.maps.Map` initialized with `mapId: 'DEMO_MAP_ID'`, `google.maps.Polyline` for interactive primary/alternative routes, and `google.maps.BicyclingLayer` enabled in Cycling mode.
- **Advanced Markers:** `google.maps.marker.AdvancedMarkerElement` and `google.maps.marker.PinElement` (`glyphText`) for Origin (`A`), Destination (`B`), and the elevation-chart-synchronized route hover indicator.
- **Places API (New):** `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) listening to `gmp-select` (`event.placePrediction.toPlace()` → `place.fetchFields()`), plus `Place.searchByText()` on initial load to resolve `Denver Union Station, Denver, CO` and `Chautauqua Park, Boulder, CO`.
- **Routes API (`Route.computeRoutes`):** Computes live routes across `DRIVING`, `BICYCLING`, `WALKING`, and `TRANSIT` with `computeAlternativeRoutes: true`, `routeModifiers` (`avoidTolls`, `avoidHighways`), `extraComputations: ['TOLLS', 'FUEL_CONSUMPTION']`, and `requestedReferenceRoutes: ['FUEL_EFFICIENT']` eco-friendly routing.
- **Elevation API (`ElevationService.getElevationAlongPath`):** Samples 64 equidistant elevation points along the active cycling or walking route to compute cumulative elevation gain, min/max altitude, and slope grade %, synchronized bidirectionally with the map hover marker.

## Setup & API Key Configuration

> **Cost Notice:** Using Google Maps Platform APIs in production may incur costs against your Google Cloud billing account. For zero-cost prototyping, start with a Maps Demo Key.

### 1. Obtain an API Key

- **Option A — Free Zero-Billing Maps Demo Key (Prototyping):**
  1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with any Google account (no billing card requested) and accept the Maps Demo Project Terms.
  3. Generate and copy your Demo Key (subject to daily quota limits; not for production).
- **Option B — Production Google Cloud Key:**
  1. Create or select a project in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Elevation API**.
  3. Restrict your key by **HTTP Referrer** and designated APIs following [Restricting API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variable

```bash
cp .env.example .env.local
# Edit .env.local and set:
# VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with HMR:

```bash
npm run dev
```

## Architecture Summary

1. **Bootstrap & Attribution (`src/services/mapsClient.ts`):** Calls `setOptions({ key, v: 'weekly' })` once and loads `core`, `maps`, `marker`, `places`, `routes`, and `elevation` via `importLibrary()`.
2. **Custom Elements in Vue (`vite.config.ts` & `src/components/PlaceSearchInput.vue`):** Vite's Vue plugin sets `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-place-autocomplete>` mounts natively without Vue component resolution warnings.
3. **Seeded Multi-Modal Initialization (`src/App.vue`):** On mount, resolves the seeded Denver & Boulder endpoints via `Place.searchByText()`, initializes `BICYCLING` as the active mode alongside `DRIVING`, `WALKING`, and `TRANSIT` comparisons, renders color-coded `Polyline`s and `AdvancedMarkerElement` pins on `mapId: 'DEMO_MAP_ID'`, and loads the 64-point `ElevationService.getElevationAlongPath` profile.
4. **Bidirectional Elevation Sync (`src/components/ElevationProfileChart.vue`):** Scrubbing along the SVG elevation & slope chart emits the active `ElevationSamplePoint`, updating both the slope/altitude readout and the live `AdvancedMarkerElement` indicator on the map.

### Core Implementation Snippet

```ts
const { Route } = await importLibrary('routes');
const { routes } = await Route.computeRoutes({
  origin: origin.location,
  destination: destination.location,
  travelMode: 'DRIVING',
  fields: [
    'path',
    'distanceMeters',
    'durationMillis',
    'routeLabels',
    'travelAdvisory',
    'localizedValues',
  ],
  computeAlternativeRoutes: true,
  routingPreference: ecoFriendly ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE',
  routeModifiers: {
    avoidTolls,
    avoidHighways,
    ...(ecoFriendly ? { vehicleInfo: { emissionType: 'GASOLINE' } } : {}),
  },
  extraComputations: ecoFriendly ? ['TOLLS', 'FUEL_CONSUMPTION'] : ['TOLLS'],
  requestedReferenceRoutes: ecoFriendly ? ['FUEL_EFFICIENT'] : undefined,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation References

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Autocomplete Element](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes Library (`Route.computeRoutes`)](https://developers.google.com/maps/documentation/javascript/routes/route-class-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Elevation Service (`ElevationService`)](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
