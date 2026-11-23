# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules): On-Demand Delivery Checkout, Zone Validation & Live Tracker (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, Address Validation API, Maps Static API)

An end-to-end Chicago restaurant and grocery delivery checkout and live order-tracking web application built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)**, a lightweight Node.js BFF server (`server.mjs`), and modern **Google Maps Platform** APIs.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (`@googlemaps/js-api-loader` v2 `setOptions` + `importLibrary`)** — Interactive 2D vector map (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`) with Chicago delivery zone `Polygon` and `Polyline` overlays.
- **`AdvancedMarkerElement`** — Custom DOM markers for the Fulton Market Kitchen Hub, Customer Drop-off, and smoothly animated Live Courier along the route polyline.
- **Places API (New) (`PlaceAutocompleteElement` + `Place`)** — Drop-in `<gmp-place-autocomplete>` widget listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Address Validation API (`v1:validateAddress`)** — Server-side BFF proxy (`/api/address/validate`) returning weekly-safe deliverability verdict fields (`validationGranularity`, `geocodeGranularity`, `addressComplete`, component confirmation flags, property `metadata`, and USPS CASS `uspsData`).
- **Routes API (`directions/v2:computeRoutes` & `Route.computeRoutes`)** — Server-side BFF proxy (`/api/routes/compute`) with `X-Goog-FieldMask` computing traffic-aware driving distance, ETA, and encoded polyline (plus `Route.computeRoutes` fallback), paired with `google.maps.geometry.poly.containsLocation` for dual polygon + 8 km road-distance eligibility and tiered fees (`$2.99` <= 3 km, `$4.99` <= 5.5 km, `$6.99` <= 8 km).
- **Maps Static API** — Server-side BFF proxy (`/api/maps/static-receipt`) streaming a high-DPI PNG route summary map for the Order Receipt Card without exposing `GOOGLE_MAPS_API_KEY` in client HTML.

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Prototyping, No Billing Required)
1. Open [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no credit card or Google Cloud billing account needed).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal the demo key and copy it.

> **Note:** The Maps Demo Key has daily usage limits, is strictly for prototyping (not production), and supports Maps JavaScript API, Places API, and Routes API. For full Address Validation API + Maps Static API coverage, use a standard Google Cloud project key.

#### Option B: Production Google Cloud API Key
1. Create a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable: **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**.
3. Follow the [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) guides.

### 2. Configure `.env` & Install Dependencies

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=...

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
```

### 3. Start the Local Server

```bash
node server.mjs --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser. `server.mjs` binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, injects runtime config via `/env-config.js`, and proxies REST requests so server credentials remain protected.

## Architecture & Core Implementation Snippet

- **`index.html` & `styles.css`**: Responsive split-screen layout with a 64 px header, 440 px scrollable checkout/dispatch/receipt sidebar, and full-height interactive map (`min-height: 560px`).
- **`app.js`**: Zero-bundler ES module loading `@googlemaps/js-api-loader` v2 via an `<script type="importmap">` and constructing all DOM updates safely with `document.createElement()`, `document.createElementNS()`, `textContent`, and `replaceChildren()` (zero `innerHTML`).
- **`server.mjs`**: Static asset server + BFF proxy for `/api/address/validate`, `/api/routes/compute`, and `/api/maps/static-receipt`.

```javascript
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({ key: apiKey, v: "weekly", language: "en", region: "US" });

const [{ Map }, { AdvancedMarkerElement }, { PlaceAutocompleteElement }, geometry] =
  await Promise.all([
    importLibrary("maps"),
    importLibrary("marker"),
    importLibrary("places"),
    importLibrary("geometry"),
  ]);

const map = new Map(document.getElementById("live-tracking-map"), {
  center: { lat: 41.8868, lng: -87.6486 },
  zoom: 13,
  mapId: "DEMO_MAP_ID",
  internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"],
});

const autocompleteEl = new PlaceAutocompleteElement({
  locationBias: { south: 41.72, west: -87.82, north: 42.02, east: -87.52 },
  includedRegionCodes: ["us"],
  internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"],
});

autocompleteEl.addEventListener("gmp-select", async (event) => {
  const place = event.placePrediction.toPlace();
  await place.fetchFields({ fields: ["formattedAddress", "location", "displayName", "id"] });
});
```

## Documentation & Terms

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps JavaScript API Reference](https://developers.google.com/maps/documentation/javascript/reference?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Address Validation API Docs](https://developers.google.com/maps/documentation/address-validation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Docs](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps Static API Docs](https://developers.google.com/maps/documentation/maps-static/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## All Sample Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
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
