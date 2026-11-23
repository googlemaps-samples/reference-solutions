# Hyperlocal Neighborhood Directory & Spot Mapper — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place`, `Geocoder`)

A production-ready, standalone **Hyperlocal Neighborhood Directory & Spot Mapper** pre-seeded in **Central London** (Covent Garden / West End, `51.5118, -0.1280`), built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and **Next.js BFF Route Handlers**.

## Features

- **Pre-Seeded Central London 5 km Discovery:** Automatically loads a 2D vector Google Map (`mapId="DEMO_MAP_ID"`, `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`) with a toggleable 5 km (`5000 m`) radius circle and executes a live **Places API (New)** Nearby Search across Restaurants, Cafes, Museums, and Parks.
- **Address & Neighborhood Search:** Uses an imperatively mounted **`PlaceAutocompleteElement`** (`<gmp-place-autocomplete>` listening to `gmp-select` + `event.placePrediction.toPlace().fetchFields()`), a **Forward Geocoding** bar (`GET /api/geocode?address=...`), and quick Central London neighborhood presets (Covent Garden, Soho, South Bank, Bloomsbury).
- **Categorized Advanced Markers:** Renders color-coded `<AdvancedMarker>` and `<Pin>` markers on the map synced with sidebar category filter chips (`All`, `Restaurants`, `Cafes`, `Museums`, `Parks`).
- **Live Place Details & Side-by-Side Comparison:** Inspects live ratings, review counts, price levels (`PRICE_LEVEL_*`), weekly opening hours (`regularOpeningHours.weekdayDescriptions`), photos (proxied safely via `/api/places/photo`), and customer reviews in a floating details drawer, and compares up to 3 places side-by-side in a docked comparison panel.
- **Click-to-Reverse-Geocode & Community Spot Pinning:** Clicking anywhere on the map reverse-geocodes coordinates via `GET /api/geocode?lat=...&lng=...` to display the human-readable street address, Place ID, and postcode, allowing users to pin session-scoped Community Spots on the map.

## Architecture Summary

- **Frontend (`app/components/`):** React Client Components wrapped in `<APIProvider>` and `<Map>` from `@vis.gl/react-google-maps`, with imperative Web Component mounting (`useRef` + `useEffect`) for `PlaceAutocompleteElement` and Maps JS SDK fallback (`lib/gmp-client-fallback.ts`) if an API key is HTTP-referrer restricted.
- **Backend-for-Frontend Route Handlers (`app/api/`):**
  - `POST /api/places/nearby` → `https://places.googleapis.com/v1/places:searchNearby` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - `GET /api/places/details` → `https://places.googleapis.com/v1/places/{placeId}` with `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - `GET /api/places/photo` → `https://places.googleapis.com/v1/{photoName}/media` server-side image proxy
  - `GET /api/geocode` → `https://maps.googleapis.com/maps/api/geocode/json` for forward and reverse geocoding
- **Security Headers:** `next.config.mjs` enforces `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and production servers bind strictly to `127.0.0.1`.

### Core Implementation Snippet

```tsx
<GoogleMap
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 51.5118, lng: -0.128 }}
  defaultZoom={13}
  gestureHandling="greedy"
  onClick={handleMapClick}
>
  {showRadiusCircle && (
    <Circle
      center={center}
      radius={5000}
      clickable={false}
      fillColor="#1A56DB"
      fillOpacity={0.07}
      strokeColor="#1A56DB"
    />
  )}
  {places.map((place) => (
    <AdvancedMarker
      key={place.id}
      position={place.location}
      onClick={() => onSelectPlace(place)}
    >
      <Pin
        background={CATEGORY_META[place.category].background}
        borderColor={CATEGORY_META[place.category].borderColor}
        glyphColor="#FFFFFF"
        glyphText={CATEGORY_META[place.category].glyphText}
      />
    </AdvancedMarker>
  ))}
</GoogleMap>
```

## Setup & Local Verification

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing card required), mint a **Maps Demo Key**:

1. Open [Google Maps Platform Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.

For production deployments, create and restrict an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0), and enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.

### 2. Configure `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Documentation & Compliance

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Maps JavaScript API Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API Overview](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Standalone Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
