# Single-Venue Storefront, Booking & Get Directions Hub — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements: `AdvancedMarkerElement`, `Place`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `StreetViewPanorama`)

A standalone, production-structured Vue 3 + Vite + TypeScript web application for a multi-specialty San Francisco dental clinic storefront (`450 Sutter Dental`), featuring an interactive Google Map, custom branded `AdvancedMarkerElement` pins, a toggleable 3.5 km local home-visit `Circle` overlay, a synchronized `StreetViewPanorama` entrance preview, live Google Places (New) clinic details & reviews, multi-modal `Route.computeRoutes` directions from a pre-seeded `PlaceAutocompleteElement` origin, and a non-PHI appointment scheduling form.

## Architecture Overview

- **Maps JS API Bootstrap (`v=weekly`)**: Uses `@googlemaps/js-api-loader` v2 (`setOptions()` + `importLibrary()`) inside Vue lifecycle hooks to load `core`, `maps`, `marker`, `places`, `routes`, `streetView`, and `geometry` on demand.
- **Usage Attribution & Map ID**: Configures `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` on `MapOptions`, `PlaceAutocompleteElement`, and `Place.searchByText`.
- **Native Custom Elements in Vue**: `vite.config.ts` registers `isCustomElement: (tag) => tag.startsWith('gmp-')` so `<gmp-place-autocomplete>` mounts cleanly with zero Vue component resolution warnings and listens to the modern `gmp-select` event (`event.placePrediction.toPlace()` -> `place.fetchFields()`).
- **Live Venue Storefront**: `Place.searchByText` fetches live rating, user reviews, photos (`photo.getURI()`), contact metadata, and `regularOpeningHours`. Open-now status is computed cleanly from `regularOpeningHours.periods` in San Francisco's timezone (`America/Los_Angeles`) without calling beta-only `Place.prototype.isOpen()`.
- **Multi-Modal Routing**: `Route.computeRoutes` computes `DRIVING` (`TRAFFIC_AWARE`), `TRANSIT`, and `WALKING` routes from the pre-seeded `'Ferry Building, San Francisco, CA'` origin and draws them via `route.createPolylines()`.
- **Synchronized Street View**: `StreetViewService.getPanorama` locates the nearest outdoor panorama at the clinic entrance and computes the camera heading via `spherical.computeHeading()` for `StreetViewPanorama`.

### Core Implementation Snippet

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  language: 'en',
  region: 'US',
});

const [{ Map, Circle }, { AdvancedMarkerElement }, { Place }, { Route }] =
  await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
  ]);

const map = new Map(mapContainer, {
  center: { lat: 37.7896, lng: -122.4076 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});

const { routes } = await Route.computeRoutes({
  origin: { lat: 37.7955, lng: -122.3937 },
  destination: { lat: 37.7896, lng: -122.4076 },
  travelMode: 'DRIVING',
  fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
});
```

## Getting Started

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Maps Demo Key (Zero-Billing Prototyping)

1. Open [Google Maps Platform Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project setup required).
3. Accept the Maps Demo Project Terms and reveal your demo key.

> Note: The Maps Demo Key has a daily reset limit, is intended for prototyping only, and is governed by the Maps Demo Project Terms of Service.

#### Option B: Production Google Cloud API Key

1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable the following APIs for your project:
   - [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Routes API](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Street View](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0)
3. Restrict your API key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Cost Notice:** Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account once moving to production.

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

## Compliance & Privacy

- All place details, ratings, photos, hours, and reviews are fetched live from Google Maps Platform APIs with required attributions.
- The appointment booking form collects non-PHI scheduling metadata only (name, contact, specialty, date/time) and never sends medical records to Google Maps Platform APIs.
- Use of Google Maps Platform is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Other Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
