# Hyperlocal Neighborhood Directory & Spot Mapper — React + Vite + TypeScript (`@vis.gl/react-google-maps`)

> Built with **React + Vite + TypeScript (`@vis.gl/react-google-maps`)** using modern Google Maps Platform SDK classes: `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `Place` (`searchNearby`, `fetchFields`), `Geocoder`, `InfoWindow`, and `Circle`.

A hyperlocal neighborhood discovery, side-by-side business comparison, and community spot-mapping web application pre-seeded in **Central London** (Covent Garden / West End at `51.5118, -0.1280`).

## Features

- **Interactive 2D Vector Map (`mapId: "DEMO_MAP_ID"`)**: Displays categorized, color-coded `<AdvancedMarker>` + `<Pin>` markers for nearby Restaurants, Cafes, Museums, and Parks within a toggleable **5 km (5,000 m)** search radius circle.
- **Address & Neighborhood Search (`PlaceAutocompleteElement` & `Geocoder`)**: Imperatively mounts `<gmp-place-autocomplete>` listening to `gmp-select` (`event.placePrediction.toPlace().fetchFields()`) alongside forward Geocoding and quick Central London neighborhood presets (Covent Garden, Soho, South Bank, Bloomsbury, Mayfair, Shoreditch).
- **Live Places API (New) Directory & Details Drawer**: Queries `Place.searchNearby` and `Place.fetchFields` for live ratings, review counts, price levels, `regularOpeningHours.weekdayDescriptions`, photos, and customer reviews—strictly compatible with the `weekly` channel (no beta-only `Place.isOpen()`).
- **Side-by-Side Comparison Panel**: Compare up to 3 venues simultaneously across rating, review volume, price level, distance, today's hours, street address, and review highlights.
- **Map-Click Reverse Geocoding & Community Spot Pinning**: Click anywhere on the map to reverse-geocode the street address, postcode, Plus Code, and coordinates via `Geocoder.geocode({ location })` and pin session-scoped Community Spots.

## Quickstart & Setup

### 1. Obtain a Google Maps Platform API Key

**Fastest Prototyping Option — Maps Demo Key (no billing card or GCP project required):**
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted.
4. Generate and copy your demo key (note: daily quota reset applies; for prototyping only).

**Production Option — Google Cloud Console:**
1. Create or select a project in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Restrict your API key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run Locally

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_MAPS_API_KEY=<your_api_key>

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

For hot-reloading development:

```bash
npm run dev
```

## Architecture Summary

This standalone client-side React + Vite application wraps the root tree in `<APIProvider>` from [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) with `language="en"`, `region="GB"`, and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}` on `<Map>`:

- **Zero-Deprecation SDK Usage**: Uses `Place.searchNearby` and `Place.fetchFields` from `useMapsLibrary('places')`, `Geocoder` from `useMapsLibrary('geocoding')`, and `<AdvancedMarker>` + `<Pin>` instead of legacy `Marker`, `PlacesService`, or `Autocomplete`.
- **Imperative Web Component Binding**: Mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` to bind object properties (`locationBias`, `internalUsageAttributionIds`) and `gmp-select` listeners directly to the DOM node.
- **Non-Blocking Radius Overlay**: Renders `<Circle clickable={false} />` so map clicks inside the 5 km radius pass cleanly to `<Map onClick>` for reverse geocoding.

### Core Implementation Snippet

```tsx
const placesLib = useMapsLibrary('places');

useEffect(() => {
  if (!placesLib) return;
  placesLib.Place.searchNearby({
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'priceLevel', 'regularOpeningHours'],
    locationRestriction: { center: searchCenter, radius: 5000 },
    includedPrimaryTypes: ['restaurant', 'cafe', 'museum', 'park'],
    maxResultCount: 20,
  }).then(({ places }) => {
    // Render categorized <AdvancedMarker><Pin ... /></AdvancedMarker> pins
  });
}, [placesLib, searchCenter]);
```

## Documentation & Terms

- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) JavaScript Documentation](https://developers.google.com/maps/documentation/javascript/place-class?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding Service Documentation](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Other Stack Implementations

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
