# SvelteKit + TypeScript (`@googlemaps/js-api-loader` + Native Web Components): Field Workforce Geofenced Attendance & Site Audit Router

Built with **SvelteKit**, **TypeScript**, **`@googlemaps/js-api-loader` (v2 functional API)**, **Terra Draw (`terra-draw` + `terra-draw-google-maps-adapter`)**, and modern Google Maps Platform services: `google.maps.Map` (`DEMO_MAP_ID`), `AdvancedMarkerElement`, `PinElement`, `google.maps.geometry.poly.containsLocation`, **Places API (New)** (`places:searchText` / `Place.searchByText`), **Routes API (v2)** (`directions/v2:computeRoutes` / `Route.computeRoutes` with `optimizeWaypointOrder: true`), and **Geocoding API (v4)** (`geocode/location` / `Geocoder`).

---

## Features

- **Austin Geofenced Workforce Attendance**: Displays 3 pre-seeded Austin commercial district geofence polygons (`Downtown Congress Corridor`, `Mueller Retail District`, `South Lamar Commercial Zone`) and evaluates simulated worker GPS coordinates (inside vs. outside presets) using `google.maps.geometry.poly.containsLocation`.
- **Interactive Supervisor Polygon Drawing (Terra Draw)**: Floating map toolbar and synced sidebar controls (`Draw Polygon`, `Select / Edit`, `Clear Drawn`) powered by `TerraDraw` and `TerraDrawGoogleMapsAdapter` so supervisors can draw/edit new geofence polygons that immediately participate in worker clock-in verification.
- **Reverse-Geocoded Worker Street Address**: Resolves simulated worker latitude/longitude coordinates into a human-readable Austin street address via the SvelteKit BFF proxy `GET /api/geocode/reverse` (Geocoding API v4) with automatic Maps JS `Geocoder` fallback.
- **Multi-Stop Store Audit Router**: Discovers live Austin retail audit sites via `POST /api/places/search` (Places API New Text Search), computes an optimized multi-stop driving itinerary via `POST /api/routes/compute` (Routes API v2 with `optimizeWaypointOrder: true` and `TRAFFIC_AWARE`), renders numbered `AdvancedMarkerElement` + `PinElement` pins with interactive `InfoWindow` popups, and draws the decoded driving route polyline.

---

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

#### Option A: Free Zero-Billing Maps Demo Key (Prototyping Only)
1. Open the [Maps Demo Key Quickstart](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Google Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Generate/reveal your Demo Key. *(Note: The Demo Key has a daily quota limit and is not for production usage.)*

#### Option B: Standard Google Cloud API Key (Production)
1. Create an API key in the [Google Cloud Console Credentials](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) page.
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**.
3. Follow [API Key Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Restrict an API Key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Billing Notice:** Usage of Google Maps Platform products and services in production may incur costs against your Google Cloud billing account.

### 2. Configure Environment & Run

```bash
cp .env.example .env
# Edit .env and set PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>

npm install --no-audit --no-fund
npm run check
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

---

## Architecture Summary

- **SSR-Safe Client Initialization (`src/routes/+page.svelte`)**: All Google Maps JS SDK loading and DOM interactions are guarded inside Svelte's `onMount` lifecycle using `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) and `$env/dynamic/public` (`env.PUBLIC_GOOGLE_MAPS_API_KEY`).
- **BFF API Proxy Endpoints (`src/routes/api/...`)**:
  - `POST /api/places/search` → `https://places.googleapis.com/v1/places:searchText`
  - `POST /api/routes/compute` → `https://routes.googleapis.com/directions/v2:computeRoutes` (`optimizeWaypointOrder: true`, `TRAFFIC_AWARE`)
  - `GET /api/geocode/reverse` → `https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}`
- **Security Headers (`src/hooks.server.ts`)**: Sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` on every response, and binds Vite dev/preview servers strictly to `127.0.0.1`.

### Core Map & Terra Draw Initialization Snippet

```ts
setOptions({ key: apiKey, v: 'weekly' });

const [mapsLib, markerLib, placesLib, routesLib, geocodingLib, geometryLib] =
	await Promise.all([
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes'),
		importLibrary('geocoding'),
		importLibrary('geometry')
	]);

const map = new mapsLib.Map(mapContainerEl, {
	center: { lat: 30.2672, lng: -97.7431 },
	zoom: 12,
	mapId: 'DEMO_MAP_ID',
	internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']
});

const terraDraw = new TerraDraw({
	adapter: new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 }),
	modes: [new TerraDrawSelectMode({ /* ... */ }), new TerraDrawPolygonMode({ editable: true })]
});
terraDraw.start();
```

---

## References & Documentation

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps JS API](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Waypoint Optimization](https://developers.google.com/maps/documentation/routes/opt-way?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API v4 Reverse Geocoding](https://developers.google.com/maps/documentation/geocoding/reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

---

## Other Framework Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/) *(current implementation)*
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
