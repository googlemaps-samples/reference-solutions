# React + Vite + TypeScript (`@vis.gl/react-google-maps`) — Multi-Modal Commute Comparator & Trail Elevation Tracker (`PlaceAutocompleteElement`, `Place.searchByText`, `Route.computeRoutes`, `AdvancedMarkerElement`, `ElevationService`)

A standalone React + Vite + TypeScript geospatial application centered on the Denver–Boulder Front Range corridor. It resolves seeded endpoints (`Denver Union Station, Denver, CO` and `Chautauqua Park, Boulder, CO`) live via Places API (New), computes comparative multi-modal routes across Driving, Cycling, Walking, and Transit using the modern Routes API (`Route.computeRoutes`), renders interactive route polylines and `AdvancedMarkerElement` pins on a 2D vector map (`mapId: 'DEMO_MAP_ID'`), and samples 64 elevation points via `ElevationService.getElevationAlongPath` to render an interactive elevation-gain and slope profile chart synchronized with a map hover marker.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`)**: `<APIProvider>`, `<Map>` (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`), `<AdvancedMarker>`, `<Pin>`, `google.maps.Polyline`, and `google.maps.BicyclingLayer` ([Maps JS API Docs](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Places API (New)**: `Place.searchByText` for live initial endpoint resolution and imperatively mounted `PlaceAutocompleteElement` listening to `gmp-select` -> `event.placePrediction.toPlace()` -> `place.fetchFields()` ([Places JS Docs](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Routes API (`Route` class)**: `Route.computeRoutes` across `DRIVING`, `BICYCLING`, `WALKING`, and `TRANSIT`, supporting `computeAlternativeRoutes`, `routeModifiers` (`avoidTolls`, `avoidHighways`), and `FUEL_EFFICIENT` reference routing ([Routes JS Docs](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Elevation API**: `ElevationService.getElevationAlongPath` (64 samples) for cumulative elevation gain/loss, min/max altitude, and slope grade % ([Elevation JS Docs](https://developers.google.com/maps/documentation/javascript/elevation?utm_campaign=gmp_git_agentsamples_v1.0.0)).

## Quickstart Setup

### 1. Obtain a Google Maps Platform API Key

For zero-billing prototyping, generate a **Maps Demo Key**:

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card required for the Demo Key).
3. Accept the Maps Demo Project Terms and click to generate your key.
4. *(For production)* Create and restrict your own key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable Maps JavaScript API, Places API (New), Routes API, and Elevation API, and apply HTTP referrer + API restrictions per the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot module reload:

```bash
npm run dev
```

## Architecture Summary

- **`src/App.tsx`**: Loads `VITE_GOOGLE_MAPS_API_KEY` from `import.meta.env` and wraps the workspace in `<APIProvider language="en" region="US">`.
- **`src/components/PlacePicker.tsx`**: Imperatively mounts `PlaceAutocompleteElement` inside a React `useRef` container (avoiding JSX prop stringification) biased to the Denver–Boulder corridor and extracts `id`, `displayName`, `formattedAddress`, and `location` on `gmp-select`.
- **`src/services/mapsService.ts`**: Encapsulates `Place.searchByText`, `Route.computeRoutes` (with `DRIVING` modifiers, `FUEL_EFFICIENT` reference routes, and `TOLLS` / `FUEL_CONSUMPTION` extra computations), and `ElevationService.getElevationAlongPath`.
- **`src/components/RouteMap.tsx`**: Renders the `<Map>` (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`), `<AdvancedMarker>` endpoints + elevation hover indicator, clickable route `Polyline`s, and `BicyclingLayer`.
- **`src/components/ElevationProfileChart.tsx`**: Interactive SVG elevation & slope profile chart synchronized bidirectionally with the map hover marker.

### Core Implementation Snippet

```tsx
const { routes } = await routesLib.Route.computeRoutes({
  origin: origin.location,
  destination: destination.location,
  travelMode: 'DRIVING',
  fields: ['path', 'distanceMeters', 'durationMillis', 'routeLabels', 'travelAdvisory'],
  computeAlternativeRoutes: true,
  routingPreference: 'TRAFFIC_AWARE',
  routeModifiers: {
    avoidTolls: modifiers.avoidTolls,
    avoidHighways: modifiers.avoidHighways,
    ...(modifiers.ecoFriendly ? { vehicleInfo: { emissionType: 'GASOLINE' } } : {}),
  },
  extraComputations: modifiers.ecoFriendly ? ['TOLLS', 'FUEL_CONSUMPTION'] : ['TOLLS'],
  requestedReferenceRoutes: modifiers.ecoFriendly ? ['FUEL_EFFICIENT'] : undefined,
});
```

## Compliance & Terms Notice

- Walking and cycling routes surface the required Google Maps Platform **beta path advisory** notice.
- All place, route, and elevation data is fetched live at runtime from Google Maps Platform APIs.
- Usage of Google Maps Platform services is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Other Stack Samples

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
