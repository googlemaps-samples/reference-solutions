# SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components) — `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `AddressValidation`, `Route.computeRoutes` & Maps Static API — On-Demand Delivery Checkout, Zone Validation & Live Tracker

End-to-end Chicago restaurant and grocery delivery checkout and live order-tracking web application built with **SvelteKit + TypeScript**, using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and native Google Maps Platform classes (`Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `AddressValidation`, `Route`, `geometry.poly.containsLocation`, and `Maps Static API`).

## Features & Architecture

- **Anchored Kitchen Hub:** Fulton Market Kitchen Hub (`820 W Fulton Market, Chicago, IL 60607`, `41.8868, -87.6486`), pre-seeded with a live Chicago customer address (`401 N Michigan Ave, Chicago, IL 60611`).
- **Checkout Autocomplete (`Places API (New)`):** Mounts native [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) inside `onMount`, listening to the `gmp-select` event and hydrating coordinates via `event.placePrediction.toPlace().fetchFields()`.
- **Deliverability & Granularity (`Address Validation API`):** Validates addresses via `AddressValidation.fetchAddressValidation` (with server-side BFF fallback at `POST /api/address/validate`), inspecting weekly-safe `verdict` fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), property `metadata`, and USPS CASS/DPV signals.
- **Dual Eligibility & Tiered Delivery Fees (`Geometry` + `Routes API`):**
  - Verifies drop-off coordinates fall inside the Chicago delivery zone `Polygon` (`google.maps.geometry.poly.containsLocation`).
  - Computes traffic-aware driving distance and ETA via `Route.computeRoutes` (with server-side BFF fallback at `POST /api/routes/compute`) and enforces an `8.0 km` maximum road-distance cap.
  - Calculates tiered delivery fees (`$2.99` `<= 3.0 km`, `$4.99` `<= 5.5 km`, `$6.99` `<= 8.0 km`).
- **Live Courier Tracking (`AdvancedMarkerElement`):** Smoothly animates a directional courier marker along the decoded route polyline using `requestAnimationFrame`, updating remaining distance, ETA, and turn-by-turn steps.
- **Order Receipt Card (`Maps Static API`):** Embeds an itemized order receipt alongside a live route preview PNG proxied through `GET /api/maps/static-receipt` so the API key is never exposed in client `<img>` HTML attributes.

### Core Implementation Snippet

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { AdvancedMarkerElement }, { PlaceAutocompleteElement }, { Route }] =
	await Promise.all([
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes')
	]);

const map = new Map(container, {
	center: { lat: 41.8868, lng: -87.6486 },
	zoom: 13,
	mapId: 'DEMO_MAP_ID',
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { routes } = await Route.computeRoutes({
	origin: { lat: 41.8868, lng: -87.6486 },
	destination: customerCoords,
	travelMode: 'DRIVE' as google.maps.TravelMode,
	routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference,
	fields: ['distanceMeters', 'durationMillis', 'path', 'legs'],
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

## Setup Instructions

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, no billing required):**
1. Visit [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key (daily limits apply; prototyping only).

**Option B — Production Google Cloud API Key:**
1. Create a key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer and allowed APIs.

> **Cost Notice:** Usage of Google Maps Platform APIs in production may incur charges against your Google Cloud billing account. See [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Then open `http://127.0.0.1:4173`.

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
