# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)

Built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`** (`APIProvider`, `Map`, `AdvancedMarker`, `Pin`), **`PlaceAutocompleteElement`** (`gmp-select`), **`Geocoder`**, **`ImageMapType`**, and secure **`/api/*` Route Handlers** (`X-Goog-Api-Key` + `X-Goog-FieldMask`) for **Places API (New)**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.

---

## Features

- **Pre-Seeded in Downtown Phoenix (Phoenix City Hall):** Immediately resolves `33.4484, -112.0740` and loads live environmental telemetry on mount.
- **Places Autocomplete (`PlaceAutocompleteElement`):** Imperatively mounted web component listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Click-Any-Building Inspection:** Click anywhere on the interactive 2D Vector Map (`mapId="DEMO_MAP_ID"`) to reverse-geocode coordinates via `Geocoder` and fetch hyperlocal conditions.
- **Weather & 5-Day Forecast:** Current temperature, feels-like, humidity, UV index, wind speed/direction, cloud cover, and 5-day outlook (`IMPERIAL` / `METRIC` toggle).
- **Air Quality Index & Optional Tile Overlay:** Real-time local/universal AQI score, dominant pollutant, pollutant concentrations, health recommendations, plus a WebGL-free `google.maps.ImageMapType` `US_AQI` heatmap tile toggle.
- **Pollen & Allergens:** Daily Tree, Grass, and Weed Universal Pollen Index (UPI) bars, in-season plant species, and allergy guidance.
- **Rooftop Solar Insights:** Max solar panel capacity, estimated array kW, annual sunshine hours, modeled roof area, CO₂ offset potential, and building bounding-box highlight on the map (with graceful non-coverage fallback when no modeled building is within 50m).

---

## Quick Start

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping)
1. Visit the [Google Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Generate and copy your demo key.

#### Option B: Google Cloud Project (Production)
1. Open the [Google Cloud Console Maps APIs Library](https://console.cloud.google.com/google/maps-apis/api-list?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable:
   - [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Air Quality API](https://developers.google.com/maps/documentation/air-quality/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Pollen API](https://developers.google.com/maps/documentation/pollen/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
   - [Solar API](https://developers.google.com/maps/documentation/solar/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
2. Follow [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to configure HTTP referrer restrictions for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and IP restrictions for `GOOGLE_MAPS_API_KEY`.

### 2. Configure `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

---

## Architecture Summary

1. **Client Mapping Layer (`components/EnvironmentalMap.tsx`, `components/PlaceAutocompleteControl.tsx`):**
   - Uses `@vis.gl/react-google-maps` (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`) with `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}`.
   - Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` and handles `gmp-select`.
   - Uses `google.maps.ImageMapType` for raster AQI heatmap tiles and `google.maps.Rectangle` for Solar API building footprints.
2. **Backend-for-Frontend Route Handlers (`app/api/*`):**
   - `/api/weather/current` → `weather.googleapis.com/v1/currentConditions:lookup`
   - `/api/weather/forecast` → `weather.googleapis.com/v1/forecast/days:lookup`
   - `/api/air-quality/current` → `airquality.googleapis.com/v1/currentConditions:lookup`
   - `/api/air-quality/tiles` → `airquality.googleapis.com/v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}`
   - `/api/pollen/forecast` → `pollen.googleapis.com/v1/forecast:lookup`
   - `/api/solar/building-insights` → `solar.googleapis.com/v1/buildingInsights:findClosest`
   - `/api/places/search-text` → `places.googleapis.com/v1/places:searchText`

### Core Implementation Snippet

```tsx
<Map
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  defaultCenter={{ lat: 33.4484, lng: -112.074 }}
  defaultZoom={16}
  mapTypeId={mapType}
  gestureHandling="greedy"
  clickableIcons={false}
  onClick={handleMapClick}
>
  <AdvancedMarker position={{ lat: activeLocation.lat, lng: activeLocation.lng }}>
    <Pin background="#0f766e" borderColor="#134e4a" glyphColor="#ffffff" />
  </AdvancedMarker>
</Map>
```

---

## Related Stack Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
