# Node.js + Express + TypeScript Backend + Interactive Web Frontend — Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router (`AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, `deck.gl HeatmapLayer`, `Routes API v2`, `Places API New`)

A full-stack, zero-deprecation civic flood/storm hazard monitor, citizen incident reporter, and flood-bypass safe shelter evacuation portal centered in Miami, FL (`25.7743, -80.1937`).

Built with a typed **Node.js + Express + TypeScript** Backend-for-Frontend (`src/server.ts`) and a modular interactive web frontend (`public/index.html`, `public/app.js`, `public/styles.css`) powered by modern Google Maps Platform APIs and `deck.gl`.

---

## Key Capabilities

- **Interactive Vector Map + `deck.gl` `HeatmapLayer` (`GoogleMapsOverlay`):** Renders high-density Miami storm and flooding incident reports using `@deck.gl/aggregation-layers` (`HeatmapLayer`) composited onto `google.maps.Map` (`mapId: "DEMO_MAP_ID"`, `internalUsageAttributionIds: ["gmp_git_agentsamples_v1.0.0"]`), with an automatic 2D Canvas `OverlayView` fallback when WebGL2 is unavailable in headless environments.
- **Active Flood-Hazard Zone Polygons:** Displays semi-transparent coastal and riverfront surge polygons (`google.maps.Polygon`) with interactive `InfoWindow` advisories and layer visibility toggles.
- **Click-to-Enrich Civic Incident Reporter:** Clicking anywhere on the map (or jumping via `PlaceAutocompleteElement` `gmp-select`) drops an `AdvancedMarkerElement` with a `PinElement` and runs parallel BFF lookups:
  - **Reverse Geocoding:** `GET /api/geocode/reverse` → [Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - **Terrain Elevation:** `GET /api/elevation` → [Elevation API](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - **Live Storm Telemetry:** `GET /api/weather/current` → [Weather API](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`v1/currentConditions:lookup`)
  - Submitting a hazard report dynamically appends the weighted incident into the `deck.gl` `HeatmapLayer`.
- **Emergency Shelter Discovery (`Places API New`):** Queries nearby hospitals and community centers via `POST /api/places/search` (`places.googleapis.com/v1/places:searchText` with explicit `X-Goog-FieldMask`), rendering numbered `PinElement` `AdvancedMarkerElement` pins and selectable cards.
- **Flood-Zone-Bypass Evacuation Routing (`Routes API v2`):** Computes evacuation corridors via `POST /api/routes/compute` (`routes.googleapis.com/directions/v2:computeRoutes` with explicit `X-Goog-FieldMask`), decodes the polyline via `google.maps.geometry.encoding.decodePath`, checks flood-polygon intersections with `google.maps.geometry.poly.containsLocation`, and automatically injects safe perimeter `via: true` waypoints to bypass active flood basins.

---

## Setup & Local Execution

### 1. Obtain a Google Maps Platform API Key

**Fastest Prototyping Path — Maps Demo Key (No billing account or Cloud project setup required):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account.
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your Demo Key and copy it.
5. *(Note: The Maps Demo Key has daily quota limits, is for prototyping only, and supports core APIs such as Maps JS, Places, Routes, Geocoding, and Weather. For Elevation API and production traffic, use a standard Google Cloud key.)*

**Production Path — Google Cloud Console:**
1. Create an API key in [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, **Geocoding API**, **Elevation API**, and **Weather API**.
3. Restrict your key by HTTP referrer / server IP and specific APIs following [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=your_key_here

npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

---

## Architecture Summary & Core Implementation Snippet

- **`src/server.ts` (Express + TypeScript BFF):**
  - Binds strictly to `127.0.0.1`, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`, and validates incoming payloads.
  - Proxies `/api/places/search`, `/api/routes/compute`, `/api/geocode/reverse`, `/api/elevation`, and `/api/weather/current` with `X-Goog-Api-Key` and cost-controlling `X-Goog-FieldMask` headers.
- **`public/app.js` (Zero-Deprecation Maps JS Client):**
  - Uses `google.maps.importLibrary(...)` (`core`, `maps`, `marker`, `places`, `geometry`), `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement` (`gmp-select`), `deck.gl` `HeatmapLayer` (`GoogleMapsOverlay`), and DOM-safe `createElement`/`textContent` rendering (zero `innerHTML`).

```ts
// Core BFF Routes API v2 proxy with via-waypoint support and explicit X-Goog-FieldMask
const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask':
      'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters',
  },
  body: JSON.stringify(requestPayload),
});
```

---

## Related Standalone Samples

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/) *(current implementation)*

---

## Terms of Service & Licensing

- Usage of Google Maps Platform APIs may incur charges against your Google Cloud billing account in production.
- Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps JS API Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0).

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
