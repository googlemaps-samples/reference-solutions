# Google Maps Platform Samples by API, Transport Headers & Errors

Use this reference to find verified sample code by **Google Maps Platform API**, verify **REST header & CORS requirements**, fix **common runtime errors**, or migrate off **deprecated APIs**.

- Back to: [`AGENTS.md`](./AGENTS.md) | [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md) | [`README.md`](./README.md) | [`catalog.json`](./catalog.json)

## Table of Contents

1. [REST API Transport & Header Matrix (CORS vs. Server BFF)](#rest-api-transport--header-matrix-cors-vs-server-bff)
2. [JS SDK vs. REST Field Naming Cheatsheet](#js-sdk-vs-rest-field-naming-cheatsheet)
3. [Common GMP Runtime Errors -> Verified Fix](#common-gmp-runtime-errors---verified-fix)
4. [Samples by API & Geo Library](#samples-by-api--geo-library)
5. [Legacy-to-Modern Migration Guide](#legacy-to-modern-migration-guide)

---

## REST API Transport & Header Matrix (CORS vs. Server BFF)

| GMP REST Service | Browser CORS? | Auth & `X-Goog-FieldMask` Rule | Real-Code Gotcha | Reference Sample(s) |
| :--- | :---: | :--- | :--- | :--- |
| **Places API (New)** (`places.googleapis.com/v1/places:*`) | ❌ Blocked | `POST`, `X-Goog-Api-Key` + **mandatory `X-Goog-FieldMask`** | Photo media (`/{name}/media`) streams binary bytes (`X-Goog-Api-Key`, no FieldMask). On pure client stacks use JS `Place.*`. | [`storefront-sample`](./storefront-sample/), [`neighborhood-discovery`](./neighborhood-discovery/) |
| **Routes API v2** (`routes.googleapis.com/directions/v2:*`, `distanceMatrix/v2:*`) | ❌ Blocked | `POST`, `X-Goog-Api-Key` + **mandatory `X-Goog-FieldMask`** | Matrix returns a **top-level JSON array**; only set `routingPreference: 'TRAFFIC_AWARE'` when `travelMode === 'DRIVE'`; cap `TRANSIT` to 25 destinations. | [`store-locator`](./store-locator/), [`ridesharing-and-tracker`](./ridesharing-and-tracker/) |
| **Roads API** (`roads.googleapis.com/v1/snapToRoads`) | ❌ Blocked | `GET ?path=lat,lng\|...&interpolate=true&key=` — **NO `X-Goog-FieldMask`** | Hard limit of `2..100` GPS points per request; never send `X-Goog-FieldMask`. | [`logistics-and-routing`](./logistics-and-routing/) |
| **Address Validation API** (`addressvalidation.googleapis.com/v1:validateAddress`) | ❌ Blocked | `POST`, `X-Goog-Api-Key` (no required FieldMask) OR JS SDK `importLibrary('addressValidation')` | JS SDK uses `uspsCASSEnabled`; REST uses `enableUspsCass`. Only read weekly-safe `verdict` fields. | [`live-order-tracking`](./live-order-tracking/) |
| **Geocoding API** (`geocode.googleapis.com/v4/...` & `maps/api/geocode/json`) | ❌ Blocked | v4: `X-Goog-Api-Key`; v3: `GET ?key=` (**NO `X-Goog-FieldMask`**); Client: JS `Geocoder` | [`driving-and-geofencing`](./driving-and-geofencing/) demonstrates Geocoding v4 BFF; other BFFs use v3 or JS `Geocoder`. | [`driving-and-geofencing`](./driving-and-geofencing/), [`neighborhood-discovery`](./neighborhood-discovery/) |
| **Elevation API** (`maps.googleapis.com/maps/api/elevation/json`) | ❌ Blocked | `GET ?path=...&samples=...&key=` — **NO `X-Goog-FieldMask`**; Client: JS `ElevationService` | Never pass `X-Goog-FieldMask` to legacy Elevation REST. | [`3d-trail-explorer`](./3d-trail-explorer/), [`travel-route-comparator`](./travel-route-comparator/) |
| **Weather / Pollen / Solar APIs** (`weather/pollen/solar.googleapis.com/v1/...`) | ✅ OK (`?key=`) | `GET ?location.latitude=...&key=` (or BFF proxy) — no required FieldMask | **Solar `buildingInsights:findClosest`** returns HTTP **404** outside building coverage (use `requiredQuality=MEDIUM` and render a graceful non-coverage state). | [`environmental-dashboard`](./environmental-dashboard/), [`complete-heatmap`](./complete-heatmap/) |
| **Air Quality API** (`airquality.googleapis.com/v1/...`) | ✅ OK (`?key=`) | `POST ?key=` (JSON) & `GET .../heatmapTiles/{z}/{x}/{y}?key=` (binary PNG — **NO `X-Goog-FieldMask`**) | AQI `color` RGB components are floats `0..1` (multiply by `255` for CSS); clamp tile zoom `0..16` and wrap `x` in `ImageMapType`. | [`environmental-dashboard`](./environmental-dashboard/) |
| **Maps Static API** (`maps.googleapis.com/maps/api/staticmap`) | ✅ `<img>` | BFF binary PNG proxy recommended to hide key (or `<img>` URL) — **NO `X-Goog-FieldMask`** | Cap `enc:` polyline strings to `<= 1600` chars (fall back to straight line) to avoid URL length errors. | [`live-order-tracking`](./live-order-tracking/) |
| **Time Zone API** (`maps.googleapis.com/maps/api/timezone/json`) | ⚠️ Proxy Preferred | `GET ?location=lat,lng&timestamp=...&key=` — **NO `X-Goog-FieldMask`** | Proxy via BFF/Vite middleware for key protection and consistent CORS behavior. | [`itinerary-planner`](./itinerary-planner/) |

## JS SDK vs. REST Field Naming Cheatsheet

| Concept | Maps JS SDK (Client) | GMP REST API (Server BFF) |
| :--- | :--- | :--- |
| Google Maps URL | `place.googleMapsURI` (uppercase `URI`) | `places.googleMapsUri` (camelCase) |
| Route duration | `route.durationMillis` (number) | `routes.duration` (`"123s"` proto string) |
| Travel mode | `'DRIVING'`, `'WALKING'`, `'BICYCLING'`, `'TRANSIT'` | `'DRIVE'`, `'WALK'`, `'BICYCLE'`, `'TRANSIT'` |
| Optimized waypoints | `optimizedIntermediateWaypointIndices` (plural) | `routes.optimizedIntermediateWaypointIndex` (singular) |
| USPS CASS flag | `uspsCASSEnabled: true` | `enableUspsCass: true` |
| Marker click event | 2D `AdvancedMarkerElement`: `'click'` (`weekly`) | 3D `Marker3DInteractiveElement`: `'gmp-click'` |

## Common GMP Runtime Errors -> Verified Fix

| Error Message / Symptom | Root Cause & Verified Fix | Reference Sample |
| :--- | :--- | :--- |
| `google.maps.Marker is not available to new customers` | Use `AdvancedMarkerElement` (`importLibrary('marker')`) with `mapId: 'DEMO_MAP_ID'`. | [`storefront-sample`](./storefront-sample/) |
| `gmp-placeselect` listener never fires | Retired alpha event — listen to `gmp-select` and call `event.placePrediction.toPlace().fetchFields(...)`. | [`storefront-sample/react-vite`](./storefront-sample/react-vite/) |
| `Place.prototype.isOpen() is not available in this version` | `isOpen()` is beta-only; on `weekly` channel inspect `regularOpeningHours.periods` / `weekdayDescriptions`. | [`storefront-sample`](./storefront-sample/) |
| `The map is initialized without a valid Map ID` | Pass `mapId: 'DEMO_MAP_ID'` (prototyping) or your Cloud Map ID on 2D maps. *(Do NOT pass `mapId` to `<gmp-map-3d>`.)* | [`store-locator`](./store-locator/) |
| `blocked by CORS policy` calling `places`/`routes`/`roads`/`addressvalidation` | Use Maps JS `importLibrary(...)` on client OR route through a server `/api/*` BFF endpoint. | [`store-locator/nextjs`](./store-locator/nextjs/) |
| `400 INVALID_ARGUMENT` on Places/Routes REST | Missing `X-Goog-FieldMask`, OR passing `routingPreference: 'TRAFFIC_AWARE'` on `WALK`/`TRANSIT` mode. | [`store-locator/nextjs`](./store-locator/nextjs/src/app/api/routes/matrix/route.ts) |
| `403 API_KEY_HTTP_REFERRER_BLOCKED` from server BFF | Use a separate IP-restricted `GOOGLE_MAPS_API_KEY` on the server, or forward a validated `Referer` when sharing a client key. | [`live-order-tracking/sveltekit`](./live-order-tracking/sveltekit/) |
| `TypeError: Loader is not a constructor` | `@googlemaps/js-api-loader` v2 removed `new Loader()` — use `setOptions({ key, v: 'weekly' })` + `importLibrary(...)`. | [`vue-vite`](./BY_FRAMEWORK.md#vue-vite) |
| `MarkerClusterer` renders legacy red pins / deprecation error | Default cluster renderer uses deprecated `Marker` — pass a custom `renderer.render` returning `AdvancedMarkerElement`. | [`store-locator/nextjs`](./store-locator/nextjs/src/components/ClusteredBranchMarkers.tsx) |
| Terra Draw polygons don't render or fail on load | Init `TerraDrawGoogleMapsAdapter` inside `google.maps.event.addListenerOnce(map, 'idle', ...)` with `isolatedData: true`, wait for `draw.on('ready')`, filter `!feature.properties.currentlyDrawing`, reverse `[lng,lat]`->`{lat,lng}`. | [`driving-and-geofencing/angular`](./driving-and-geofencing/angular/) |
| `<gmp-map-3d>` renders `0x0` or throws on `flyCameraTo` | Set CSS `display: block` + explicit height, omit `mapId`, `await customElements.whenDefined('gmp-map-3d')`, keep instance non-reactive. | [`3d-trail-explorer/vue-vite`](./3d-trail-explorer/vue-vite/) |
| Solar API returns HTTP `404` | Normal for coordinates outside high-res rooftop coverage — pass `requiredQuality=MEDIUM` and render a non-coverage state. | [`environmental-dashboard`](./environmental-dashboard/) |

## Samples by API & Geo Library

### Maps JavaScript API (2D Vector Map & Advanced Markers)
- **Modern APIs / Symbols:** `Map (mapId)`, `AdvancedMarkerElement`, `PinElement (glyphText / glyphSrc)`, `InfoWindow`, `Polygon`, `Polyline`, `Circle`
- **Transport:** Browser JS SDK (`importLibrary('maps')` / `importLibrary('marker')`) (Maps Demo Key OK)
- **Official Docs:** [Maps JS 2D Documentation](https://developers.google.com/maps/documentation/javascript/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (15):** [`3d-trail-explorer`](./3d-trail-explorer/AGENTS.md), [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`environmental-dashboard`](./environmental-dashboard/AGENTS.md), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md), [`itinerary-planner`](./itinerary-planner/AGENTS.md), [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`logistics-and-routing`](./logistics-and-routing/AGENTS.md), [`neighborhood-discovery`](./neighborhood-discovery/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md), [`storefront-sample`](./storefront-sample/AGENTS.md), [`travel-route-comparator`](./travel-route-comparator/AGENTS.md)

### Photorealistic 3D Maps (`maps3d`)
- **Modern APIs / Symbols:** `Map3DElement (`<gmp-map-3d>`)`, `Polyline3DElement`, `Marker3DInteractiveElement`, `PopoverElement`, `flyCameraTo()`
- **Transport:** Browser JS SDK (`importLibrary('maps3d')` or `@vis.gl/react-google-maps/3d`) (Maps Demo Key OK)
- **Official Docs:** [Photorealistic 3D Documentation](https://developers.google.com/maps/documentation/javascript/3d/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`3d-trail-explorer`](./3d-trail-explorer/AGENTS.md)

### Places API (New)
- **Modern APIs / Symbols:** `PlaceAutocompleteElement (`gmp-select`)`, `Place.searchByText()`, `Place.searchNearby()`, `Place.fetchFields()`, `AutocompleteSuggestion`
- **Transport:** JS SDK (`importLibrary('places')`) OR Server BFF `POST places.googleapis.com/v1/places:*` (`X-Goog-Api-Key` + mandatory `X-Goog-FieldMask`) (Maps Demo Key OK)
- **Official Docs:** [Places (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/op-overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (15):** [`3d-trail-explorer`](./3d-trail-explorer/AGENTS.md), [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`environmental-dashboard`](./environmental-dashboard/AGENTS.md), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md), [`itinerary-planner`](./itinerary-planner/AGENTS.md), [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`logistics-and-routing`](./logistics-and-routing/AGENTS.md), [`neighborhood-discovery`](./neighborhood-discovery/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md), [`storefront-sample`](./storefront-sample/AGENTS.md), [`travel-route-comparator`](./travel-route-comparator/AGENTS.md)

### Routes API (Compute Routes, Route Matrix & Eco-Friendly)
- **Modern APIs / Symbols:** `Route.computeRoutes()`, `RouteMatrix.computeRouteMatrix()`, `optimizeWaypointOrder`, `FUEL_EFFICIENT / FUEL_CONSUMPTION`
- **Transport:** JS SDK (`importLibrary('routes')`) OR Server BFF `POST routes.googleapis.com/directions/v2:computeRoutes` / `distanceMatrix/v2:computeRouteMatrix` (`X-Goog-Api-Key` + mandatory `X-Goog-FieldMask`) (Maps Demo Key OK)
- **Official Docs:** [Routes API Documentation](https://developers.google.com/maps/documentation/routes/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (11):** [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md), [`itinerary-planner`](./itinerary-planner/AGENTS.md), [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`logistics-and-routing`](./logistics-and-routing/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md), [`storefront-sample`](./storefront-sample/AGENTS.md), [`travel-route-comparator`](./travel-route-comparator/AGENTS.md)

### Routes API — Eco-Friendly Routing
- **Modern APIs / Symbols:** `requestedReferenceRoutes: ['FUEL_EFFICIENT']`, `extraComputations: ['FUEL_CONSUMPTION']`, `routeLabels: ['FUEL_EFFICIENT']`
- **Transport:** JS SDK (`Route.computeRoutes`) OR Server BFF (`routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-FieldMask`) (Maps Demo Key OK)
- **Official Docs:** [Eco-Routing Documentation](https://developers.google.com/maps/documentation/routes/request_eco_friendly_routes?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (2):** [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md), [`travel-route-comparator`](./travel-route-comparator/AGENTS.md)

### Routes API — Route Matrix (ETAs & Distances)
- **Modern APIs / Symbols:** `RouteMatrix.computeRouteMatrix()`, `distanceMatrix/v2:computeRouteMatrix`
- **Transport:** JS SDK (`importLibrary('routes')`) OR Server BFF (`POST` returning top-level JSON array; `TRAFFIC_AWARE` only for `DRIVE`; max 25 dests for `TRANSIT`) (Maps Demo Key OK)
- **Official Docs:** [Route Matrix Documentation](https://developers.google.com/maps/documentation/routes/compute_route_matrix?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (5):** [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md), [`logistics-and-routing`](./logistics-and-routing/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md)

### Geocoding API (Forward & Reverse Geocoding)
- **Modern APIs / Symbols:** `Geocoder (`importLibrary('geocoding')`)`, `geocode.googleapis.com/v4/geocode/location/{lat},{lng}`, `maps.googleapis.com/maps/api/geocode/json`
- **Transport:** JS SDK (`Geocoder`) OR Server BFF (Geocoding v4 with `X-Goog-Api-Key` or legacy v3 `GET ?key=`, NO `X-Goog-FieldMask`) (Maps Demo Key OK)
- **Official Docs:** [Geocoding Documentation](https://developers.google.com/maps/documentation/geocoding/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (8):** [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`environmental-dashboard`](./environmental-dashboard/AGENTS.md), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md), [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`neighborhood-discovery`](./neighborhood-discovery/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md)

### Street View Service & Synchronized Panorama
- **Modern APIs / Symbols:** `StreetViewService.getPanorama()`, `StreetViewPanorama`
- **Transport:** Browser JS SDK (`importLibrary('streetView')`) (Maps Demo Key OK)
- **Official Docs:** [Street View Documentation](https://developers.google.com/maps/documentation/javascript/streetview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (3):** [`itinerary-planner`](./itinerary-planner/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`storefront-sample`](./storefront-sample/AGENTS.md)

### Elevation API (Path Sampling & Point Elevation)
- **Modern APIs / Symbols:** `ElevationService.getElevationAlongPath()`, `ElevationService.getElevationForLocations()`, `maps.googleapis.com/maps/api/elevation/json`
- **Transport:** JS SDK (`importLibrary('elevation')`) OR Server BFF `GET ?path=...&samples=...&key=` (NO `X-Goog-FieldMask`) (Requires Cloud Billing Key)
- **Official Docs:** [Elevation Documentation](https://developers.google.com/maps/documentation/elevation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (4):** [`3d-trail-explorer`](./3d-trail-explorer/AGENTS.md), [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md), [`travel-route-comparator`](./travel-route-comparator/AGENTS.md)

### Address Validation API (Deliverability & USPS CASS)
- **Modern APIs / Symbols:** `AddressValidation.fetchAddressValidation()`, `addressvalidation.googleapis.com/v1:validateAddress`
- **Transport:** Server BFF `POST addressvalidation.googleapis.com/v1:validateAddress` (`X-Goog-Api-Key`, NO required `X-Goog-FieldMask`) OR JS SDK `importLibrary('addressValidation')` (Requires Cloud Billing Key)
- **Official Docs:** [Address Validation Documentation](https://developers.google.com/maps/documentation/address-validation/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`live-order-tracking`](./live-order-tracking/AGENTS.md)

### Roads API (Snap to Roads)
- **Modern APIs / Symbols:** `roads.googleapis.com/v1/snapToRoads`
- **Transport:** Server/Proxy `GET ?path=lat,lng|...&interpolate=true&key=` (CORS-blocked in browser, max 100 pts, NO `X-Goog-FieldMask`) (Requires Cloud Billing Key)
- **Official Docs:** [Roads API Documentation](https://developers.google.com/maps/documentation/roads/snap?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`logistics-and-routing`](./logistics-and-routing/AGENTS.md)

### Time Zone API
- **Modern APIs / Symbols:** `maps.googleapis.com/maps/api/timezone/json`
- **Transport:** Server/Proxy OR Browser CORS `GET ?location=lat,lng&timestamp=...&key=` (NO `X-Goog-FieldMask`) (Requires Cloud Billing Key)
- **Official Docs:** [Time Zone Documentation](https://developers.google.com/maps/documentation/timezone/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`itinerary-planner`](./itinerary-planner/AGENTS.md)

### Maps Static API (Route & Receipt Thumbnails)
- **Modern APIs / Symbols:** `maps.googleapis.com/maps/api/staticmap`
- **Transport:** Server BFF binary PNG proxy (recommended to hide API key; cap `enc:` polyline `<= 1600` chars) OR direct `<img>` URL (Requires Cloud Billing Key)
- **Official Docs:** [Maps Static Documentation](https://developers.google.com/maps/documentation/maps-static/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`live-order-tracking`](./live-order-tracking/AGENTS.md)

### Weather API (Current Conditions & Multi-Day Forecast)
- **Modern APIs / Symbols:** `weather.googleapis.com/v1/currentConditions:lookup`, `weather.googleapis.com/v1/forecast/days:lookup`
- **Transport:** Browser CORS `GET ?location.latitude=...&key=` OR Server BFF proxy (NO required `X-Goog-FieldMask`) (Maps Demo Key OK)
- **Official Docs:** [Weather API Documentation](https://developers.google.com/maps/documentation/weather/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (2):** [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`environmental-dashboard`](./environmental-dashboard/AGENTS.md)

### Air Quality API (AQI, Pollutants & Heatmap Tiles)
- **Modern APIs / Symbols:** `airquality.googleapis.com/v1/currentConditions:lookup`, `airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/{z}/{x}/{y}`, `ImageMapType`
- **Transport:** Browser CORS (`POST ?key=` + `ImageMapType` PNG tiles) OR Server BFF proxy (binary PNG tiles use NO `X-Goog-FieldMask`) (Requires Cloud Billing Key)
- **Official Docs:** [Air Quality Documentation](https://developers.google.com/maps/documentation/air-quality/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`environmental-dashboard`](./environmental-dashboard/AGENTS.md)

### Pollen API (Tree, Grass & Weed Forecasts)
- **Modern APIs / Symbols:** `pollen.googleapis.com/v1/forecast:lookup`
- **Transport:** Browser CORS `GET ?location.latitude=...&key=` OR Server BFF proxy (NO required `X-Goog-FieldMask`) (Requires Cloud Billing Key)
- **Official Docs:** [Pollen API Documentation](https://developers.google.com/maps/documentation/pollen/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`environmental-dashboard`](./environmental-dashboard/AGENTS.md)

### Solar API (Rooftop Building Insights)
- **Modern APIs / Symbols:** `solar.googleapis.com/v1/buildingInsights:findClosest`
- **Transport:** Browser CORS `GET ?location.latitude=...&requiredQuality=MEDIUM&key=` OR Server BFF proxy (handle HTTP 404 non-coverage cleanly) (Requires Cloud Billing Key)
- **Official Docs:** [Solar API Documentation](https://developers.google.com/maps/documentation/solar/overview?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (1):** [`environmental-dashboard`](./environmental-dashboard/AGENTS.md)

### Marker Clustering (`@googlemaps/markerclusterer`)
- **Modern APIs / Symbols:** `MarkerClusterer`, `custom renderer returning AdvancedMarkerElement`
- **Transport:** Browser JS library (override `renderer.render` to emit `AdvancedMarkerElement`, never default legacy `Marker`) (Maps Demo Key OK)
- **Official Docs:** [MarkerClusterer Documentation](https://developers.google.com/maps/documentation/javascript/marker-clustering?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (2):** [`real-estate`](./real-estate/AGENTS.md), [`store-locator`](./store-locator/AGENTS.md)

### deck.gl Spatial Overlays (`GoogleMapsOverlay`)
- **Modern APIs / Symbols:** `GoogleMapsOverlay (`@deck.gl/google-maps`)`, `HeatmapLayer (`@deck.gl/aggregation-layers`)`, `ScatterplotLayer / HexagonLayer`
- **Transport:** Browser WebGL2 overlay (replaces deprecated `google.maps.visualization.HeatmapLayer`) (Maps Demo Key OK)
- **Official Docs:** [deck.gl Documentation](https://developers.google.com/maps/documentation/javascript/webgl/webgl-overlay-view?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (2):** [`complete-heatmap`](./complete-heatmap/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md)

### Terra Draw Polygon & Geofence Drawing (`terra-draw`)
- **Modern APIs / Symbols:** `TerraDraw`, `TerraDrawGoogleMapsAdapter (`terra-draw-google-maps-adapter`)`, `TerraDrawPolygonMode`
- **Transport:** Browser JS adapter (replaces deprecated `google.maps.drawing.DrawingManager`; init on map `idle` with `isolatedData: true`) (Maps Demo Key OK)
- **Official Docs:** [Terra Draw Documentation](https://developers.google.com/maps/documentation/javascript/deprecations?utm_campaign=gmp_git_agentsamples_v1.0.0)
- **Verified Samples (3):** [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md)

---

## Legacy-to-Modern Migration Guide

> **CRITICAL:** Never emit any symbol in the second column. Always use the modern replacement in column 1 and inspect the linked verified sample.

| ✅ Use This (Modern Replacement) | ❌ Deprecated — Do Not Emit | Trigger / Error | Verified Sample(s) |
| :--- | :--- | :--- | :--- |
| `AdvancedMarkerElement (`importLibrary('marker')`)` | ~~google.maps.Marker / <Marker> / <map-marker>~~ | "google.maps.Marker is not available to new customers" (Mar 2025) | [`storefront-sample`](./storefront-sample/), [`store-locator`](./store-locator/), [`real-estate`](./real-estate/) |
| `PinElement passed directly + `glyphText` / `glyphSrc`` | ~~PinElement.element / PinElement.glyph~~ | Deprecated PinElement property warnings or broken pin rendering | [`3d-trail-explorer`](./3d-trail-explorer/), [`itinerary-planner`](./itinerary-planner/), [`storefront-sample`](./storefront-sample/) |
| `PlaceAutocompleteElement (`gmp-select` + `event.placePrediction.toPlace().fetchFields()`)` | ~~google.maps.places.Autocomplete / SearchBox / AutocompleteService / gmp-placeselect~~ | Legacy Autocomplete disabled for new customers or `gmp-placeselect` never firing | [`storefront-sample`](./storefront-sample/), [`neighborhood-discovery`](./neighborhood-discovery/), [`store-locator`](./store-locator/) |
| `Place.searchByText() / Place.searchNearby() / Place.fetchFields()` | ~~google.maps.places.PlacesService~~ | Legacy PlacesService disabled; need live ratings, reviews, hours, or EV chargers | [`neighborhood-discovery`](./neighborhood-discovery/), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/), [`storefront-sample`](./storefront-sample/) |
| `Inspect `regularOpeningHours.periods` / `weekdayDescriptions` (or use `v: 'beta'`)` | ~~Place.prototype.isOpen() on default weekly channel~~ | "Place.prototype.isOpen() is not available in this version of the Google Maps JavaScript API" | [`storefront-sample`](./storefront-sample/), [`neighborhood-discovery`](./neighborhood-discovery/) |
| `Route.computeRoutes() / RouteMatrix.computeRouteMatrix() / Routes API v2` | ~~DirectionsService / DirectionsRenderer / DistanceMatrixService / <map-directions-renderer>~~ | Legacy Directions/Distance Matrix disabled; need eco-routing, matrix ETAs, or waypoint optimization | [`ridesharing-and-tracker`](./ridesharing-and-tracker/), [`store-locator`](./store-locator/), [`travel-route-comparator`](./travel-route-comparator/) |
| `@deck.gl/google-maps `GoogleMapsOverlay` + `HeatmapLayer` / `HexagonLayer`` | ~~google.maps.visualization.HeatmapLayer / <map-heatmap-layer>~~ | Maps JS visualization library deprecated; need WebGL heatmaps or sensor density layers | [`complete-heatmap`](./complete-heatmap/), [`spatial-intelligence`](./spatial-intelligence/) |
| `terra-draw + terra-draw-google-maps-adapter (`TerraDrawGoogleMapsAdapter`)` | ~~google.maps.drawing / DrawingManager~~ | Maps JS drawing library deprecated; need interactive polygon geofencing or search-area drawing | [`driving-and-geofencing`](./driving-and-geofencing/), [`real-estate`](./real-estate/), [`spatial-intelligence`](./spatial-intelligence/) |
| `@googlemaps/js-api-loader v2 `setOptions()` + `importLibrary()`` | ~~new Loader(...).load() (js-api-loader v1)~~ | "TypeError: Loader is not a constructor" after upgrading `@googlemaps/js-api-loader` to v2 | [`vue-vite`](./BY_FRAMEWORK.md#vue-vite), [`sveltekit`](./BY_FRAMEWORK.md#sveltekit), [`angular`](./BY_FRAMEWORK.md#angular) |
| `@vis.gl/react-google-maps (React/Next.js) / @angular/google-maps (Angular) / native Web Components (Vue/Svelte)` | ~~@react-google-maps/api / google-map-react / use-places-autocomplete / @googlemaps/react-wrapper / @googlemaps/extended-component-library (<gmpx-*>) / svelte-google-maps / vue3-google-map~~ | React 19 peer-dep conflicts, unmaintained wrappers, or retired `<gmpx-*>` elements | [`storefront-sample`](./storefront-sample/), [`store-locator`](./store-locator/), [`3d-trail-explorer`](./3d-trail-explorer/) |
| `Maps JS SDK `importLibrary(...)` OR Server BFF `/api/*` proxy with `X-Goog-Api-Key`` | ~~Direct browser fetch() to places.googleapis.com / routes.googleapis.com / roads.googleapis.com / addressvalidation.googleapis.com~~ | "Access to fetch ... has been blocked by CORS policy" | [`store-locator`](./store-locator/), [`live-order-tracking`](./live-order-tracking/), [`logistics-and-routing`](./logistics-and-routing/) |
