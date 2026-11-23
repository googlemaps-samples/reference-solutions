# Hyperlocal Neighborhood Directory & Spot Mapper — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components)

A standalone Central London neighborhood discovery, side-by-side business comparison, and community spot-mapping web application built with **SvelteKit 2**, **Svelte 5**, **TypeScript**, and modern **Google Maps Platform** APIs (`Map`, `AdvancedMarkerElement`, `PinElement`, `Circle`, `Place`, `PlaceAutocompleteElement`, and `Geocoder`).

## Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`maps`, `marker`, `core` libraries)** — 2D vector `google.maps.Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `google.maps.Circle` (5 km radius boundary), `AdvancedMarkerElement`, and `PinElement` (`glyphText`).
- **Places API (New) (`places` library)** — `PlaceAutocompleteElement` (`gmp-select` event + `event.placePrediction.toPlace().fetchFields()`), `Place.searchNearby`, `Place.searchByText`, and `Place.fetchFields`.
- **Geocoding API (`geocoding` library)** — `Geocoder.geocode` for forward address/neighborhood lookup and map-click reverse geocoding.

Official documentation:
- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) in Maps JS](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [PlaceAutocompleteElement Guide](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding Service in Maps JS](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Quickstart & Setup

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping Only)
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate and reveal your demo API key.
5. Note that the Maps Demo Key has a daily reset quota and is intended for prototyping only (not production).

#### Option B: Production Google Cloud API Key
1. Create or select a project in the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Restrict your key by **HTTP referrer** and designated APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and set your key:

```bash
cp .env.example .env
```

```env
PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

SvelteKit reads `PUBLIC_GOOGLE_MAPS_API_KEY` at runtime via `$env/dynamic/public`, so builds succeed cleanly without baking secrets into client bundles.

### 3. Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

## Architecture Summary

- **SSR-Safe Client Initialization ([`src/routes/+page.svelte`](src/routes/+page.svelte)):** All Google Maps Platform loading happens inside Svelte's `onMount` lifecycle so server-side rendering never references `window` or `document`.
- **Modern Loader & SDK Wrapper ([`src/lib/maps.ts`](src/lib/maps.ts)):** Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) on the `weekly` channel with `region: 'GB'` and `language: 'en'`.
- **Balanced 5 km Discovery:** Pre-seeded in Central London (`51.5118, -0.1280`, zoom `13`), querying `Place.searchNearby` across `restaurant`, `cafe`, `museum`, and `park` primary types inside a 5,000 m `locationRestriction` circle.
- **Weekly-Channel Safe Hours & Markers:** Reads `regularOpeningHours.weekdayDescriptions` instead of beta-only `Place.prototype.isOpen()`, renders `PinElement` directly via `marker.append(pin)`, and binds standard `'click'` listeners on `AdvancedMarkerElement`.
- **Reverse Geocoding & Community Spots:** Clicking anywhere on the map triggers `Geocoder.geocode({ location })` (with `clickable: false` on the radius `Circle` so clicks pass through) and lets users pin session-scoped community spots onto the map.

### Core Implementation Snippet (`src/lib/maps.ts`)

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'GB' });
const [mapsLib, markerLib, placesLib, geocodingLib] = await Promise.all([
	importLibrary('maps'),
	importLibrary('marker'),
	importLibrary('places'),
	importLibrary('geocoding')
]);

const { places } = await placesLib.Place.searchNearby({
	fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'priceLevel', 'regularOpeningHours'],
	locationRestriction: { center: { lat: 51.5118, lng: -0.128 }, radius: 5000 },
	includedPrimaryTypes: ['restaurant'],
	maxResultCount: 6,
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});
```

## Sibling Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
