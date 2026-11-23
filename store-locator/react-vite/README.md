# React + Vite + TypeScript (@vis.gl/react-google-maps) — Multi-Branch Store, ATM & Inventory Locator (`AdvancedMarkerElement`, `Place`, `AutocompleteSuggestion`, `Route`, `RouteMatrix`)

Split-screen New York City multi-branch store, express kiosk, and 24/7 ATM locator built with **React + Vite + TypeScript**, **`@vis.gl/react-google-maps`**, **`@googlemaps/markerclusterer`**, and modern, zero-deprecation Google Maps Platform APIs.

## Modern Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`@vis.gl/react-google-maps`)**: `<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, and `<InfoWindow>` (see [Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)).
- **Marker Clustering (`@googlemaps/markerclusterer`)**: `MarkerClusterer` + `SuperClusterAlgorithm` with a custom `AdvancedMarkerElement` cluster renderer (zero legacy `google.maps.Marker`).
- **Places API (New)**:
  - `Place.searchByText()` to fetch live NYC candidate flagship stores, espresso kiosks, and 24/7 ATMs with live coordinates, ratings, and `regularOpeningHours.weekdayDescriptions`.
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `AutocompleteSessionToken` + `Place.fetchFields()` for NYC-biased starting-location search (with `Geocoder` fallback).
- **Routes API (JS SDK)**:
  - `RouteMatrix.computeRouteMatrix()` to calculate live road ETAs and distances from the customer's starting origin across candidate branches (`DRIVING`, `WALKING`, `TRANSIT`) and highlight the **Fastest Nearby** branch.
  - `Route.computeRoutes()` + `route.createPolylines()` to draw the active route geometry on the map.

## Quickstart Setup (Free Maps Demo Key or Cloud API Key)

### 1. Obtain a Google Maps Platform API Key

For zero-billing prototyping, you can generate a free **Maps Demo Key**:

1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key (note: daily reset limit, for prototyping only).

For production deployments, create and restrict an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable:
- **Maps JavaScript API**
- **Places API (New)**
- **Routes API**
- **Geocoding API**

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

## Architecture Summary

1. **Live Branch Discovery (`src/hooks/useNycBranches.ts`)**: Runs parallel `Place.searchByText()` queries biased to Manhattan (`40.7549, -73.9840`), deduplicates live `Place` records, and classifies each into **Flagship Store**, **Express Kiosk**, or **24/7 ATM** with service availability tags (`Click & Collect`, `Express Espresso`, `Cash Deposit`, `Open 24h`) while preserving live Google Place names, addresses, ratings, and `regularOpeningHours.weekdayDescriptions`.
2. **Origin Search (`src/components/HeaderBar.tsx`)**: Uses `AutocompleteSuggestion.fetchAutocompleteSuggestions()` paired with `AutocompleteSessionToken` and `Place.fetchFields()`, plus `Geocoder` fallback and NYC origin presets (`Penn Station`, `Grand Central`, `SoHo`, `Near Me`).
3. **Route Matrix Ranking (`src/hooks/useRouteMatrix.ts`)**: Calls `RouteMatrix.computeRouteMatrix()` whenever the origin or travel mode (`DRIVE` / `WALK` / `TRANSIT`) changes to sort branches by live ETA and badge the **Fastest Nearby** branch.
4. **Clustered Map & Route Polylines (`src/components/MapCanvas.tsx`)**: Renders `MarkerClusterer` + `SuperClusterAlgorithm` over custom `<AdvancedMarker>` pins at city zoom, expands clusters on click/zoom, and draws active routes via `Route.computeRoutes()` + `route.createPolylines()`.

### Core Implementation Snippet

```tsx
const { matrix } = await routesLibrary.RouteMatrix.computeRouteMatrix({
  origins: [origin.location],
  destinations: batch.map((b) => b.location),
  travelMode: toSdkTravelMode(travelMode),
  units: coreLibrary.UnitSystem.IMPERIAL,
  fields: ['distanceMeters', 'durationMillis', 'localizedValues', 'condition'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await routesLibrary.Route.computeRoutes({
  origin: origin.location,
  destination: selectedBranch.location,
  travelMode: toSdkTravelMode(travelMode),
  fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'viewport'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
const polylines = routes?.[0]?.createPolylines() ?? [];
```

## Sample Implementations Across Stacks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/) *(current implementation)*
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Terms & Licensing

Usage of Google Maps Platform APIs and SDKs is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0). See the [Google Maps Platform Documentation](https://developers.google.com/maps?utm_campaign=gmp_git_agentsamples_v1.0.0) for quota, billing, and regional terms.

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
