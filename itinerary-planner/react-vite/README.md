# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — React + Vite + TypeScript (`@vis.gl/react-google-maps`) (`Place`, `PlaceAutocompleteElement`, `AdvancedMarkerElement`, `Route.computeRoutes`, `StreetViewPanorama`)

An interactive multi-day city trip planner and hotel/attraction discovery web application built with **React 19, Vite, TypeScript, and `@vis.gl/react-google-maps`**, pre-seeded for **Tokyo, Japan** with live data from modern Google Maps Platform APIs.

## Features

- **Live Destination Search & Quick Presets:** Imperatively mounted `PlaceAutocompleteElement` (`gmp-select` + `placePrediction.toPlace()` + `place.fetchFields()`) paired with quick-jump city presets (Tokyo, Kyoto, Paris, London, New York).
- **Live Time Zone Hub:** Real-time destination clock, IANA time zone ID, localized time zone name, and UTC offset powered by the Google Maps Platform **Time Zone API** (proxied via Vite's `/api/timezone` middleware) with automatic `Place.utcOffsetMinutes` fallback.
- **Place Discovery (Places API New):** Live Attractions (`Place.searchByText`), Restaurants (`Place.searchByText`), and Nearby Hotels (`Place.searchNearby`) displaying live ratings, review counts, `Photo.getURI()` thumbnails, `regularOpeningHours.weekdayDescriptions`, and Google Maps links.
- **Multi-Day Itinerary Tabs & Route Optimization (Routes API):** Day 1 (Teal `#0F766E`) and Day 2 (Amber `#D97706`) tabs with numbered day-colored `<AdvancedMarker>` + `<Pin>` markers, travel mode switching (`DRIVING`, `WALKING`, `TRANSIT`), `Route.computeRoutes` multi-stop polylines (`Route.createPolylines()`), leg-by-leg breakdown, and one-click `optimizeWaypointOrder` stop reordering.
- **Embedded Street View Preview Panel:** Docked `StreetViewPanorama` + `StreetViewService.getPanorama()` panel for inspecting any selected landmark or hotel, with graceful handling where imagery is unavailable.

## Architecture Summary

- **Frontend (`src/`):** Uses `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `useMapsLibrary`, `useMap`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
- **Time Zone Proxy (`vite.config.ts`):** Exposes `/api/timezone` in both Vite `dev` and `preview` servers bound strictly to `127.0.0.1` so browser requests avoid CORS failures while keeping the API key out of direct third-party REST `fetch()` URLs.

### Core Implementation Snippet

```tsx
// Live multi-stop routing & optimization using Maps JS Routes Library
const { Route } = routesLib;
const response = await Route.computeRoutes({
  origin: stops[0].location,
  destination: stops[stops.length - 1].location,
  intermediates: stops.slice(1, -1).map((stop) => ({ location: stop.location })),
  travelMode,
  optimizeWaypointOrder: true,
  fields: [
    'distanceMeters',
    'durationMillis',
    'legs',
    'path',
    'localizedValues',
    'optimizedIntermediateWaypointIndices',
  ],
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Zero-Billing Prototyping):**
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key. *(Note: Maps Demo Keys are for prototyping only, have daily limits, and may not include Time Zone API — the app automatically falls back to `Place.utcOffsetMinutes` when Time Zone API is unavailable.)*

**Option B — Production API Key (Google Cloud Console):**
1. Create a key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable: **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**.
3. Restrict the key by HTTP referrer and designated APIs following [API Key Security Best Practices](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Billing Notice:** Using Google Maps Platform services in production may incur costs against your Google Cloud billing account. Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local development with hot reload:

```bash
npm run dev
```

## Related Sample Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
