# React + Vite + TypeScript (`@vis.gl/react-google-maps`) — `AdvancedMarkerElement`, `Place.searchByText`, `PlaceAutocompleteElement`, `Route.computeRoutes` & `StreetViewPanorama` — Single-Venue Storefront, Booking & Get Directions Hub

A standalone, modern appointment-booking, storefront, and multimodal directions hub for a multi-specialty dental clinic in San Francisco, built with **React 19**, **Vite**, **TypeScript**, and the official **`@vis.gl/react-google-maps`** SDK.

## Architecture Summary

All Google Maps Platform requests are executed natively through the Maps JavaScript SDK libraries loaded via `<APIProvider>` (avoiding client-side CORS failures and deprecated callback services):

- **Interactive 2D Map & Coverage Overlay (`maps` + `marker`):** Renders `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` with custom branded `<AdvancedMarker>` pins (`AdvancedMarkerElement`), interactive `<InfoWindow>` popups, and a toggleable 5,000 m `google.maps.Circle` home-visit coverage radius overlay.
- **Live Storefront & Reviews (`places`):** Queries `Place.searchByText()` on load for a San Francisco dental clinic (`displayName`, `formattedAddress`, `location`, `rating`, `userRatingCount`, `regularOpeningHours`, `nationalPhoneNumber`, `websiteURI`, `photos`, `reviews`, `googleMapsURI`) and evaluates open/closed status cleanly from `regularOpeningHours.periods`.
- **Origin Autocomplete (`places`):** Imperatively mounts `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) via `useRef` + `useEffect`, pre-seeded on load with `Ferry Building, San Francisco, CA`, listening to the modern `gmp-select` event (`placePrediction.toPlace().fetchFields(...)`).
- **Multimodal Directions (`routes` + `core`):** Computes live **Driving**, **Transit**, and **Walking** routes via `Route.computeRoutes()`, drawing color-coded route polylines (`route.createPolylines()`), fitting map bounds (`LatLngBounds`), and displaying live travel duration and distance.
- **Street View Entrance Preview (`streetView` + `geometry`):** Synchronized `StreetViewService.getPanorama()` + `StreetViewPanorama` split-view panel oriented toward the clinic entrance using `geometry.spherical.computeHeading()`.
- **Appointment Booking:** Specialty selector, In-Clinic vs. Home Visit (5 km radius eligibility check) toggle, date/time slot picker, and instant confirmation banner.

### Core Implementation Snippet

```tsx
// Imperative PlaceAutocompleteElement mount + gmp-select listener (no JSX prop stringification)
const autocompleteEl = new placesLib.PlaceAutocompleteElement();
autocompleteEl.setAttribute('internal-usage-attribution-ids', 'gmp_git_agentsamples_v1.0.0');
autocompleteEl.includedRegionCodes = ['us'];
autocompleteEl.locationBias = { center: DEFAULT_SF_CENTER, radius: 15000 };

autocompleteEl.addEventListener('gmp-select', async (rawEvent: Event) => {
  const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
  const place = event.placePrediction.toPlace();
  await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
  // Update origin marker & recompute Route.computeRoutes(...)
});
```

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Zero-Billing Maps Demo Key (Prototyping Only):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and generate/reveal your key.
4. Note: Demo keys have a daily reset limit and are not for production use.

**Option B — Production Google Cloud API Key:**
1. Create a key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Restrict the key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Install, Typecheck, Build, and Preview

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For local hot-reloading development:

```bash
npm run dev
```

## Google Maps Platform Documentation

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) — Place Class & PlaceAutocompleteElement](https://developers.google.com/maps/documentation/javascript/place-class?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API — Route Class](https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Street View Service](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Standalone Samples

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
