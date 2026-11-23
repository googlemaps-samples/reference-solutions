# Multi-Branch Store, ATM & Inventory Locator — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements: `<gmp-map>`, `AdvancedMarkerElement`, `Place`, `AutocompleteSuggestion`, `RouteMatrix`, `Route`)

A split-screen New York City multi-branch store, express kiosk, and 24/7 ATM locator built with **Vue 3**, **Vite**, **TypeScript**, and the modern, zero-deprecation **Google Maps Platform JavaScript SDK** (`@googlemaps/js-api-loader` v2 + `<gmp-map>` Custom Element + `@googlemaps/markerclusterer`).

## Features & Modern Google Maps Platform APIs

- **Maps JavaScript API (`<gmp-map>` / `MapElement`):** Configured in `vite.config.ts` via `isCustomElement: (tag) => tag.startsWith('gmp-')` with `map-id="DEMO_MAP_ID"` and `internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"`.
- **Places API (New) (`Place.searchByText`):** On load, executes live NYC-biased searches for retail flagship stores, espresso/food kiosks, and 24/7 ATMs—preserving real Place names, addresses, coordinates, ratings, and `regularOpeningHours.weekdayDescriptions`.
- **Places API (New) Autocomplete (`AutocompleteSuggestion` + `AutocompleteSessionToken` + `Place.fetchFields`):** Session-bundled starting-location search across NYC with `Geocoder` fallback and quick Manhattan/FiDi hub presets.
- **Routes API Route Matrix (`RouteMatrix.computeRouteMatrix`):** Computes live road travel times and distances from the customer's starting location across all candidate branches for `DRIVE`, `WALK`, and `TRANSIT` modes and badges the **Fastest Nearby** branch.
- **Routes API Directions (`Route.computeRoutes` + `createPolylines()`):** Highlights the selected or fastest branch, opens an `InfoWindow`, draws the live route polyline on the map, and fits the camera bounds.
- **Advanced Markers & Clustering (`AdvancedMarkerElement` + `MarkerClusterer` + `SuperClusterAlgorithm`):** Groups nearby Manhattan branches into clean cluster badges at city zoom and expands into distinct custom-styled pins for **Flagship Store**, **Express Kiosk**, and **24/7 ATM** when zoomed in.

## Quickstart Setup

### 1. Install Dependencies

```bash
npm install --no-audit --no-fund
```

### 2. Configure Your Google Maps API Key

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set `VITE_GOOGLE_MAPS_API_KEY` inside `.env.local` (never commit `.env.local` to source control).

#### Option A: Free Maps Demo Key (Prototyping, No Billing Setup Required)

1. Open the [Google Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Click to reveal and copy your demo key, then paste it into `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`.
4. Note: The Maps Demo Key has a daily quota limit and is intended only for prototyping (see [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0)).

#### Option B: Production Google Cloud API Key

1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Restrict the key by **HTTP referrer** and limit it to the enabled APIs following [Restricting API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 3. Run Development Server, Typecheck & Production Build

```bash
# Development server (http://127.0.0.1:5173)
npm run dev

# Strict Vue + TypeScript typecheck
npx vue-tsc --noEmit

# Production build & preview
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture & Core Implementation Snippet

- **`src/composables/useStoreLocator.ts`**: Initializes `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`), binds to `<gmp-map>.innerMap`, runs live `Place.searchByText`, `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `RouteMatrix.computeRouteMatrix`, `Route.computeRoutes`, and coordinates `MarkerClusterer`.
- **`src/utils/branchClassifier.ts`**: Deterministically classifies live Google `Place` entities into `flagship`, `kiosk`, or `atm` and derives service availability tags without hardcoding fake place metadata.
- **`src/utils/markerFactory.ts`**: Constructs XSS-safe DOM elements (`document.createElement` / `textContent`) for custom `AdvancedMarkerElement` pins, origin pin, cluster badges, and `InfoWindow` content.
- **`src/components/`**: `AppHeader.vue`, `BranchSidebar.vue`, and `LocatorMap.vue`.

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en',
  region: 'US',
});

const [{ Place }, { RouteMatrix, Route }, { AdvancedMarkerElement }] = await Promise.all([
  importLibrary('places'),
  importLibrary('routes'),
  importLibrary('marker'),
]);

const { matrix } = await RouteMatrix.computeRouteMatrix({
  origins: [originLocation],
  destinations: branchLocations,
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['durationMillis', 'distanceMeters', 'condition', 'localizedValues'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
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

## Terms & Licensing

- Google Maps Platform usage is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and may incur charges when moving beyond the free Demo Key to a billed Google Cloud project.
- See [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0), [Places API (New) JS SDK](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Routes JS SDK](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
