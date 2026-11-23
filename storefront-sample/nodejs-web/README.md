# Single-Venue Storefront, Booking & Get Directions Hub — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PlaceAutocompleteElement`, `StreetViewPanorama`, Places API (New), Routes API v2)

A production-structured, zero-deprecation storefront, appointment-booking, and multimodal directions web application for a San Francisco multi-specialty dental clinic (**450 Sutter Dental Studio**). Built with a typed **Node.js + Express + TypeScript** Backend-for-Frontend (BFF) and a responsive **Vanilla JavaScript** web UI powered by the modern Google Maps Platform SDKs and REST APIs.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (`v=weekly`, `google.maps.importLibrary`)**:
  - `Map` with `mapId: "DEMO_MAP_ID"` and `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`
  - `AdvancedMarkerElement` with custom clinic & origin DOM badges (no legacy `google.maps.Marker`)
  - `Circle` overlay visualizing the 3.5 km San Francisco home-visit service area
  - `Polyline` + `geometry.encoding.decodePath` rendering `DRIVE`, `TRANSIT`, and `WALK` routes
  - `StreetViewService` + `StreetViewPanorama` + `geometry.spherical.computeHeading` for synchronized clinic entrance inspection
- **Places API (New)**:
  - Client-side `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields(...)`, pre-seeded with `Ferry Building, San Francisco, CA`
  - Server-side BFF proxy `POST /api/places/search` calling `https://places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask` for live business details, ratings, hours, open-now status, reviews, and Google Maps attribution links
  - Server-side BFF proxy `GET /api/places/photo` streaming `https://places.googleapis.com/v1/{name}/media` without exposing the API key in image URLs
- **Routes API v2**:
  - Server-side BFF proxy `POST /api/routes/compute` calling `https://routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask` for `DRIVE` (`TRAFFIC_AWARE`), `TRANSIT`, and `WALK`

## Architecture Summary

- **`src/server.ts` + `src/types.ts`**: Express + TypeScript server bound strictly to `127.0.0.1`, setting `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` headers, validating request payloads, proxying Places API (New) and Routes API v2 with server-side `GOOGLE_MAPS_API_KEY`, and handling non-PHI appointment scheduling inquiries (`POST /api/bookings`).
- **`public/index.html`, `public/styles.css`, `public/app.js`**: Full-viewport split-screen UI using `document.createElement()` and `textContent` exclusively (zero `innerHTML`) to display live clinic photos, ratings, weekly hours, Google user reviews, pre-seeded origin autocomplete, selectable travel modes, interactive map + Street View split pane, and appointment booking.

### Core Implementation Snippet

```ts
// src/server.ts — Routes API v2 BFF proxy with explicit field mask
const upstreamResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues',
  },
  body: JSON.stringify({
    origin: originWaypoint,
    destination: destinationWaypoint,
    travelMode, // 'DRIVE' | 'TRANSIT' | 'WALK'
    ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
    languageCode: 'en-US',
    units: 'IMPERIAL',
  }),
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing account or Cloud project required):
1. Open the [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key (supports Maps JavaScript API, Places API, and Routes API; subject to daily quota limits and prototyping terms).

For production deployments:
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page and enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
2. Restrict your keys by HTTP referrer / server IP and specific APIs following [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Compliance & Terms

- Usage of Google Maps Platform APIs is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Google Maps End User Terms](https://maps.google.com/help/terms_maps/?utm_campaign=gmp_git_agentsamples_v1.0.0).
- The appointment booking form collects scheduling metadata only; no medical records or HIPAA-regulated PHI are collected or transmitted to Google Maps Platform endpoints.

## Sample Implementations Across Web Stacks

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
