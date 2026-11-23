# Hyperlocal Neighborhood Directory & Spot Mapper — Node.js + Express + TypeScript Backend + Interactive Web Frontend (`Map`, `AdvancedMarkerElement`, `PinElement`, `PlaceAutocompleteElement`, Places API (New), Geocoding API)

An interactive hyperlocal neighborhood discovery, business comparison, and community spot-mapping web application pre-seeded in **Central London** (`51.5118, -0.1280`, Covent Garden / West End). Built with a **TypeScript + Node.js + Express** Backend-for-Frontend (BFF) and a modern **Vanilla JS** frontend using Google Maps Platform's zero-deprecation APIs.

## Modern Google Maps Platform APIs Used

- **Maps JavaScript API (Dynamic Library Import):** `google.maps.importLibrary('maps')` with `Map` (`mapId: 'DEMO_MAP_ID'`, `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`) and `Circle` (5km / 5000m discovery radius).
- **Advanced Markers:** `AdvancedMarkerElement` and `PinElement` (color-coded by category using `PinElementOptions.glyphText`, `background`, `borderColor`, `glyphColor`).
- **Places API (New) Web Component:** `PlaceAutocompleteElement` (`<gmp-place-autocomplete>`) listening to `gmp-select` and resolving `event.placePrediction.toPlace().fetchFields(...)`.
- **Places API (New) Web Service REST (proxied via Express BFF):**
  - `POST /api/places/nearby` → [`places:searchNearby`](https://developers.google.com/maps/documentation/places/web-service/nearby-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `POST /api/places/search` → [`places:searchText`](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `GET /api/places/details` → [`places/{placeId}`](https://developers.google.com/maps/documentation/places/web-service/place-details?utm_campaign=gmp_git_agentsamples_v1.0.0)
  - `GET /api/places/photo` → [`places/{placeId}/photos/{photoId}/media`](https://developers.google.com/maps/documentation/places/web-service/place-photos?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Geocoding API REST (proxied via Express BFF):**
  - `GET /api/geocode` → [`/maps/api/geocode/json`](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0) for forward address lookup and map-click reverse geocoding.

## Architecture Summary

```text
Browser UI (public/index.html, public/app.js, public/styles.css)
  ├── Maps JS SDK (importLibrary: maps, marker, places)
  │     ├── 2D Vector Map + 5km Circle + AdvancedMarkerElement / PinElement
  │     └── PlaceAutocompleteElement (gmp-select)
  └── fetch('/api/...') ──► Express TypeScript BFF (src/server.ts, 127.0.0.1)
                              ├── POST /api/places/nearby   (X-Goog-Api-Key + X-Goog-FieldMask)
                              ├── POST /api/places/search   (X-Goog-Api-Key + X-Goog-FieldMask)
                              ├── GET  /api/places/details  (X-Goog-Api-Key + X-Goog-FieldMask)
                              ├── GET  /api/places/photo    (Place Photos New redirect)
                              └── GET  /api/geocode         (Forward & reverse geocoding)
```

### Core Implementation Snippet (`src/server.ts` & `public/app.js`)

```typescript
// Server-side Places API (New) Nearby Search proxy with explicit field mask
const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': SEARCH_FIELD_MASK,
  },
  body: JSON.stringify({
    includedTypes,
    maxResultCount,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    },
  }),
});
```

```javascript
// Client-side Map, PinElement, and PlaceAutocompleteElement setup
const [{ Map, Circle }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }] =
  await Promise.all([
    google.maps.importLibrary('maps'),
    google.maps.importLibrary('marker'),
    google.maps.importLibrary('places'),
  ]);

const map = new Map(document.getElementById('map-canvas'), {
  center: { lat: 51.5118, lng: -0.128 },
  zoom: 13,
  mapId: 'DEMO_MAP_ID',
  internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
});
```

## Setup & Local Development

### 1. Obtain a Google Maps Platform API Key

**Prototyping (Free Zero-Billing Maps Demo Key):**
1. Open the [Maps Demo Key portal](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0).
2. Sign in with any Google account (no billing card or Cloud project required).
3. Accept the Maps Demo Project Terms when prompted.
4. Click to generate/reveal your key and copy it. *(Note: The Demo Key has a daily quota limit and is for prototyping only.)*

**Production:**
- Provision and restrict an API key in the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentsamples_v1.0.0), enabling **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**, and following the [API Security Best Practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentsamples_v1.0.0).
- Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0).

### 2. Configure `.env`

```bash
cp .env.example .env
# Edit .env and set:
# GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. Install, Typecheck, Build, and Run

```bash
npm install --no-audit --no-fund
npx tsc --noEmit
npm run build
node dist/server.js --host 127.0.0.1 --port 3000
```

Then open `http://127.0.0.1:3000` in your browser.

## Related Neighborhood Discovery Implementations

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

- **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* Prototyping supported with a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset quota; not for production).
- **API Key Restrictions:** Restrict production keys by HTTP referrer (client) or IP address (server) and allowed APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
- **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) (applies to Google-sourced snippets only, not the full generated project).
- **Terms of Service:** Subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0), and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not cache non-`place_id` Places data or use GMP content for AI/ML training.
- **Browse Catalog:** [`../README.md`](../README.md) · [`../AGENTS.md`](../AGENTS.md) · [`../../AGENTS.md`](../../AGENTS.md) · [`../../INDEX.md`](../../INDEX.md)
<!-- END GMP-COMPLIANCE-NOTICE -->
