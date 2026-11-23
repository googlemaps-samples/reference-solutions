# Single-Venue Storefront, Booking & Get Directions Hub — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components: `Map`, `AdvancedMarkerElement`, `Place`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `StreetViewPanorama`)

A standalone, production-ready San Francisco multi-specialty dental clinic storefront, appointment-booking, and get-directions web application built with **SvelteKit**, **Svelte 5**, **TypeScript**, and the modern **Google Maps Platform JavaScript SDK** (`@googlemaps/js-api-loader` v2).

## Google Maps Platform APIs & Classes Used

- **Maps JavaScript API (`v="weekly"`, `mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`):** `google.maps.Map`, `google.maps.Circle` (3.5 km home-visit coverage overlay), `google.maps.Polyline`
- **Marker Library:** `google.maps.marker.AdvancedMarkerElement`, `google.maps.marker.PinElement`
- **Places API (New):** `Place.searchByText`, `Place.fetchFields`, `PlaceAutocompleteElement` (`gmp-select` + `event.placePrediction.toPlace()`)
- **Routes API (JS SDK):** `Route.computeRoutes` (`DRIVING`, `TRANSIT`, `WALKING`) and `route.createPolylines()`
- **Street View & Geometry:** `StreetViewService.getPanorama`, `StreetViewPanorama`, `spherical.computeHeading`

## Architecture Summary

- **SSR-Safe Lifecycle:** All Google Maps SDK initialization runs strictly inside Svelte's `onMount()` lifecycle so server-side rendering never accesses `window` or `document`.
- **Runtime Dynamic Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` is read via SvelteKit's `$env/dynamic/public` so production builds succeed without baking credentials into build artifacts.
- **Zero-Deprecation & Zero-Wrapper Policy:** Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and native Google Maps classes/Web Components directly—no third-party Svelte wrappers or legacy `Marker` / `PlacesService` / `DirectionsService` APIs.
- **Weekly-Channel Open-Now Computation:** Computes live Open/Closed status from `regularOpeningHours.periods` and `utcOffsetMinutes` without invoking beta-only `Place.prototype.isOpen()`.
- **Non-PHI Scheduling Compliance:** The appointment booking form collects scheduling inquiry metadata only and never transmits medical or HIPAA-regulated records to Google Maps Platform APIs.

### Core Implementation Snippet

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map, Circle }, { AdvancedMarkerElement }, { Place, PlaceAutocompleteElement }, { Route }] =
	await Promise.all([
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes')
	]);

const map = new Map(mapContainer, {
	center: { lat: 37.7896, lng: -122.4076 },
	zoom: 13,
	mapId: 'DEMO_MAP_ID',
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { places } = await Place.searchByText({
	textQuery: '450 Sutter Dental San Francisco',
	fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'regularOpeningHours', 'reviews', 'photos']
});
```

## Setup & Local Development

### 1. Obtain an API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Open the [Maps Demo Key Console](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) and sign in with any Google account.
2. Accept the Maps Demo Project Terms and generate your demo key (supports Maps JavaScript API, Places API, Routes API, and Street View with a daily reset limit; not for production).

**Option B — Production Google Cloud Key:**
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Restrict your key by HTTP referrer and designated APIs following [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Compliance & Terms

- Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account once you move beyond prototyping.
- Use of this code is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Learn more in the [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0).

## All Stack Implementations

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
