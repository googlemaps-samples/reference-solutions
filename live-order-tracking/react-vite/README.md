# On-Demand Delivery Checkout, Zone Validation & Live Tracker — React + Vite + TypeScript (`@vis.gl/react-google-maps`)

Built with **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** using modern, zero-deprecation Google Maps Platform APIs: **`AdvancedMarker` (`AdvancedMarkerElement`)**, **`PlaceAutocompleteElement`**, **`Place`**, **Address Validation API (`/api/address/validate` Vite proxy with `Geocoder` fallback)**, **`Route.computeRoutes`**, **`google.maps.geometry.poly.containsLocation`**, and **`createStaticMapsUrl` (Maps Static API)**.

## Features

- **Checkout Address Autocomplete (Places API New):** Imperatively mounts `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) biased to Chicago, listening for the modern `gmp-select` event and hydrating `place.fetchFields()`.
- **Address Validation & USPS Deliverability:** Proxies `POST /api/address/validate` via Vite dev/preview middleware (`vite.config.ts`) to `addressvalidation.googleapis.com/v1:validateAddress` with `enableUspsCass: true` (falling back gracefully to `google.maps.importLibrary('geocoding')` if unavailable) to inspect weekly-safe verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, `hasUnconfirmedComponents`, `hasInferredComponents`, `hasReplacedComponents`), property `metadata` (`business`, `residential`, `poBox`), and `uspsData` (`dpvConfirmation`, `carrierRoute`).
- **Chicago Delivery Zone & 8 km Road-Distance Check:** Verifies whether the validated coordinate falls inside the Fulton Market Chicago polygon (`google.maps.geometry.poly.containsLocation`) and computes a traffic-aware driving route (`Route.computeRoutes`) capped at `8.0 km` with tiered pricing:
  - `<= 3.0 km`: **\$2.99** (Tier 1)
  - `3.0 – 5.5 km`: **\$4.99** (Tier 2)
  - `5.5 – 8.0 km`: **\$6.99** (Tier 3)
- **Live Order Tracking Map:** Renders the Chicago delivery polygon (`<Polygon>`), computed route polyline (`<Polyline>`), and custom `<AdvancedMarker>` pins for the Fulton Market kitchen hub (`41.8868, -87.6486`), customer drop-off, and a smoothly animated courier interpolated along the route path via `requestAnimationFrame`.
- **Order Receipt Card with Maps Static API Preview:** Generates an itemized receipt alongside a static route summary image via `createStaticMapsUrl` with kitchen/drop-off markers and the `enc:` encoded route polyline.

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms and click **Generate / Reveal Key**.

#### Option B: Production Google Cloud API Key
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, **Geocoding API**, and **Maps Static API**.
3. Restrict the key by HTTP referrer and enabled APIs following the [Google Maps Platform API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and set your key:

```bash
cp .env.example .env.local
```

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For hot-reloading development mode:

```bash
npm run dev
```

## Architecture Summary

- **`vite.config.ts`**: Configures `127.0.0.1` dev/preview binding and a server-side `POST /api/address/validate` middleware proxy to `addressvalidation.googleapis.com/v1:validateAddress` with security headers.
- **`src/App.tsx`**: Initializes `<APIProvider>` from `@vis.gl/react-google-maps` with `places`, `marker`, `routes`, `geometry`, and `geocoding`, seeds `"401 N Michigan Ave, Chicago, IL 60611"`, and drives smooth `requestAnimationFrame` courier interpolation along the route polyline.
- **`src/services/mapsServices.ts`**: Calls `/api/address/validate` (with `Geocoder` fallback) and encapsulates promise-based `importLibrary()` calls to `google.maps.geometry.poly.containsLocation` and `Route.computeRoutes` (`travelMode: 'DRIVING'`, `routingPreference: 'TRAFFIC_AWARE'`).
- **`src/components/AddressAutocompleteInput.tsx`**: Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` (preventing React JSX property stringification) and handles `gmp-select`.
- **`src/components/DeliveryMap.tsx`**: Renders `<Map id="live-tracking-map" mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` with `<Polygon>`, `<Polyline>`, and custom `<AdvancedMarker>` components.
- **`src/components/CheckoutSidebar.tsx`**: Displays the 3-card checkout workflow, address validation verdict flags, tiered fee & ETA summary, courier dispatch controls, and itemized receipt with a `createStaticMapsUrl` static route preview.

### Core Implementation Snippet

```tsx
const [{ Route }, { encoding }] = await Promise.all([
  google.maps.importLibrary('routes') as Promise<google.maps.RoutesLibrary>,
  google.maps.importLibrary('geometry') as Promise<google.maps.GeometryLibrary>,
]);

const { routes } = await Route.computeRoutes({
  origin: KITCHEN_HUB.coordinates,
  destination: validatedLocation,
  travelMode: 'DRIVING',
  routingPreference: 'TRAFFIC_AWARE',
  fields: ['durationMillis', 'distanceMeters', 'path', 'legs', 'localizedValues'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Terms

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) PlaceAutocompleteElement](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Address Validation API (Maps JS)](https://developers.google.com/maps/documentation/javascript/address-validation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes Library (`Route.computeRoutes`)](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
