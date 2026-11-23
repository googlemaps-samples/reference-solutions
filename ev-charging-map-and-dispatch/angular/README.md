# On-Demand Local Services & EV Roadside Dispatch — Angular Standalone Components + TypeScript (`@angular/google-maps`)

Seattle-centered EV fast-charging and roadside auto repair locator built with **Angular Standalone Components**, **TypeScript**, [`@angular/google-maps`](https://github.com/angular/components/tree/main/src/google-maps), and modern **Google Maps Platform** APIs (`Map`, `Circle`, `AdvancedMarkerElement`, `PinElement`, `InfoWindow`, `PlaceAutocompleteElement`, `Place.searchNearby`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`).

## Key Features

- **Interactive Seattle Vector Map (`Map` + `DEMO_MAP_ID`):** Initializes centered on Downtown Seattle (`47.6062, -122.3321`) with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` and a configurable `5 km / 10 km / 15 km` proximity `Circle`.
- **Relocatable Breakdown Pin & Reverse Geocoding (`AdvancedMarkerElement` + `Geocoder`):** Drivers can drag the SOS `MapAdvancedMarker`, click anywhere on the map, click **Use Map Center**, or search an address via `PlaceAutocompleteElement` (`gmp-select` event) to update and reverse-geocode their pickup location.
- **Live EV & Auto Repair Discovery (`Place.searchNearby`):** Queries `electric_vehicle_charging_station` (including `evChargeOptions` connector counts and max kW rates) and `car_repair` providers inside the active search ring.
- **Traffic-Aware ETA Ranking (`RouteMatrix.computeRouteMatrix`):** Computes live driving distance and ETA from the breakdown pin to all nearby stations/providers and sorts results fastest-first.
- **Turn-by-Turn Dispatch Routing (`Route.computeRoutes`):** Draws the active driving polyline (`route.createPolylines`) fitted to route bounds and displays collapsible turn-by-turn maneuver instructions.

## Architecture Summary

- **Dynamic API Loader (`@googlemaps/js-api-loader` v2):** [`GoogleMapsService`](src/app/services/google-maps.service.ts) reads `window.__ENV__.GOOGLE_MAPS_API_KEY` at runtime (injected by [`serve-dist.mjs`](serve-dist.mjs) from `.env` via `/env-config.js`) and calls `setOptions()` + `importLibrary()` for `maps`, `marker`, `places`, `routes`, `geocoding`, and `core` before mounting `<google-map>`.
- **Zero-Key-in-Bundle Serving:** [`serve-dist.mjs`](serve-dist.mjs) binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and serves `/env-config.js` dynamically so `GOOGLE_MAPS_API_KEY` is never hardcoded into `dist/`.

```typescript
// Core Places + Routes + Geocoding flow in src/app/services/google-maps.service.ts
setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });
const [{ Place, SearchNearbyRankPreference }, { Route, RouteMatrix }] = await Promise.all([
  importLibrary('places'),
  importLibrary('routes'),
]);

const { places } = await Place.searchNearby({
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'regularOpeningHours', 'evChargeOptions'],
  locationRestriction: { center, radius: radiusMeters },
  includedPrimaryTypes: ['electric_vehicle_charging_station'],
  rankPreference: SearchNearbyRankPreference.DISTANCE,
});

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [origin],
  destinations: providers.map((p) => p.location),
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['condition', 'distanceMeters', 'durationMillis'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Getting Started

### 1. Obtain a Google Maps Platform API Key

- **Free Prototyping (No Billing Required):** Obtain a [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) by signing in with a Google account and accepting the Demo Project Terms. Note that Demo Keys have a daily quota reset and are not for production use.
- **Production Setup:** Create and restrict an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) with **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API** enabled. Follow the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer and enabled APIs.

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

## Documentation References

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Overview](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Overview](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
