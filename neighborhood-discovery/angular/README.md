# Hyperlocal Neighborhood Directory & Spot Mapper — Angular Standalone Components + TypeScript (@angular/google-maps) with `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place` (Places API New), and `Geocoder`

An interactive, hyperlocal neighborhood discovery, side-by-side business comparison, and community spot-mapping web application pre-seeded in **Central London** (`51.5118, -0.1280`), built with **Angular 22 Standalone Components**, **`@angular/google-maps`** (`GoogleMap`, `MapAdvancedMarker`, `MapCircle`), and **`@googlemaps/js-api-loader`** (`setOptions` + `importLibrary`).

---

## Features

- **Central London Discovery on Load:** Initializes a 2D vector Google Map (`mapId: 'DEMO_MAP_ID'`) centered on Covent Garden / West End (`51.5118, -0.1280`, zoom `13`) with an optional **5 km (`5000 m`) radius circle** and live **Places API (New)** `Place.searchNearby` results across **Restaurants**, **Cafes**, **Museums**, and **Parks**.
- **Color-Coded Custom Markers:** Renders `MapAdvancedMarker` + `PinElement` (`glyphText`, `background`, `borderColor`) pins on the map using weekly-channel-safe `mapClick` listeners.
- **Address Search & Neighborhood Presets:** Combines `<gmp-place-autocomplete>` (`PlaceAutocompleteElement` listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields()`) with a forward `Geocoder` button and Central London neighborhood presets (Covent Garden, Soho, South Bank, Bloomsbury).
- **Live Details Drawer & Side-by-Side Comparison:** Fetches live ratings, review counts, `priceLevel`, `regularOpeningHours.weekdayDescriptions`, photos, and customer reviews via `place.fetchFields()`, and compares up to 3 places side by side.
- **Map-Click Reverse Geocoding & Community Spots:** Clicking anywhere on the map runs `Geocoder.geocode({ location })` to display the human-readable street address and coordinates, letting users pin session-scoped community spots directly on the map.

---

## Quickstart & Setup (Maps Demo Key or Cloud Key)

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card or Google Cloud project required):
1. Open the [Maps Demo Key quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.

For production deployments:
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Restrict your key by HTTP referrer and allowed APIs following the [Google Maps Platform API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` and set `GOOGLE_MAPS_API_KEY`:

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Install, Typecheck, Build, and Serve

```bash
npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Then open `http://127.0.0.1:4200` in your browser.

---

## Architecture Summary

- **Runtime Key Injection (`serve-dist.mjs`):** Never hardcodes keys into `environment.ts` or compiled bundles. `serve-dist.mjs` binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, serves Angular's compiled `dist/neighborhood-discovery/browser` assets, and dynamically serves `/env-config.js` from `.env` (`GOOGLE_MAPS_API_KEY`).
- **Dynamic Library Loader ([`GoogleMapsLoaderService`](src/app/services/google-maps-loader.service.ts)):** Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) to load `maps`, `marker`, `places`, `geocoding`, and `core` before mounting `<google-map>`.
- **Zero-CORS Places & Geocoding ([`NeighborhoodDiscoveryService`](src/app/services/neighborhood-discovery.service.ts)):** Executes all `Place.searchNearby`, `Place.searchByText`, `place.fetchFields`, and `Geocoder.geocode` calls through the official Maps JavaScript SDK classes with `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`.
- **Standalone Components:** [`HeaderBarComponent`](src/app/components/header-bar.component.ts) (with `CUSTOM_ELEMENTS_SCHEMA` for `<gmp-place-autocomplete>`), [`PlacesSidebarComponent`](src/app/components/places-sidebar.component.ts), [`DetailsDrawerComponent`](src/app/components/details-drawer.component.ts), and [`ComparisonPanelComponent`](src/app/components/comparison-panel.component.ts).

### Core Implementation Snippet

```typescript
// Dynamic Maps JS API initialization via @googlemaps/js-api-loader v2
setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'GB',
});

const [mapsLib, markerLib, placesLib, geocodingLib] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('geocoding'),
]);

// Places API (New) Nearby Search within 5 km
const { places } = await placesLib.Place.searchNearby({
  fields: [
    'id', 'displayName', 'formattedAddress', 'location',
    'primaryType', 'primaryTypeDisplayName', 'rating',
    'userRatingCount', 'priceLevel', 'regularOpeningHours', 'photos',
  ],
  locationRestriction: { center: { lat: 51.5118, lng: -0.128 }, radius: 5000 },
  includedPrimaryTypes: ['restaurant'],
  maxResultCount: 6,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

---

## Documentation & Terms

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places Library in Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding Service in Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## All Stack Implementations (`neighborhood-discovery`)

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
