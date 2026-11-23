# On-Demand Delivery Checkout, Zone Validation & Live Tracker — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)

Built with **Vue 3**, **Vite**, **TypeScript**, [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) (`setOptions` + `importLibrary`), and modern Google Maps Platform APIs: **`PlaceAutocompleteElement`** (`<gmp-place-autocomplete>`), **`Place`**, **`AddressValidation.fetchAddressValidation`**, **`Route.computeRoutes`**, **`AdvancedMarkerElement`**, **`PinElement`**, **`google.maps.geometry.poly.containsLocation`**, and the **Maps Static API**.

## Features

- **Checkout Address Autocomplete (`PlaceAutocompleteElement`)**: Mounts the `<gmp-place-autocomplete>` custom element natively in Vue 3 (via Vite's `isCustomElement` compiler option), pre-seeded with `401 N Michigan Ave, Chicago, IL 60611` and listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields()`.
- **Deliverability & Granularity Checks (`AddressValidation`)**: Calls `AddressValidation.fetchAddressValidation` with USPS CASS enabled (`uspsCASSEnabled: true`) and displays weekly-safe `verdict` signals (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), property metadata (`residential`, `business`, `poBox`), and USPS DPV confirmation.
- **Polygon Zone & 8 km Road Cap Eligibility**: Checks drop-off containment inside the Chicago delivery zone `Polygon` via `google.maps.geometry.poly.containsLocation` and verifies the driving road distance computed by `Route.computeRoutes` is within the `8.0 km` threshold.
- **Tiered Delivery Fees & Traffic-Aware ETA (`Route.computeRoutes`)**: Computes live traffic-aware driving ETA and applies distance-based tiers (`$2.99` ≤ 3.0 km, `$4.99` ≤ 5.5 km, `$6.99` ≤ 8.0 km).
- **Live Courier Tracking (`AdvancedMarkerElement`)**: Renders custom `AdvancedMarkerElement` pins for the Fulton Market Kitchen Hub (`K`), Customer Drop-off (`D`), and a smoothly interpolated Courier badge moving along the route polyline via `requestAnimationFrame`.
- **Order Receipt Card with Route Snapshot (`Maps Static API`)**: Renders an itemized restaurant & grocery receipt alongside a high-DPI Maps Static API route summary image containing the kitchen marker, drop-off marker, and encoded route polyline (`enc:`).

## Quickstart Setup

### 1. Obtain an API Key

- **Fastest Prototyping (Maps Demo Key — No Billing Required):**
  1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Sign in with your Google account and accept the Maps Demo Project Terms.
  3. Click to generate and copy your Demo Key. *(Note: Demo Keys have daily quota limits and are for prototyping only. Some APIs such as Address Validation or Maps Static API may require a standard Google Cloud project key.)*
- **Production / Full API Coverage (Google Cloud Console):**
  1. Create or select a project in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
  2. Enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, **Geocoding API**, and **Maps Static API**.
  3. Restrict your key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173` in your browser.

## Architecture & Core Implementation

```ts
setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [maps, marker, places, addressValidation, routes, geometry, core] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('addressValidation'),
    importLibrary('routes'),
    importLibrary('geometry'),
    importLibrary('core'),
  ]);

const validation = await addressValidation.AddressValidation.fetchAddressValidation({
  address: { addressLines: [addressInput], regionCode: 'US' },
  uspsCASSEnabled: true,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes: computedRoutes } = await routes.Route.computeRoutes({
  origin: KITCHEN_HUB.position,
  destination: validatedLocation,
  travelMode: routes.TravelMode.DRIVING,
  routingPreference: routes.RoutingPreference.TRAFFIC_AWARE,
  fields: ['durationMillis', 'staticDurationMillis', 'distanceMeters', 'path', 'legs'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) & PlaceAutocompleteElement](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Address Validation API Overview](https://developers.google.com/maps/documentation/address-validation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps Static API Overview](https://developers.google.com/maps/documentation/maps-static/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Samples (`live-order-tracking`)

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
