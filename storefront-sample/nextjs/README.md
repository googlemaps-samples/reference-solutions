# Single-Venue Storefront, Booking & Get Directions Hub — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

A standalone, production-ready San Francisco multi-specialty dental clinic storefront, appointment-booking, and get-directions web application built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and **Next.js Route Handlers (BFF)** using modern Google Maps Platform APIs: **`AdvancedMarkerElement` (`<AdvancedMarker>`)**, **`PlaceAutocompleteElement`**, **`Place` (Places API New)**, **`Route.computeRoutes` / Routes API v2**, **`StreetViewPanorama`**, and **`StreetViewService`**.

---

## Architecture Summary

- **Interactive Map (`ClinicMapViewport.tsx`)**: Renders `@vis.gl/react-google-maps` `<APIProvider version="weekly">` and `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` with a custom branded clinic `<AdvancedMarker>`, a visitor origin `<AdvancedMarker>`, a toggleable 3.5 km San Francisco home-visit `google.maps.Circle` overlay, and a mode-styled `google.maps.Polyline` route.
- **Synchronized Street View Entrance Preview**: Uses `StreetViewService.getPanorama()` and `google.maps.geometry.spherical.computeHeading()` to orient a `StreetViewPanorama` directly toward the clinic entrance in Map / Split / Street View modes.
- **BFF Route Handlers (`src/app/api/*`)**:
  - `POST /api/places/search` — Proxies `places.googleapis.com/v1/places:searchText` with `X-Goog-Api-Key` and `X-Goog-FieldMask` to fetch live clinic details, rating, opening hours, open-now status, reviews, and photo references.
  - `GET /api/places/photo` — Streams resized clinic photos from `places.googleapis.com/v1/{name}/media` without exposing the API key in client image URLs.
  - `POST /api/routes/compute` — Proxies `routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask` for `DRIVE`, `TRANSIT`, and `WALK` routes.
  - Client-side Maps JS SDK fallbacks (`Place.searchByText` and `Route.computeRoutes`) automatically handle HTTP-referrer-restricted browser keys.
- **Visitor Origin Search (`OriginAutocompleteInput.tsx`)**: Imperatively mounts `<gmp-place-autocomplete>` (`PlaceAutocompleteElement`) via `useRef` + `useEffect`, pre-seeded with `Ferry Building, San Francisco, CA`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Non-PHI Appointment Booking (`BookingFormCard.tsx`)**: Schedules In-Clinic or Local Home-Visit consultations with live 3.5 km coverage validation and instant confirmation codes (no HIPAA medical records are collected or sent to Google Maps APIs).

### Core Implementation Snippet

```tsx
<Map
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 37.7896, lng: -122.4076 }}
  defaultZoom={13}
  gestureHandling="greedy"
>
  <AdvancedMarker position={clinicLocation} title={clinicName}>
    <div className="clinic-marker-badge">{clinicName}</div>
  </AdvancedMarker>
  <AdvancedMarker position={origin.location} title={origin.label}>
    <Pin background="#1d4ed8" borderColor="#1e3a8a" glyphColor="#ffffff" glyphText="A" />
  </AdvancedMarker>
</Map>
```

---

## Setup & Local Run

### 1. Obtain a Google Maps Platform API Key

For zero-billing prototyping, mint a **Maps Demo Key**:
1. Open the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing setup or Cloud project required).
3. Accept the Maps Demo Project Terms and generate your key.

For production deployments, create and restrict an API key in the [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) with the **Maps JavaScript API**, **Places API (New)**, and **Routes API** enabled, and follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and set your key:

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build & Start

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

## Documentation & Compliance Links

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Overview](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Overview](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Stack Implementations

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
