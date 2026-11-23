# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements: `AdvancedMarkerElement`, `PinElement`, `Place`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `StreetViewPanorama`)

An interactive multi-day city trip planner, hotel & attraction discovery hub, and live destination time zone dashboard built with **Vue 3**, **Vite**, and **TypeScript**. Pre-seeded for **Tokyo** using live **Places API (New)** discovery results, day-colored numbered **`AdvancedMarkerElement`** pins, multi-stop **`Route.computeRoutes`** polylines with waypoint optimization, an embedded **`StreetViewPanorama`** preview, and a live **Time Zone API** destination clock.

## Google Maps Platform Products & Modern Classes Used

- **Maps JavaScript API (`maps`, `marker`, `core`)**: 2D Vector Map with `mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`, `AdvancedMarkerElement`, `PinElement` (`glyphText`), `InfoWindow`, and `LatLngBounds`.
- **Places API (New) (`places`)**: `<gmp-place-autocomplete>` (`PlaceAutocompleteElement` listening to `gmp-select` + `placePrediction.toPlace().fetchFields()`), `Place.searchByText`, `Place.searchNearby`, `Photo.getURI()`, and `regularOpeningHours.weekdayDescriptions`.
- **Routes API (`routes`)**: `Route.computeRoutes()` with `optimizeWaypointOrder`, `Route.createPolylines()`, and leg-level distance/duration summaries across `DRIVING`, `WALKING`, and `TRANSIT`.
- **Time Zone API**: REST lookup (`maps.googleapis.com/maps/api/timezone/json`) with graceful `Place.utcOffsetMinutes` fallback for live local time and UTC offset display.
- **Street View Service (`streetView`)**: `StreetViewService.getPanorama()` paired with an embedded `StreetViewPanorama` viewer.

Documentation:
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Time Zone API Documentation](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Quickstart & Setup

### 1. Obtain an API Key (Maps Demo Key for Prototyping)

For zero-billing prototyping, generate a free **Maps Demo Key**:
1. Open the [Google Maps Platform Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your Demo Key and copy it.

For production deployments, create an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**, and restrict the key by HTTP referrer and enabled APIs ([Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0)).

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install, Typecheck, Build & Run

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

- `vite.config.ts` configures `@vitejs/plugin-vue` with `isCustomElement: (tag) => tag.startsWith('gmp-')` so Google Maps Web Components (`<gmp-place-autocomplete>`) render natively with zero Vue resolution warnings.
- `src/services/mapsLoader.ts` initializes `@googlemaps/js-api-loader` v2 via `setOptions()` + `importLibrary()`.
- `src/services/placesService.ts` fetches live attractions, restaurants, and hotels via `Place.searchByText()` and `Place.searchNearby()`, returning photos (`photo.getURI()`), ratings, and `regularOpeningHours`.
- `src/services/routesService.ts` computes multi-stop day routes via `Route.computeRoutes()` and renders day-colored polylines via `route.createPolylines()`.
- `src/services/timezoneService.ts` queries the Time Zone API and falls back gracefully to `Place.utcOffsetMinutes` so the live destination clock always ticks accurately.
- `src/components/MapAndStreetView.vue` manages `google.maps.Map`, numbered day-colored `AdvancedMarkerElement` + `PinElement` markers (`marker.append(pin)`), `InfoWindow`, and the docked `StreetViewPanorama` panel.

### Core Implementation Snippet

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  mapIds: ['DEMO_MAP_ID'],
});

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Route }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('routes'),
]);

const map = new Map(mapEl, {
  center: { lat: 35.6812, lng: 139.7671 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const pin = new PinElement({
  glyphText: '1',
  background: '#0F766E',
  borderColor: '#115E59',
  glyphColor: '#ffffff',
});
const marker = new AdvancedMarkerElement({ map, position: { lat: 35.6812, lng: 139.7671 } });
marker.append(pin);

const { routes } = await Route.computeRoutes({
  origin: stops[0].place.location,
  destination: stops[stops.length - 1].place.location,
  intermediates: stops.slice(1, -1).map((s) => ({ location: s.place.location })),
  travelMode: 'DRIVING',
  optimizeWaypointOrder: true,
  fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'optimizedIntermediateWaypointIndices'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
routes[0]?.createPolylines({ polylineOptions: { strokeColor: '#0F766E', strokeWeight: 5 } })
  .forEach((line) => line.setMap(map));
```

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
