# On-Demand Local Services & EV Roadside Dispatch — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components: `Map`, `Circle`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `RouteMatrix.computeRouteMatrix`, `Geocoder`)

A standalone Seattle-centered EV fast-charging and roadside auto-repair dispatch dashboard built with **SvelteKit + TypeScript**, using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and strictly modern, zero-deprecation Google Maps Platform APIs.

## Features

- **Interactive Breakdown Pin & Proximity Ring:** Initializes a 2D vector map centered on Downtown Seattle (`47.6062, -122.3321`) with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`, a draggable `AdvancedMarkerElement` breakdown pin, and a configurable `5 km / 10 km / 15 km` `google.maps.Circle` search ring.
- **Address Search & Reverse Geocoding:** Uses `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace()`) to jump to any Seattle address, or drag/click the map to update the pin and reverse-geocode the address via `Geocoder`.
- **Live Nearby EV & Mechanic Discovery:** Queries Places API (New) via `Place.searchNearby` for `electric_vehicle_charging_station` (including `evChargeOptions` connector counts, availability, and max kW) and `car_repair` providers, computing open-hours status safely on the `weekly` channel from `regularOpeningHours.periods`.
- **ETA Ranking & Turn-by-Turn Dispatch Routing:** Ranks all discovered options by live traffic-aware driving ETA using `RouteMatrix.computeRouteMatrix`, and draws the active dispatch polyline (`route.createPolylines`) plus step-by-step maneuvers using `Route.computeRoutes`.

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Fastest for Prototyping — No Billing Required)
1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Click to generate and copy your Demo Key (subject to daily limits; prototyping only).

#### Option B: Production Key via Google Cloud Console
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local hot-reload development:

```bash
npm run dev
```

## Architecture Summary

- **SSR-Safe Loading:** `PUBLIC_GOOGLE_MAPS_API_KEY` is read via `$env/dynamic/public` and all Google Maps loading (`setOptions` + `importLibrary`) is strictly guarded inside Svelte's `onMount` lifecycle in [`src/routes/+page.svelte`](src/routes/+page.svelte).
- **Zero-Deprecation Services ([`src/lib/dispatchService.ts`](src/lib/dispatchService.ts)):**
  - `Place.searchNearby` discovers EV fast chargers and auto repair shops within the active radius.
  - `RouteMatrix.computeRouteMatrix` computes driving distance and traffic-aware ETA to rank providers.
  - `Route.computeRoutes` returns the route geometry (`createPolylines`) and `RouteLegStep` maneuver instructions.
  - `Geocoder` reverse-geocodes dragged/clicked coordinates to street addresses.
- **Security Headers ([`src/hooks.server.ts`](src/hooks.server.ts)):** Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

### Core Implementation Snippet

```ts
setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [
  { Map, Circle },
  { AdvancedMarkerElement, PinElement },
  { PlaceAutocompleteElement }
] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places')
]);

const map = new Map(mapContainerEl, {
  center: { lat: 47.6062, lng: -122.3321 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const autocompleteEl = new PlaceAutocompleteElement({
  locationBias: { center: { lat: 47.6062, lng: -122.3321 }, radius: 25000 },
  includedRegionCodes: ['us'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
autocompleteEl.addEventListener('gmp-select', async (event) => {
  const place = event.placePrediction.toPlace();
  await place.fetchFields({ fields: ['location', 'formattedAddress'] });
});
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Documentation](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

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
