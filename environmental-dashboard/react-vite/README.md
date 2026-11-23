# React + Vite + TypeScript (`@vis.gl/react-google-maps`) — Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard (`AdvancedMarker`, `PlaceAutocompleteElement`, `Place`, `Geocoder`, `ImageMapType`)

A standalone React + Vite + TypeScript web application for hyperlocal environmental intelligence and rooftop solar sustainability analysis, pre-seeded in Downtown Phoenix (`Phoenix City Hall, Phoenix, AZ`). Users can search any address or city via `PlaceAutocompleteElement` or click any building on the interactive 2D Google Map to inspect real-time Weather, Air Quality, Pollen, and Rooftop Solar metrics.

## Modern Google Maps Platform APIs Used

- **[Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** via [`@vis.gl/react-google-maps`](https://visgl.github.io/react-google-maps/) (`<APIProvider>`, `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>`, `<AdvancedMarker>`, `<Pin>`, `ImageMapType` for WebGL-free `US_AQI` heatmap tiles, and `Rectangle` for Solar building bounds)
- **[Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`PlaceAutocompleteElement` listening to `gmp-select` + `placePrediction.toPlace().fetchFields()`, plus `Place.searchByText()` for pre-seeding Phoenix City Hall)
- **[Geocoding API (JS SDK)](https://developers.google.com/maps/documentation/javascript/geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`google.maps.Geocoder` for reverse geocoding clicked building coordinates)
- **[Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`currentConditions:lookup` and `forecast/days:lookup` with `IMPERIAL` / `METRIC` toggle)
- **[Air Quality API](https://developers.google.com/maps/documentation/air-quality/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`currentConditions:lookup` with pollutant concentrations & health recommendations, plus `mapTypes/US_AQI/heatmapTiles`)
- **[Pollen API](https://developers.google.com/maps/documentation/pollen/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`forecast:lookup` for Tree, Grass, and Weed UPI levels, active plant sources, and allergy advice)
- **[Solar API](https://developers.google.com/maps/documentation/solar/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)** (`buildingInsights:findClosest` for rooftop panel capacity, annual sunshine hours, roof area, and carbon offset factor with graceful 404 non-coverage handling)

## Quickstart & API Key Setup

### Option A: Zero-Billing Maps Demo Key (Prototyping)

1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with a Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms and generate your demo key.
4. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY`:
   ```bash
   cp .env.example .env.local
   ```
   > **Note:** The Maps Demo Key has daily quota limits, is for prototyping only, and covers a subset of APIs. To unlock all endpoints (Air Quality, Pollen, Solar, Weather, Places, Geocoding, Maps JS), use a Google Cloud project key.

### Option B: Google Cloud Production Key

1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable: **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.
3. Restrict the key by HTTP referrer and allowed APIs following [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).
4. Store the key in `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`.

## Local Development & Verification

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

## Architecture Summary

- **`src/App.tsx`**: Wraps the split-screen workspace in `<APIProvider>` (`libraries={['maps', 'marker', 'places', 'geocoding']}`), resolves the Phoenix City Hall seed dynamically via `Place.searchByText`, and coordinates the `IMPERIAL`/`METRIC` units toggle, `US_AQI` tile overlay toggle, and `roadmap`/`hybrid` base map switch.
- **`src/components/PlacesSearchInput.tsx`**: Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect`, listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **`src/components/EnvironmentalMap.tsx`**: Renders the `<Map mapId="DEMO_MAP_ID" internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}>` with `<AdvancedMarker>`, `Geocoder` click-to-inspect reverse geocoding, a WebGL-free `ImageMapType` overlay for `US_AQI` tiles, and a `Rectangle` highlight for the Solar API building bounding box.
- **`src/services/environmentalApi.ts` & `src/components/EnvironmentalSidebar.tsx`**: Fetches live Weather, Air Quality, Pollen, and Solar Building Insights via `Promise.all` with `AbortController` cancellation and graceful `404` non-coverage handling.

### Core Map & Autocomplete Integration Snippet

```tsx
const autocomplete = new placesLib.PlaceAutocompleteElement({
  requestedLanguage: 'en',
  requestedRegion: 'us',
});

autocomplete.addEventListener('gmp-select', async (event) => {
  const place = event.placePrediction.toPlace();
  await place.fetchFields({
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
  });
  // Update inspected coordinates & fetch Weather, Air Quality, Pollen, and Solar data
});
```

## Other Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
