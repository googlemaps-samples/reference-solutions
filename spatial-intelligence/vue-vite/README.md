# Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics — Vue 3 + Vite + TypeScript (`@googlemaps/js-api-loader` + Custom Elements)

Built with **Vue 3 + Vite + TypeScript**, using `@googlemaps/js-api-loader` (`setOptions` & `importLibrary`), modern Google Maps Platform classes (`Map`, `Data`, `AdvancedMarkerElement`, `PinElement`, `Place`, `PlaceAutocompleteElement`, `ElevationService`), WebGL-accelerated `deck.gl` (`GoogleMapsOverlay`, `ScatterplotLayer`, `HexagonLayer`), and interactive `terra-draw` (`TerraDrawGoogleMapsAdapter`).

---

## Architecture Summary

- **Google Maps Platform Initialization:** Uses `@googlemaps/js-api-loader` v2 functional API (`setOptions` + `importLibrary('core' | 'maps' | 'marker' | 'places' | 'elevation')`) with `mapId: 'DEMO_MAP_ID'` and `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` centered on New York City (`40.73061, -73.98661`).
- **Live Basemap Switcher:** Segmented header controls dynamically switch `map.setMapTypeId(...)` across `roadmap`, `satellite`, `hybrid`, and `terrain`.
- **GeoJSON Infrastructure Districts:** `map.data.addGeoJson()` renders 7 NYC infrastructure districts styled dynamically by capacity load percentage, with smooth `map.fitBounds()` zoom-to-bounds on click (either on the map polygon or in the sidebar directory).
- **High-Performance Deck.gl Overlay:** `GoogleMapsOverlay` renders ~2,400 NYC infrastructure sensor points with toggleable `ScatterplotLayer` and `HexagonLayer` modes, guarded by a WebGL2 capability check so headless or non-WebGL environments degrade gracefully with zero console errors.
- **Interactive Terra Draw Study-Zone Tool:** `TerraDraw` + `TerraDrawGoogleMapsAdapter` provides polygon drawing, vertex editing (`Select / Edit`), and zone clearing, running client-side point-in-polygon spatial filtering, geodesic area ($km^2$) calculation, capacity KPI aggregation, and automatic terrain elevation profiling.
- **Live Places API (New) & Elevation API:**
  - `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`, treated natively by Vue via `isCustomElement`) listens to `gmp-select` and places an `AdvancedMarkerElement` with `PinElement`.
  - `Place.searchByText` loads live NYC civic transit hubs rendered as numbered `AdvancedMarkerElement` pins.
  - `ElevationService.getElevationForLocations` samples real surface elevation (min/mean/max meters and resolution) for the active study zone.

### Core Implementation Snippet

```typescript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'en', region: 'US' });

const [{ Map }, { Place, PlaceAutocompleteElement }, { ElevationService }] = await Promise.all([
  importLibrary('maps'),
  importLibrary('places'),
  importLibrary('elevation'),
]);

const map = new Map(mapContainer, {
  center: { lat: 40.73061, lng: -73.98661 },
  zoom: 12,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

---

## Quickstart & API Key Setup

### Option 1: Free Prototyping with Maps Demo Key (No Billing Required)

1. Open the [Maps Demo Key Portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your demo key.
4. Create `.env.local` in this directory and paste your key:
   ```bash
   cp .env.example .env.local
   ```
   Set `VITE_GOOGLE_MAPS_API_KEY=<your_key>` inside `.env.local`.

### Option 2: Production Google Cloud API Key

1. Provision an API key in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Elevation API**.
3. Restrict your key by HTTP referrer and allowed APIs following [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

> **Note:** Usage of Google Maps Platform APIs in production may incur charges against your Google Cloud billing account. See [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript?utm_campaign=gmp_git_agentsamples_v1.0.0).

---

## Local Development & Verification

```bash
npm install --no-audit --no-fund
npx vue-tsc --noEmit
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

---

## Other Stack Implementations

- [`static-vanilla-js`](../static-vanilla-js/)
- [`react-vite`](../react-vite/)
- [`nextjs`](../nextjs/)
- [`sveltekit`](../sveltekit/)
- [`vue-vite`](../vue-vite/) *(current implementation)*
- [`angular`](../angular/)
- [`python-fastapi`](../python-fastapi/)
- [`nodejs-web`](../nodejs-web/)

<!-- BEGIN GMP-COMPLIANCE-NOTICE -->
---

## Google Maps Platform Compliance & Licensing Notice

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Elevation API (REST)** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
