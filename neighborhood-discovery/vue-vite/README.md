# Hyperlocal Neighborhood Directory & Spot Mapper — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements, `Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, `Geocoder`)

A standalone, zero-deprecation **Vue 3 + Vite + TypeScript** geospatial web application pre-seeded in **Central London** (`Covent Garden / West End`, `51.5118, -0.1280`). It uses the modern **Maps JavaScript API**, **Places API (New)** (`PlaceAutocompleteElement`, `Place.searchNearby`, `Place.searchByText`, `place.fetchFields`), and **Geocoding API** (`Geocoder`) to discover restaurants, cafes, museums, and parks within a 5 km radius, compare up to 3 places side-by-side, and click anywhere on the map to reverse-geocode street addresses and pin session-scoped community spots.

## Sibling Implementations

Explore all 8 standalone stack implementations of the Hyperlocal Neighborhood Directory & Spot Mapper:

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

## Modern Google Maps Platform Stack

- **Bootstrap & Dynamic Imports:** [`@googlemaps/js-api-loader`](https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_git_agentsamples_v1.0.0) v2 functional API (`setOptions()` + `importLibrary()`) on the `weekly` channel (`language: 'en'`, `region: 'GB'`).
- **2D Vector Map & Radius Overlay:** [`google.maps.Map`](https://developers.google.com/maps/documentation/javascript/reference/map?utm_campaign=gmp_git_agentsamples_v1.0.0) configured with `mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, and a 5 km (`5000m`) [`google.maps.Circle`](https://developers.google.com/maps/documentation/javascript/reference/polygon?utm_campaign=gmp_git_agentsamples_v1.0.0#Circle).
- **Categorized Custom Markers:** [`AdvancedMarkerElement`](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) + [`PinElement`](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers?utm_campaign=gmp_git_agentsamples_v1.0.0#PinElement) using `glyphText` and standard `click` listeners (weekly-channel safe).
- **Address & Neighborhood Autocomplete:** [`<gmp-place-autocomplete>` (`PlaceAutocompleteElement`)](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0) configured as a native custom element in `vite.config.ts` (`isCustomElement: (tag) => tag.startsWith('gmp-')`), listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Places API (New) Discovery & Details:** [`Place.searchNearby`](https://developers.google.com/maps/documentation/javascript/nearby-search?utm_campaign=gmp_git_agentsamples_v1.0.0), [`Place.searchByText`](https://developers.google.com/maps/documentation/javascript/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0), and [`place.fetchFields`](https://developers.google.com/maps/documentation/javascript/place-details?utm_campaign=gmp_git_agentsamples_v1.0.0) retrieving live ratings, `userRatingCount`, `priceLevel`, `regularOpeningHours.weekdayDescriptions`, photos, and customer reviews.
- **Forward & Reverse Geocoding:** [`Geocoder.geocode`](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0) for converting addresses into coordinates and map clicks into human-readable street addresses and Place IDs.

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A — Free Maps Demo Key (Prototyping, No Billing Required)
1. Open [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Google Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate / reveal your Maps Demo Key.

#### Option B — Production Google Cloud API Key
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Restrict the key by HTTP referrer and limit it strictly to those APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Cost Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account once you move beyond the free tier or Maps Demo Key daily limits. Use of this application is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For hot-reload development bound to `127.0.0.1`:

```bash
npm run dev
```

## Architecture & Core Implementation

```
src/
├── constants/london.ts          # Central London presets, 5km radius, category PinElement palettes, attribution ID
├── types/neighborhood.ts        # Strongly typed domain models for Places, ReverseGeocodeResult, CommunitySpot
├── services/googleMaps.ts       # @googlemaps/js-api-loader v2 bootstrap, Place.searchNearby/searchByText/fetchFields, Geocoder
├── components/
│   ├── HeaderBar.vue            # <gmp-place-autocomplete> (gmp-select), Geocode button, neighborhood presets, 5km ring & Compare toggles
│   ├── DirectorySidebar.vue     # Category chips (All, Restaurants, Cafes, Museums, Parks), live cards, Community Spots list
│   ├── MapCanvas.vue            # 2D vector Map (DEMO_MAP_ID), 5km Circle, AdvancedMarkerElement + PinElement, map-click reverse geocode
│   ├── DetailsDrawer.vue        # Live ratings, priceLevel, weekdayDescriptions, reviews, and reverse-geocoded community spot form
│   └── ComparisonPanel.vue      # Side-by-side comparison grid for up to 3 places
└── App.vue                      # State orchestration across search, filters, details, comparison, and community pins
```

### Core Implementation Snippet (`src/services/googleMaps.ts`)

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en',
  region: 'GB',
});

const [{ Place, SearchNearbyRankPreference }, { AdvancedMarkerElement, PinElement }] =
  await Promise.all([importLibrary('places'), importLibrary('marker')]);

const { places } = await Place.searchNearby({
  fields: [
    'id', 'displayName', 'formattedAddress', 'location',
    'primaryType', 'primaryTypeDisplayName', 'rating',
    'userRatingCount', 'priceLevel', 'regularOpeningHours', 'photos',
  ],
  locationRestriction: { center: { lat: 51.5118, lng: -0.128 }, radius: 5000 },
  includedPrimaryTypes: ['restaurant', 'cafe', 'museum', 'park'],
  maxResultCount: 20,
  rankPreference: SearchNearbyRankPreference.POPULARITY,
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
