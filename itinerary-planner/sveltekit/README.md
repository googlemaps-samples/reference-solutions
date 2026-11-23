# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components: `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `Place`, `Route.computeRoutes`, `StreetViewPanorama`)

An interactive multi-day city trip planner and hotel/attraction discovery app built with **SvelteKit + TypeScript**, pre-seeded for **Tokyo**, and powered by modern Google Maps Platform APIs.

## Google Maps Platform Products & Classes Used

- **Maps JavaScript API**: `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `InfoWindow`, `Polyline`
- **Markers Library**: `AdvancedMarkerElement`, `PinElement` (`glyphText`, `background`, `borderColor`)
- **Places API (New)**: `PlaceAutocompleteElement` (`gmp-select` event + `placePrediction.toPlace()`), `Place.searchByText`, `Place.searchNearby`, `place.fetchFields`, `photo.getURI`
- **Routes API**: `Route.computeRoutes` (`optimizeWaypointOrder`, `createPolylines`, `RouteLeg`)
- **Street View Service**: `StreetViewService.getPanorama`, `StreetViewPanorama`
- **Time Zone API**: Server-side SvelteKit endpoint (`/api/timezone` -> `maps.googleapis.com/maps/api/timezone/json`) with graceful `Place.utcOffsetMinutes` / `Place.timeZone` fallback

> **Cost & Terms Notice:** Utilizing Google Maps Platform services in production may incur costs against your Google Cloud billing account. Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your demo key and copy it. *(Note: The Demo Key has a daily quota reset and is strictly for prototyping, not production.)*

#### Option B: Production Google Cloud Key
1. Create an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**.
3. Restrict the key by HTTP referrer and API scope as described in [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Set `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`:

```env
PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install, Typecheck, Build & Run

```bash
npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture Summary

- **SSR-Safe Maps Loading**: All `@googlemaps/js-api-loader` (`setOptions` + `importLibrary`) calls and DOM mounting (`Map`, `PlaceAutocompleteElement`, `StreetViewPanorama`) run strictly inside Svelte's `onMount` lifecycle.
- **Dynamic Environment Reading**: Reads `PUBLIC_GOOGLE_MAPS_API_KEY` via `$env/dynamic/public` so production builds succeed cleanly without baking secrets into client bundles.
- **Server-Side Time Zone Endpoint**: [`src/routes/api/timezone/+server.ts`](src/routes/api/timezone/+server.ts) proxies requests to `maps.googleapis.com/maps/api/timezone/json` without browser CORS issues, with automatic fallback to Places API (New) `utcOffsetMinutes` and `timeZone`.
- **Security Headers**: [`src/hooks.server.ts`](src/hooks.server.ts) sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and Vite binds strictly to `127.0.0.1`.

### Core Implementation Snippet (`src/lib/maps.ts`)

```ts
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place }, { Route }] = await Promise.all([
	importLibrary('maps'),
	importLibrary('marker'),
	importLibrary('places'),
	importLibrary('routes')
]);

const { places } = await Place.searchByText({
	textQuery: 'top tourist attractions in Tokyo',
	fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'regularOpeningHours', 'photos'],
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const { routes } = await Route.computeRoutes({
	origin: stops[0].location,
	destination: stops[stops.length - 1].location,
	intermediates: stops.slice(1, -1).map((s) => ({ location: s.location })),
	travelMode: 'DRIVING',
	optimizeWaypointOrder: true,
	fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'optimizedIntermediateWaypointIndices']
});
```

## Sample Implementations Across Web Stacks

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
