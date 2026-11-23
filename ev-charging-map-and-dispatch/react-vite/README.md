# On-Demand Local Services & EV Roadside Dispatch — React + Vite + TypeScript (`@vis.gl/react-google-maps`) using `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place.searchNearby`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and `Geocoder`

A Seattle-centered EV fast-charging and roadside auto-service locator & dispatch dashboard built with **React 19**, **Vite 6**, **TypeScript**, and **`@vis.gl/react-google-maps`**, strictly using modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`maps`, `marker`, `core`):**
  - [`<APIProvider>`](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) & [`<Map>`](https://developers.google.com/maps/documentation/javascript/reference/map?utm_campaign=gmp_git_agentsamples_v1.0.0) initialized at Downtown Seattle (`47.6062, -122.3321`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`
  - [`AdvancedMarker`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`AdvancedMarkerElement`) & `Pin` (`PinElement` using `glyphText`) for the draggable driver breakdown pin and category-colored EV/auto-repair markers
  - `Circle` for the configurable 5 km / 10 km / 15 km search radius ring, `Polyline` for the dispatch route, and `InfoWindow` for station previews
- **Places API (New) (`places`):**
  - [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) imperatively mounted via `useRef` + `useEffect` listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields(...)`)
  - [`Place.searchNearby`](https://developers.google.com/maps/documentation/javascript/nearby-search?utm_campaign=gmp_git_agentsamples_v1.0.0) (with `Place.searchByText` fallback) discovering `electric_vehicle_charging_station` (including `evChargeOptions` connector counts and max kW) and `car_repair` providers
- **Routes API (`routes`):**
  - [`RouteMatrix.computeRouteMatrix`](https://developers.google.com/maps/documentation/javascript/route-matrix?utm_campaign=gmp_git_agentsamples_v1.0.0) ranking all discovered stations and mechanics by live traffic-aware driving ETA
  - [`Route.computeRoutes`](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0) computing the active dispatch polyline, viewport bounds, distance, ETA, and turn-by-turn maneuver instructions
- **Geocoding API (`geocoding`):**
  - [`Geocoder`](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0) reverse-geocoding the driver's breakdown coordinates whenever the driver pin is dragged, clicked on the map, or centered

## Setup Instructions

### 1. Get an API Key (Free Maps Demo Key for Prototyping)

If you do not have a Google Cloud billing project yet, you can use the zero-billing **Maps Demo Key** for prototyping:

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted and generate your demo key.
4. Copy the key. *(Note: The Maps Demo Key has a daily reset quota and is intended for prototyping only, not production.)*

For production deployments:

1. Create a key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict your key by HTTP referrer and designated APIs following the [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run dev
```

To build and preview the production bundle on `127.0.0.1`:

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture & Core Implementation

1. **Driver Location & Reverse Geocoding:** Users can drag the `SOS` `AdvancedMarker`, click anywhere on the map, click **Use Map Center**, or search via the imperatively mounted `PlaceAutocompleteElement`. Coordinates are reverse-geocoded via `Geocoder`.
2. **Nearby Discovery & Live ETA Ranking:** `discoverNearbyProviders` queries `Place.searchNearby` in parallel for `electric_vehicle_charging_station` (with `evChargeOptions`) and `car_repair` within the 5 km / 10 km / 15 km `Circle`. `rankProvidersByRouteMatrix` calls `RouteMatrix.computeRouteMatrix` with `TRAFFIC_AWARE` routing to sort results by real driving ETA.
3. **Dispatch Routing:** Selecting **Route Here** invokes `Route.computeRoutes` to render the route `Polyline`, fit map bounds, and populate collapsible turn-by-turn steps.

```tsx
const { routes } = await routesLib.Route.computeRoutes({
  origin: driverLocation,
  destination: provider.location,
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  units: coreLib.UnitSystem.METRIC,
  fields: ['path', 'legs', 'durationMillis', 'distanceMeters', 'localizedValues', 'viewport'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Compliance & Terms Notice

- Usage of Google Maps Platform products and services may incur costs against your Google Cloud billing account in production.
- Use of this code is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- All station/provider names, coordinates, ratings, EV connector counts, and hours are fetched dynamically at runtime from Google Maps Platform APIs.

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
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
