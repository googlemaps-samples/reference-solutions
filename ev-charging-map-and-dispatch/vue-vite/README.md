# On-Demand Local Services & EV Roadside Dispatch — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)

A Seattle-centered EV fast-charging and roadside auto-repair dispatch application built with **Vue 3**, **Vite**, **TypeScript**, and strictly modern, zero-deprecation Google Maps Platform APIs (`Map`, `Circle`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place.searchNearby`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`).

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `marker`, `core`)**: Interactive 2D vector `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), dynamic `Circle` proximity ring (5 km / 10 km / 15 km), draggable breakdown `AdvancedMarkerElement`, category-colored `PinElement` markers, `InfoWindow`, and `Polyline` route overlays.
- **Places API (New) (`places`)**: Native `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) Web Component using the `gmp-select` event (`event.placePrediction.toPlace()`), plus `Place.searchNearby` (and `Place.searchByText` fallback) requesting `evChargeOptions`, `regularOpeningHours`, `rating`, `userRatingCount`, `nationalPhoneNumber`, and `googleMapsURI`.
- **Routes API (`routes`)**: `RouteMatrix.computeRouteMatrix` to rank discovered EV stations and auto repair providers by live traffic-aware driving ETA, and `Route.computeRoutes` (`route.createPolylines(...)`) to render the dispatch route polyline and turn-by-turn maneuver instructions.
- **Geocoding API (`geocoding`)**: `Geocoder` reverse geocoding whenever the driver drags the breakdown pin, clicks on the map, or snaps to map center.

## Setup & Local Development

### 1. Obtain an API Key (Zero-Billing Maps Demo Key or Cloud Key)

For fast prototyping without configuring billing, generate a free **Maps Demo Key**:

1. Open the [Google Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate / reveal your demo key.

For production deployments, create and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) with **HTTP referrer** and **API restrictions** (Maps JavaScript API, Places API (New), Routes API, Geocoding API) following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your key:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For interactive development with HMR:

```bash
npm run dev
```

## Architecture Summary & Core Implementation Snippet

- **`vite.config.ts`**: Configures `@vitejs/plugin-vue` with `isCustomElement: (tag) => tag.startsWith('gmp-')` so Vue 3 mounts `<gmp-place-autocomplete>` natively without component resolution warnings.
- **`src/services/googleMapsDispatch.ts`**: Loads Google Maps libraries via `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and implements Places discovery, `RouteMatrix` ETA ranking, `Route.computeRoutes` turn-by-turn dispatch routing, and `Geocoder` reverse geocoding.
- **`src/utils/dispatchHelpers.ts`**: Computes open/closed status from `OpeningHours.periods` and `utcOffsetMinutes` safely on the `weekly` channel (without calling beta-only `place.isOpen()`).
- **`src/App.vue`**: Orchestrates the split-screen dispatch dashboard, draggable breakdown `AdvancedMarkerElement`, `Circle` proximity ring, `<gmp-place-autocomplete>` (`gmp-select`), and DOM-safe `InfoWindow` previews.

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'en', region: 'US' });
const [{ Map }, { AdvancedMarkerElement }, { Place }, { Route, RouteMatrix }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('routes'),
]);

const { places } = await Place.searchNearby({
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'evChargeOptions', 'regularOpeningHours'],
  locationRestriction: { center: { lat: 47.6062, lng: -122.3321 }, radius: 10000 },
  includedPrimaryTypes: ['electric_vehicle_charging_station'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
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
