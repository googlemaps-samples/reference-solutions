# Single-Venue Storefront, Booking & Get Directions Hub — Angular Standalone Components + TypeScript (`@angular/google-maps`) using `AdvancedMarkerElement`, `Place.searchByText`, `PlaceAutocompleteElement`, `Route.computeRoutes`, and `StreetViewPanorama`

A responsive, modern dental clinic storefront, live directions planner, and appointment-booking web application for **450 Sutter Dental** in San Francisco, built with **Angular Standalone Components**, **TypeScript**, **`@angular/google-maps`**, and **`@googlemaps/js-api-loader` v2** (`setOptions` + `importLibrary`).

## Features

- **Interactive Map (`GoogleMap` + `MapAdvancedMarker`)**: Renders a vector Google Map (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) centered on the clinic with custom DOM-built Advanced Marker pins for the clinic and visitor origin.
- **3.5 km Home-Visit Service Area (`MapCircle`)**: Toggleable coverage-radius circle overlay showing the clinic's San Francisco home-visit zone.
- **Synchronized Street View Entrance Preview (`StreetViewService` + `StreetViewPanorama`)**: Switch between **Map**, **Split**, and **Street View** modes to inspect the building entrance with heading computed toward the venue via `geometry.spherical.computeHeading`.
- **Live Venue Details & Reviews (`Place.searchByText`)**: Fetches live clinic name, address, phone number, website, star rating, review count, weekly hours, deterministic open-now status, photos (`Photo.getURI`), and patient reviews from Places API (New).
- **Origin Autocomplete & Multi-Modal Routing (`PlaceAutocompleteElement` + `Route.computeRoutes`)**: Pre-seeded with `Ferry Building, San Francisco, CA`, supports live San Francisco address selection via the `gmp-select` event, and draws Driving, Public Transit, and Walking route polylines with live travel time and distance.
- **Appointment Booking Form**: Lets visitors schedule In-Clinic or Home-Visit dental consultations (handling scheduling metadata only; no PHI is sent to Google Maps Platform APIs).

## Quickstart

### 1. Obtain a Google Maps Platform API Key

**Fastest Prototyping Option (Free Maps Demo Key — No Billing Setup Required):**
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card requested).
3. Accept the Maps Demo Project Terms and generate/copy your key.

**Production Option (Google Cloud Console):**
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Street View**.
3. Restrict the key by HTTP referrer and API scope following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
npx tsc --noEmit && node --check serve-dist.mjs
npm run build
node serve-dist.mjs --host 127.0.0.1 --port 4200
```

Open `http://127.0.0.1:4200` in your browser.

## Architecture Summary

- **Runtime Key Injection (`serve-dist.mjs`)**: Binds strictly to `127.0.0.1`, serves Angular's production `dist/sf-dental-storefront/browser` bundle with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`), and exposes `/env-config.js` reading `process.env.GOOGLE_MAPS_API_KEY` from `.env` so API keys are never bundled into source files.
- **Loader & Services (`src/app/services/google-maps.service.ts`)**: Uses `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) to load `core`, `maps`, `marker`, `places`, `routes`, `streetView`, and `geometry` before mounting `<google-map>`.
- **Standalone Components**:
  - `ClinicHeaderComponent`: Clinic title, live Open/Closed pill, 3.5 km zone toggle, and Map/Split/Street View controls.
  - `VenueDetailsComponent`: Live Google Places venue profile, photo strip, collapsible weekly hours, and patient reviews.
  - `DirectionsPlannerComponent`: Hosts `<gmp-place-autocomplete>` (`CUSTOM_ELEMENTS_SCHEMA`) listening to `gmp-select`, Driving/Transit/Walking selectors, and live route ETA/distance card.
  - `BookingFormComponent`: Specialty and In-Clinic/Home-Visit appointment request workflow.
  - `ClinicMapComponent`: Wraps `@angular/google-maps` `GoogleMap`, `MapAdvancedMarker`, `MapCircle`, `MapPolyline`, `MapInfoWindow`, and synchronized `StreetViewPanorama`.

### Core Implementation Snippet

```ts
setOptions({
  key: apiKey,
  v: 'weekly',
  language: 'en',
  region: 'US',
  mapIds: ['DEMO_MAP_ID'],
});

const [{ Place }, { Route }] = await Promise.all([
  importLibrary('places'),
  importLibrary('routes'),
]);

const { places } = await Place.searchByText({
  textQuery: '450 Sutter Dental San Francisco',
  fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'regularOpeningHours', 'reviews', 'photos'],
  locationBias: { center: { lat: 37.7896, lng: -122.4076 }, radius: 5000 },
  maxResultCount: 1,
});

const { routes } = await Route.computeRoutes({
  origin,
  destination,
  travelMode: google.maps.TravelMode.DRIVING,
  fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'path', 'viewport'],
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Documentation & Compliance References

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Web JS Overview](https://developers.google.com/maps/documentation/javascript/place?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes Library in Maps JS API](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/) *(current implementation)*
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
