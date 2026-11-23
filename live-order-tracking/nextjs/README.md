# On-Demand Delivery Checkout, Zone Validation & Live Tracker — Next.js App Router + TypeScript (`@vis.gl/react-google-maps` + Route Handlers)

End-to-end Chicago restaurant & grocery delivery checkout and live order-tracking sample built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`**, and modern Google Maps Platform APIs: **`AdvancedMarkerElement` (`<AdvancedMarker>`)**, **`PlaceAutocompleteElement` (`gmp-select`)**, **`Address Validation API` (`v1:validateAddress`)**, **`Routes API v2` (`directions/v2:computeRoutes`)**, **`Maps Geometry Library` (`containsLocation`)**, and **`Maps Static API`**.

## Architecture Overview

- **Fulton Market Kitchen Hub (`41.8868, -87.6486`):** Anchors all zone checks, route calculations, and live courier dispatches.
- **Checkout Autocomplete (`PlaceAutocompleteElement`):** Imperatively mounted in React via `useRef` + `useEffect` (`useMapsLibrary('places')`), listening to `gmp-select` and calling `event.placePrediction.toPlace().fetchFields(...)`.
- **Server-Side BFF Route Handlers (`src/app/api/*`):**
  - `POST /api/address/validate`: Proxies [Address Validation API](https://developers.google.com/maps/documentation/address-validation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) (`v1:validateAddress` with `enableUspsCass: true`), keeping `X-Goog-Api-Key` on the server and returning `verdict`, `address`, `geocode`, `metadata`, and `uspsData`.
  - `POST /api/routes/compute`: Proxies [Routes API v2](https://developers.google.com/maps/documentation/routes/compute_route_directions?utm_campaign=gmp_git_agentsamples_v1.0.0) (`computeRoutes` with `TRAFFIC_AWARE` and explicit `X-Goog-FieldMask`) to compute road distance, traffic-aware ETA, and encoded polyline.
  - `GET /api/maps/static-receipt`: Proxies [Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) to stream a route summary PNG image for the Order Receipt Card without exposing the server API key in client HTML.
- **Dual Delivery Eligibility:** Drop-off must be inside the Chicago delivery zone `<Polygon>` (checked via `google.maps.geometry.poly.containsLocation`) **and** within the **8.0 km** road-distance cap (`$2.99 <= 3 km`, `$4.99 <= 5.5 km`, `$6.99 <= 8 km`).
- **Live Courier Tracking:** Decodes the Routes API polyline and animates a custom courier `<AdvancedMarker>` smoothly along the path using `requestAnimationFrame`.

### Core Implementation Snippet (`<Map>` + `<AdvancedMarker>` + Attribution)

```tsx
<Map
  defaultCenter={{ lat: 41.8868, lng: -87.6486 }}
  defaultZoom={13}
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
  gestureHandling="greedy"
>
  <Polygon paths={[DELIVERY_ZONE_POLYGON]} />
  <Polyline path={routePath} />
  <AdvancedMarker position={KITCHEN_HUB.location}>
    <div className="marker-pin marker-kitchen">Fulton Kitchen</div>
  </AdvancedMarker>
  <AdvancedMarker position={courierPosition}>
    <div className="marker-courier">Courier</div>
  </AdvancedMarker>
</Map>
```

## Quickstart & API Key Setup

1. **Install dependencies:**
   ```bash
   npm install --no-audit --no-fund
   ```
2. **Configure your Google Maps Platform API key:**
   - **Prototyping (Maps Demo Key):** Visit [Google Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0), sign in with a Google account (no billing setup required), accept the Demo Terms, and copy your key.
   - **Production / Full API Coverage:** Create an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0) and enable **Maps JavaScript API**, **Places API (New)**, **Address Validation API**, **Routes API**, and **Maps Static API**. Follow [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0) and [API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
   - Copy `.env.example` to `.env.local` and set:
     ```bash
     cp .env.example .env.local
     ```
     Edit `.env.local` to set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (and optionally `GOOGLE_MAPS_API_KEY` for server-only IP-restricted BFF routes).
3. **Typecheck, build, and run on `127.0.0.1`:**
   ```bash
   npx tsc --noEmit
   npm run build
   npx next start --hostname 127.0.0.1 --port 3000
   ```
4. Open `http://127.0.0.1:3000` in your browser.

## Terms of Service & Licensing

- Usage of Google Maps Platform APIs may incur costs on your Google Cloud billing account.
- Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and regional terms.

## Standalone Samples Across Stacks

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Requires a billed Google Cloud key for **Address Validation API, Maps Static API** (a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) covers Maps JS/Places/Routes/Geocoding/Weather prototyping only).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
