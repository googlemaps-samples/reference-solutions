# Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules) — Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub

An interactive multi-day city trip planner, hotel & attraction discovery hub, and destination time zone clock built with **Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)** and modern Google Maps Platform libraries (`Map`, `AdvancedMarkerElement`, `PinElement`, `Place`, `PlaceAutocompleteElement`, `Route.computeRoutes`, `StreetViewPanorama`, `StreetViewService`, and the **Time Zone API**).

## Features

- **Pre-Seeded Live Tokyo Experience**: On load, queries `Place.searchByText` (Places API New) for top Tokyo attractions and hotels, populating **Day 1** and **Day 2** itinerary tabs with live ratings, review counts, photos, and `regularOpeningHours` summaries.
- **Destination Search & Quick Presets**: Uses `PlaceAutocompleteElement` (`gmp-select` + `placePrediction.toPlace()` + `place.fetchFields()`) alongside a quick city selector (Tokyo, Kyoto, London, New York, Paris, Sydney).
- **Live Time Zone Hub**: Proxies `maps.googleapis.com/maps/api/timezone/json` via `/api/timezone` on the local Node server (with graceful `Place.timeZone` / `Place.utcOffsetMinutes` fallback) to display a ticking destination clock, IANA time zone name, and UTC offset.
- **Numbered Day-Colored Markers & Multi-Stop Routes**: Renders `AdvancedMarkerElement` pins with `PinElement({ glyphText })` colored by day (Day 1 Teal `#0F766E`, Day 2 Amber `#D97706`) and computes multi-stop route polylines, leg distances/durations, and waypoint optimization (`optimizeWaypointOrder: true`) via `Route.computeRoutes` across `DRIVING`, `WALKING`, and `TRANSIT` modes.
- **Docked Street View Preview Panel**: Inspects any landmark or hotel using `StreetViewService.getPanorama` and `StreetViewPanorama`.

## Google Maps Platform APIs & Libraries Used

- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`Map`, `InfoWindow`, `AdvancedMarkerElement`, `PinElement`, `StreetViewPanorama`, `StreetViewService`)
- [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`Place.searchByText`, `Place.searchNearby`, `PlaceAutocompleteElement`, `Place.fetchFields`, `PlacePhoto.getURI`)
- [Routes API](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`Route.computeRoutes`, `route.createPolylines`)
- [Time Zone API](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`maps.googleapis.com/maps/api/timezone/json` via `/api/timezone`)
- [Street View Service](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0)

> **Billing & Cost Notice:** Utilizing Google Maps Platform services may incur costs against your Google Cloud billing account when moving to production. For zero-cost prototyping without billing setup, use the **Maps Demo Key** below (subject to daily quota limits).

## Setup & Running Locally

### 1. Obtain a Google Maps Platform API Key

**Option A — Free Maps Demo Key (Prototyping, No Billing Required):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Click to generate and copy your demo key.

**Option B — Production Google Cloud Key:**
1. Create credentials in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Time Zone API**.
3. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) to restrict your key by HTTP referrer/IP and designated APIs.

### 2. Configure Environment & Install

```bash
cp .env.example .env
# Edit .env and set GOOGLE_MAPS_API_KEY=<your-key>

npm install --no-audit --no-fund
node --check app.js && node --check server.mjs
npm run build
```

### 3. Start the Server

```bash
node server.mjs --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser. The server binds strictly to `127.0.0.1` and injects runtime configuration safely via `/env-config.js` without hardcoding credentials in client files.

## Architecture & Core Implementation

- [`server.mjs`](./server.mjs): Zero-dependency Node HTTP server bound to `127.0.0.1`, serving static ES modules safely (preventing path traversal and dotfile exposure), `/env-config.js` (`window.__GMP_CONFIG__`), and `/api/timezone` (proxying the Time Zone REST API).
- [`index.html`](./index.html) & [`styles.css`](./styles.css): Split-screen responsive layout using an `<script type="importmap">` for `@googlemaps/js-api-loader` v2.
- [`app.js`](./app.js): Pure DOM-safe Vanilla ES module (using `document.createElement`, `textContent`, and `replaceChildren` exclusively) implementing live Places discovery, Day 1/Day 2 itinerary management, multi-stop `Route.computeRoutes`, numbered `AdvancedMarkerElement` pins, and `StreetViewPanorama`.

```javascript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

setOptions({ key: window.__GMP_CONFIG__.apiKey, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { AdvancedMarkerElement, PinElement }, { Place }, { Route }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('marker'),
  importLibrary('places'),
  importLibrary('routes'),
]);

const map = new Map(document.getElementById('map-container'), {
  center: { lat: 35.6812, lng: 139.7671 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Related Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/) *(current implementation)*
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/)
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Time Zone API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
