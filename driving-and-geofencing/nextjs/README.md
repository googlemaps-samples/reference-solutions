# Field Workforce Geofenced Attendance & Site Audit Router — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)

An Austin, TX field workforce geofenced attendance check-in and multi-site store audit planning application built with **Next.js App Router**, **TypeScript**, **`@vis.gl/react-google-maps`** (`<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`, `<Polygon>`, `<Polyline>`), **Terra Draw** (`terra-draw` + `terra-draw-google-maps-adapter`), **Places API (New)** (`PlaceAutocompleteElement` + `places:searchText`), **Routes API (v2)** (`directions/v2:computeRoutes` with `optimizeWaypointOrder: true`), **Geocoding API (v4)** (`geocode/location`), and **`google.maps.geometry.poly.containsLocation`**.

## Key Capabilities

- **Geofenced Attendance Check-In (Austin, TX):** Renders 3 pre-seeded Austin client site polygons plus supervisor-drawn polygons, evaluates worker GPS presets (inside vs. outside active zones) via `google.maps.geometry.poly.containsLocation`, reverse-geocodes coordinates into a street address via `/api/geocode/reverse` (Geocoding API v4), and unlocks or locks the **Verified Clock-In** badge.
- **Interactive Geofence Drawing with Terra Draw:** Uses `terra-draw` and `terra-draw-google-maps-adapter` (replacing the deprecated `google.maps.drawing` library) so supervisors can draw, select, drag, and reshape custom polygon geofence zones directly on the map.
- **Live Audit Site Discovery & Multi-Stop Route Optimization:** Discovers live Austin retail audit sites via `/api/places/search` (Places API New Text Search) and imperative `PlaceAutocompleteElement` (`gmp-select`), then computes an optimal driving itinerary via `/api/routes/compute` (Routes API v2 `optimizeWaypointOrder: true`, `TRAFFIC_AWARE`) with numbered `<AdvancedMarker>` pins and an encoded polyline.
- **Zero-Deprecation & BFF Security:** All CORS-restricted Google Maps REST Web Services are proxied through Next.js App Router Route Handlers (`app/api/*`) using `X-Goog-Api-Key` and `X-Goog-FieldMask` headers, with `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` configured in `next.config.ts`.

## Architecture Overview

```text
src/
├── app/
│   ├── api/
│   │   ├── geocode/reverse/route.ts   # GET  /api/geocode/reverse -> Geocoding API v4
│   │   ├── places/search/route.ts     # POST /api/places/search   -> Places API (New) Text Search
│   │   └── routes/compute/route.ts    # POST /api/routes/compute  -> Routes API v2 (optimizeWaypointOrder)
│   ├── globals.css                    # Split-screen enterprise layout (>= 540px map height)
│   ├── layout.tsx
│   └── page.tsx                       # Server Component entry passing env config
├── components/
│   ├── AttendanceAuditWorkspace.tsx   # Client orchestrator + <APIProvider>
│   ├── GeofenceMapCanvas.tsx          # <Map mapId="DEMO_MAP_ID">, TerraDrawBridge, AdvancedMarkers
│   └── OperationsSidebar.tsx          # 3-card sidebar + imperative PlaceAutocompleteElement
├── data/
│   └── austinSeed.ts                  # Austin center, 3 seeded polygons, inside/outside GPS presets
├── lib/
│   └── geofence.ts                    # google.maps.geometry.poly.containsLocation helpers
└── types/
    └── geofencing.ts
```

### Core Implementation Snippet

```tsx
<Map
  defaultCenter={{ lat: 30.2672, lng: -97.7431 }}
  defaultZoom={12}
  mapId="DEMO_MAP_ID"
  internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
>
  <TerraDrawBridge
    drawMode={drawMode}
    clearSignal={clearSignal}
    onDrawModeChange={setDrawMode}
    onDrawnZonesChange={setDrawnZones}
  />
  {orderedStops.map((stop, idx) => (
    <AdvancedMarker key={stop.id} position={stop.location} onClick={() => setSelectedStopId(stop.id)}>
      <Pin background="#2563eb" borderColor="#1e3a8a" glyphColor="#ffffff" glyphText={String(idx + 1)} />
    </AdvancedMarker>
  ))}
</Map>
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

For zero-cost prototyping (no billing setup or Cloud project required):
1. Open the [Google Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account and accept the Maps Demo Project Terms.
3. Generate and copy your Demo Key.

For production deployments, create a restricted key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enable **Maps JavaScript API**, **Places API (New)**, **Routes API**, and **Geocoding API**, and follow the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_key>
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
npx next start --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000` in your browser.

## Google Maps Platform Documentation & Compliance

- [Maps JavaScript API Overview](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Terra Draw with Google Maps](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Places API (New) Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Routes API Compute Routes & Waypoint Optimization](https://developers.google.com/maps/documentation/routes/opt-way?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Geocoding API v4 Reverse Geocoding](https://developers.google.com/maps/documentation/geocoding/reverse-geocoding?utm_campaign=gmp_git_agentsamples_v1.0.0)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0)

## Framework Variants

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
