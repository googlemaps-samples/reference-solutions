# Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`AdvancedMarkerElement`, `PlaceAutocompleteElement`, `ImageMapType`, `Geocoder`)

A standalone full-stack hyperlocal environmental intelligence and rooftop sustainability dashboard pre-seeded in Downtown Phoenix (**Phoenix City Hall**). Users can search any address or city with `PlaceAutocompleteElement` or click any building on the interactive 2D Google Map (`AdvancedMarkerElement` + `PinElement` + `Geocoder`) to inspect live conditions across Google Maps Platform's Environment and Places APIs.

## Modern Google Maps Platform Stack

- **Maps JavaScript API (Dynamic Library Import)**: `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`), `AdvancedMarkerElement`, `PinElement`, `ImageMapType` (for WebGL-free `US_AQI` heatmap tile overlays), `Rectangle` (rooftop bounding box), and `Geocoder`.
- **Places API (New)**: `PlaceAutocompleteElement` (`gmp-select` + `event.placePrediction.toPlace().fetchFields()`) on the client, plus server-side [`places:searchText`](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0) with explicit `X-Goog-FieldMask`.
- **Weather API**: [`currentConditions:lookup`](https://developers.google.com/maps/documentation/weather/reference/rest/v1/currentConditions/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) and [`forecast/days:lookup`](https://developers.google.com/maps/documentation/weather/reference/rest/v1/forecast.days/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) (5-day daily forecast, Imperial/Metric units toggle).
- **Air Quality API**: [`currentConditions:lookup`](https://developers.google.com/maps/documentation/air-quality/reference/rest/v1/currentConditions/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) (US EPA & Universal AQI, pollutant concentrations, health recommendations) and [`mapTypes/US_AQI/heatmapTiles`](https://developers.google.com/maps/documentation/air-quality/heatmaps?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **Pollen API**: [`forecast:lookup`](https://developers.google.com/maps/documentation/pollen/reference/rest/v1/forecast/lookup?utm_campaign=gmp_git_agentsamples_v1.0.0) (Tree, Grass, and Weed Universal Pollen Index, seasonality, active plant allergens, and health guidance).
- **Solar API**: [`buildingInsights:findClosest`](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest?utm_campaign=gmp_git_agentsamples_v1.0.0) (max panel count, DC array kW, annual sunshine hours, roof area, carbon offset factor, and graceful 404 non-coverage fallback).

## Prerequisites & Setup

### 1. Obtain an API Key

**Option A — Zero-Billing Prototyping (Maps Demo Key):**
1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card required) and accept the Maps Demo Project Terms.
3. Generate and copy your demo key. *(Note: Maps Demo Keys have a daily quota and cover core APIs such as Maps JS, Places, Geocoding, and Weather; for Air Quality, Pollen, and Solar APIs or production traffic, use a Google Cloud project key.)*

**Option B — Production Google Cloud Key:**
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, **Weather API**, **Air Quality API**, **Pollen API**, and **Solar API**.
3. Follow the [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict API Keys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0) guides to restrict your key by HTTP referrer (for Maps JS) and IP address / API allowlist (for server-side requests).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Architecture Summary

The application uses a strict Backend-for-Frontend (BFF) pattern:

- **`src/server.ts` (`dist/server.js`)**: Express + TypeScript server bound strictly to `127.0.0.1` with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` security headers. Validates all incoming coordinates, units, map tile parameters, and search queries before forwarding requests to Google Maps Platform REST endpoints with `X-Goog-Api-Key` and `X-Goog-FieldMask` headers:
  - `GET /api/weather/current`
  - `GET /api/weather/forecast`
  - `POST /api/air-quality/current`
  - `GET /api/air-quality/tiles`
  - `GET /api/pollen/forecast`
  - `GET /api/solar/building-insights`
  - `POST /api/places/search-text`
- **`public/index.html`, `public/styles.css`, `public/app.js`**: Responsive split-screen web frontend using zero `innerHTML` assignments (`document.createElement` + `replaceChildren` only) and modern Maps JS dynamic library imports.

### Core Implementation Snippet

```ts
// src/server.ts — Validated Solar API Building Insights BFF proxy with graceful 404 handling
app.get('/api/solar/building-insights', async (req: Request, res: Response) => {
  const coords = parseCoordinatePair(req.query.lat, req.query.lng);
  if (!coords) {
    res.status(400).json({ error: 'Valid lat [-90..90] and lng [-180..180] query params are required.' });
    return;
  }

  const upstreamUrl = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('requiredQuality', 'MEDIUM');

  const result = await fetchJsonUpstream(upstreamUrl.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask':
        'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential',
    },
  });

  if (result.status === 404) {
    res.status(404).json({
      coverageAvailable: false,
      code: 'NOT_FOUND',
      message: 'No building solar insights found within 50m of these coordinates.',
    });
    return;
  }
  res.status(result.status).json(result.data);
});
```

## Terms of Service & Attribution

Use of Google Maps Platform APIs in this project is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [Maps Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Acceptable Use Policy](https://cloud.google.com/maps-platform/terms/aup?utm_campaign=gmp_git_agentsamples_v1.0.0). Utilizing Google Maps Platform services may incur charges against your Google Cloud billing account when using a production key.

## All Framework Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Air Quality API, Pollen API, Solar API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
