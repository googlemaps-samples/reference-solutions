# Multi-Branch Store, ATM & Inventory Locator — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `RouteMatrix`, `Route.computeRoutes`)

A responsive, split-screen New York City store, express kiosk, and 24/7 ATM locator built with **SvelteKit 2 + Svelte 5 + TypeScript**, using modern, zero-deprecation **Google Maps Platform** JavaScript SDK libraries (`@googlemaps/js-api-loader` v2, `google.maps.Map` with `DEMO_MAP_ID`, `AdvancedMarkerElement`, `@googlemaps/markerclusterer`, `Place.searchByText`, `AutocompleteSuggestion` + `PlaceAutocompleteElement`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`).

---

## Architecture Summary

- **SSR-Safe Browser Loading (`onMount`)**: All Google Maps Platform initialization is strictly guarded inside Svelte's `onMount` lifecycle (`src/lib/components/LocatorMap.svelte`) using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and reading `PUBLIC_GOOGLE_MAPS_API_KEY` dynamically from `$env/dynamic/public`.
- **Live NYC Branch Discovery (`Place.searchByText`)**: On load, the app queries Places API (New) across Manhattan (`40.7549, -73.9840`) for retail flagship stores, espresso/food kiosks, and 24/7 ATMs, preserving live Google Place names, addresses, coordinates, ratings, and `regularOpeningHours.weekdayDescriptions` without hardcoding fake data or calling beta-only `place.isOpen()` on the `weekly` channel.
- **Origin Search (`AutocompleteSuggestion` + `PlaceAutocompleteElement` + `Geocoder`)**: Customers can search any NYC starting location with session-tokenized `AutocompleteSuggestion.fetchAutocompleteSuggestions` + `Place.fetchFields` (with `Geocoder` fallback on free-text submit), jump between NYC hubs, or toggle the native `PlaceAutocompleteElement` (`gmp-select` event) widget.
- **Live Road ETAs & Fastest Branch Ranking (`RouteMatrix.computeRouteMatrix`)**: Computes live road travel durations and distances across `DRIVING`, `WALKING`, and `TRANSIT` modes from the customer's origin to all candidate branches to rank and badge the **Fastest Nearby** location.
- **Marker Clustering & Custom Pins (`MarkerClusterer` + `AdvancedMarkerElement`)**: Uses `@googlemaps/markerclusterer` (`SuperClusterAlgorithm` + custom `AdvancedMarkerElement` renderer) so city-level views cluster cleanly and zoomed-in views display distinct Flagship Store, Express Kiosk, and 24/7 ATM pins.
- **Interactive Route Polylines (`Route.computeRoutes`)**: Selecting any branch card, map pin, or **Route to Fastest** computes the optimal path via `Route.computeRoutes`, draws polylines with `route.createPolylines()`, opens an `InfoWindow`, and fits the map viewport.

### Core Implementation Snippet (`src/lib/maps/routes.ts` & `src/lib/components/LocatorMap.svelte`)

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  libraries: ['core', 'maps', 'marker', 'places', 'routes', 'geocoding', 'geometry']
});

const [{ Map }, { AdvancedMarkerElement }, { RouteMatrix, Route }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('routes')
]);

const map = new Map(mapContainerEl, {
  center: { lat: 40.7549, lng: -73.984 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [{ lat: origin.lat, lng: origin.lng }],
  destinations: branches.map((b) => ({ lat: b.lat, lng: b.lng })),
  travelMode: 'DRIVING',
  fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues']
});

const { routes } = await Route.computeRoutes({
  origin: { lat: origin.lat, lng: origin.lng },
  destination: { lat: selected.lat, lng: selected.lng },
  travelMode: 'DRIVING',
  fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues']
});
routes[0]?.createPolylines({ polylineOptions: { strokeColor: '#1d4ed8', strokeWeight: 5 } })
  .forEach((polyline) => polyline.setMap(map));
```

---

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Zero-Billing Prototyping)
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any personal Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (supports Maps JavaScript API, Places API (New), Routes API, and Geocoding API with a daily reset limit; not for production use).

#### Option B: Production Google Cloud Project Key
1. Create or select a project in the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key by HTTP referrer and enabled APIs following the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local hot-reload development:

```bash
npm run dev
```

---

## Documentation & Compliance References

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
- [`vue-vite`](../vue-vite/)
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
