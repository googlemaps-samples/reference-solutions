# Hyperlocal Neighborhood Directory & Spot Mapper — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Geocoder`)

A zero-bundler, ES-module web application pre-seeded in **Central London (Covent Garden / West End)** for hyperlocal neighborhood discovery, side-by-side business comparison, and community spot pinning using modern **Google Maps Platform** APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (`maps`, `marker`, `core`)**:
  - 2D vector `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`)
  - `AdvancedMarkerElement` & `PinElement` (using `glyphText` directly, never deprecated `Marker` or `PinElement.element`)
  - `Circle` for the toggleable 5 km (`5000` m) search radius overlay
  - `InfoWindow` for marker and reverse-geocode popups
- **Places API (New) (`places`)**:
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`
  - `Place.searchNearby()` with `locationRestriction` (5 km circle) across `restaurant`, `cafe`, `museum`, and `park`
  - `Place.searchByText()` fallback for neighborhood queries
  - `place.fetchFields()` for live ratings, `userRatingCount`, `priceLevel`, `regularOpeningHours.weekdayDescriptions`, `reviews`, `photos`, `websiteURI`, `internationalPhoneNumber`, and `googleMapsURI`
- **Geocoding API (`geocoding`)**:
  - `Geocoder.geocode({ address })` for forward address/neighborhood lookup
  - `Geocoder.geocode({ location })` for map-click reverse geocoding to human-readable street addresses and Place IDs
- **Loader**:
  - `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) loaded via native browser `<script type="importmap">`

## Prerequisites & Setup (Maps Demo Key or Cloud Key)

1. **Install dependencies:**
   ```bash
   npm install --no-audit --no-fund
   ```
2. **Obtain a Google Maps Platform API key:**
   - **Fastest Prototyping Option — Maps Demo Key (no billing card required):**
     1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
     2. Sign in with a Google account and accept the Maps Demo Project Terms when prompted.
     3. Generate and copy your demo key (intended for low-volume prototyping with daily limits, not production).
     4. See the [Maps Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for details.
   - **Production Option — Google Cloud Console Key:**
     - Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**, and apply HTTP referrer & API restrictions per [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **Configure `.env`:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   ```env
   GOOGLE_MAPS_API_KEY=your_actual_key_here
   ```
4. **Verify syntax & build:**
   ```bash
   node --check app.js && node --check server.mjs
   npm run build
   ```
5. **Run the local server (loopback `127.0.0.1` only):**
   ```bash
   node server.mjs --host 127.0.0.1 --port 3000
   ```
   Open `http://127.0.0.1:3000` in your browser.

## Architecture & Core Implementation

- [`server.mjs`](./server.mjs): Lightweight Node.js HTTP server strictly bound to `127.0.0.1`. Reads `GOOGLE_MAPS_API_KEY` from `.env` / environment, serves `/env-config.js` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and serves static ES module assets safely without path traversal.
- [`index.html`](./index.html): Responsive split-screen layout with a fixed 64px top bar, 400px left directory sidebar, full-height `#map-canvas` (`min-height: 540px`), slide-over Place Details / Reverse-Geocode Inspector drawer, and docked Side-by-Side Comparison panel.
- [`app.js`](./app.js): Pure ES module client calling `importLibrary()` exclusively (zero CORS traps, zero `innerHTML` sinks, zero hardcoded place data).

```js
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'GB' });

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
]);

const map = new Map(document.getElementById('map-canvas'), {
  center: { lat: 51.5118, lng: -0.128 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Compliance & Terms

- Use of Google Maps Platform services is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and, where applicable, the [Google Maps Platform EEA Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0).
- All place ratings, opening hours, photos, and customer reviews are fetched live at runtime from Google Maps Platform APIs—never hardcoded or fabricated.

## Sample Implementations Across Web Stacks

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
