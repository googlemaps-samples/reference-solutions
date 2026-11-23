# Angular Standalone Components + TypeScript (@angular/google-maps) — AdvancedMarkerElement, PlaceAutocompleteElement, AddressValidation, Route.computeRoutes & Maps Static API — On-Demand Delivery Checkout, Zone Validation & Live Tracker

End-to-end Chicago restaurant and grocery delivery checkout, zone validation, and live courier tracking application built with **Angular Standalone Components**, **TypeScript**, and **`@angular/google-maps`** (`GoogleMap`, `MapAdvancedMarker`, `MapPolygon`, `MapPolyline`).

Anchored at the **Fulton Market Kitchen Hub** (`41.8868, -87.6486`) and seeded with a live Chicago customer address (`401 N Michigan Ave, Chicago, IL 60611`), this app combines modern Google Maps Platform APIs with zero legacy or deprecated services.

---

## Features & Modern Google Maps Platform APIs

- **Maps JavaScript API (`@googlemaps/js-api-loader` v2 + `@angular/google-maps`)**: Dynamically configured via `setOptions()` and `importLibrary()` with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Places API (New) (`PlaceAutocompleteElement` & `Place`)**: Mounts `<gmp-place-autocomplete>` with `CUSTOM_ELEMENTS_SCHEMA`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)` to resolve live coordinates and Place IDs.
- **Address Validation API (`AddressValidation.fetchAddressValidation`)**: Inspects weekly-safe verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), property classification (`metadata`), and USPS CASS/DPV metadata (`uspsData`).
- **Delivery Zone & 8 km Road-Distance Eligibility (`google.maps.geometry.poly.containsLocation` + `Route.computeRoutes`)**: Checks both polygon containment inside the Chicago delivery zone and the 8.0 km driving distance cap, computing tiered delivery fees (`$2.99 <= 3 km`, `$4.99 <= 5.5 km`, `$6.99 <= 8 km`) and traffic-aware ETA.
- **Custom `AdvancedMarkerElement` (`<map-advanced-marker>`) & Live Courier Animation**: Renders custom DOM markers for the Kitchen Hub, Drop-off address, and a Courier marker interpolated smoothly along the decoded route polyline via `requestAnimationFrame`.
- **Maps Static API Order Receipt Card**: Embeds a route preview PNG served through `/api/maps/static-receipt` in `serve-dist.mjs` so the server API key is never exposed in client `<img>` URLs.

---

## Quickstart & API Key Setup

> **Cost Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account once moving to production. For zero-cost prototyping, use the **Maps Demo Key** below.

### Option 1: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your demo key.

### Option 2: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) (HTTP referrer restrictions for browser keys; IP/API restrictions for server keys).

### Install, Build & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200`.

---

## Core Architecture & Implementation Snippet

`serve-dist.mjs` binds strictly to `127.0.0.1`, injects `GOOGLE_MAPS_API_KEY` at runtime via `/env-config.js`, and proxies `/api/maps/static-receipt`, `/api/address/validate`, and `/api/routes/compute` with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).

```ts
// Dynamically load Maps JS libraries via @googlemaps/js-api-loader v2
setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });
const [maps, marker, places, addressValidation, routes, geometry, core] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('addressValidation'),
  importLibrary('routes'),
  importLibrary('geometry'),
  importLibrary('core'),
]);

// Compute traffic-aware driving route via Routes API JS SDK
const { routes: computedRoutes } = await routes.Route.computeRoutes({
  origin: KITCHEN_HUB.location,
  destination,
  travelMode: google.maps.routes.TravelMode.DRIVING,
  routingPreference: google.maps.routes.RoutingPreference.TRAFFIC_AWARE,
  fields: ['durationMillis', 'staticDurationMillis', 'distanceMeters', 'path', 'legs'],
});
```

---

## Documentation & Terms

- [Google Maps Platform JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
