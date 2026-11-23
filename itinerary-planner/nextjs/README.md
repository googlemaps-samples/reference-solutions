# Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

Built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`** (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`), **`PlaceAutocompleteElement`** (`gmp-select`), **Places API (New)**, **Routes API v2** (`computeRoutes`), **Time Zone API**, and **Street View** (`StreetViewService` + `StreetViewPanorama`).

## Features

- **Destination Search & Quick Switcher:** Imperatively mounted [`PlaceAutocompleteElement`](https://developers.google.com/maps/documentation/javascript/place-autocomplete-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) listening to `gmp-select` (`PlacePrediction.toPlace()` + `place.fetchFields()`), paired with quick presets starting on **Tokyo, Japan**.
- **Live Time Zone Hub:** Real-time destination clock, localized `timeZoneName`, IANA `timeZoneId`, and UTC offset badge powered by the [Time Zone API](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) via `/api/timezone` (with `Place.utcOffsetMinutes` fallback).
- **Live Places API (New) Discovery:** Discover top-rated **Attractions**, **Restaurants**, and **Hotels** via `/api/places/search` and `/api/places/nearby`, complete with proxied [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos?utm_campaign=gmp_git_agentsamples_v1.0.0) (`/api/places/photo`), live ratings, review counts, and `regularOpeningHours`.
- **Multi-Day Itinerary & Routes API v2 Optimization:** Organize stops into **Day 1** (Teal `#0F766E`) and **Day 2** (Amber `#D97706`), switch between `DRIVE`, `WALK`, and `TRANSIT`, inspect per-leg travel times/distances, and reorder intermediate stops via [Routes API `computeRoutes`](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`optimizeWaypointOrder: true`).
- **Interactive 2D Map & Street View Preview:** Numbered day-colored `AdvancedMarkerElement` pins, active-day route polylines, marker `InfoWindow` popups, and a docked [`StreetViewPanorama`](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0) panel backed by `StreetViewService.getPanorama`.

## Architecture & BFF Proxy Endpoints

All CORS-restricted Google Maps Platform REST calls execute server-side inside Next.js App Router Route Handlers (`app/api/.../route.ts`) with explicit `X-Goog-Api-Key` and `X-Goog-FieldMask` headers:

| Endpoint | Upstream Google Maps Platform Service | Purpose |
| :--- | :--- | :--- |
| `POST /api/places/search` | `places.googleapis.com/v1/places:searchText` | Live attractions & destination text search |
| `POST /api/places/nearby` | `places.googleapis.com/v1/places:searchNearby` | Nearby restaurants & hotels around destination |
| `GET /api/places/details` | `places.googleapis.com/v1/places/{placeId}` | Rich place details & viewport metadata |
| `GET /api/places/photo` | `places.googleapis.com/v1/{photoName}/media` | Server-side photo media proxy (never exposes key) |
| `POST /api/routes/compute` | `routes.googleapis.com/directions/v2:computeRoutes` | Multi-stop polylines, legs & waypoint optimization |
| `GET /api/timezone` | `maps.googleapis.com/maps/api/timezone/json` | IANA time zone ID, `rawOffset`, and `dstOffset` |

### Core Map & Marker Snippet

```tsx
<Map
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={destination.center}
  defaultZoom={destination.zoom}
  gestureHandling="greedy"
>
  {activeStops.map((stop, index) => (
    <AdvancedMarker key={stop.id} position={stop.location} title={stop.displayName}>
      <Pin
        background={DAY_COLORS[activeDay].hex}
        borderColor={DAY_COLORS[activeDay].border}
        glyphColor="#ffffff"
        glyphText={String(index + 1)}
      />
    </AdvancedMarker>
  ))}
</Map>
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, no billing card required):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and reveal your demo key.

**Option B — Production Google Cloud Key:**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**.
3. Follow [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [restrict your key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000`.

> **Billing & Terms Notice:** Usage of Google Maps Platform APIs in production may incur costs against your Google Cloud billing account and is governed by the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

## All Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/) *(current implementation)*
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
