# AGENTS.md — Google Maps Platform Verified Web Samples Router

This directory contains **15 Playwright-verified, zero-deprecation, ToS-compliant Google Maps Platform reference solutions** across **8 standalone web frameworks (120 complete apps)**, all verified with `0` browser console/page errors.

## Fast 1-Hop Path Formula

Every solution implements **all 8 frameworks** at deterministic paths:

```text
./<solution-id>/<framework>/
```

- **Frameworks:** `static-vanilla-js`, `react-vite`, `nextjs`, `sveltekit`, `vue-vite`, `angular`, `python-fastapi`, `nodejs-web`
- **Per-solution file map & transport mode:** `./<solution-id>/AGENTS.md`
- **Deep API headers, error fixes & legacy migrations:** [`BY_API.md`](./BY_API.md)
- **Framework idioms & build/runtime pitfalls:** [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md)
- **Compact single-fetch index / JSON manifest:** [`llms.txt`](./llms.txt) | [`catalog.json`](./catalog.json) | [`INDEX.md`](./INDEX.md)
- **Official Google Maps Platform Agent Skills:** [`googlemaps/agent-skills`](https://github.com/googlemaps/agent-skills) (installable skills & live docs index for coding agents)

## Disambiguate Overlapping Solutions (Pick the Exact Match)

### 1. Local Discovery, Storefronts & Real Estate
| Solution | Choose When User Needs | Key Differentiators |
| :--- | :--- | :--- |
| [`storefront-sample`](./storefront-sample/AGENTS.md) | Single business page + booking + directions | 1 venue, `Circle` radius, synchronized `StreetViewPanorama`, Places reviews/photo proxy, Drive/Transit/Walk |
| [`neighborhood-discovery`](./neighborhood-discovery/AGENTS.md) | Explore/compare nearby POIs in a district | 5 km `Place.searchNearby` categories, side-by-side comparison, map-click reverse geocode (no Routes/clustering) |
| [`store-locator`](./store-locator/AGENTS.md) | Multi-branch store / ATM / kiosk locator | `@googlemaps/markerclusterer` (custom `AdvancedMarkerElement` clusters), `RouteMatrix` ETAs, 'Route to Fastest' |
| [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md) | EV chargers or roadside dispatch around user | Draggable user pin + reverse geocode, configurable 5–15 km ring, `evChargeOptions`, turn-by-turn dispatch |
| [`real-estate`](./real-estate/AGENTS.md) | Zillow-style split-screen property search | Custom HTML price-pill markers + hover sync, `MarkerClusterer`, Terra Draw search polygon, parcel boundaries, Street View, `RouteMatrix` |

### 2. Logistics, Delivery, Dispatch & Tracking
| Solution | Choose When User Needs | Key Differentiators |
| :--- | :--- | :--- |
| [`live-order-tracking`](./live-order-tracking/AGENTS.md) | Delivery checkout + address check + tracker | **Address Validation API** (USPS CASS), delivery polygon & fee tiers, animated courier marker, **Maps Static API** receipt |
| [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md) | Geofence drawing + workforce clock-in + audits | **Terra Draw** polygon editor, `containsLocation` clock-in lock, **Geocoding v4**, `optimizeWaypointOrder` multi-stop route |
| [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md) | Rideshare booking + eco fares + live driver | **Eco-Friendly** `FUEL_EFFICIENT` vs. fastest route comparison, fuel savings, fare tiers, animated closest-driver dispatch |
| [`logistics-and-routing`](./logistics-and-routing/AGENTS.md) | Fleet telematics + GPS road snapping | **Roads API `snapToRoads`** (noisy GPS vs. snapped path), `TrafficLayer`, status-coded fleet pins, depot `RouteMatrix` |

### 3. Spatial Analytics, Heatmaps, 3D & Elevation
| Solution | Choose When User Needs | Key Differentiators |
| :--- | :--- | :--- |
| [`complete-heatmap`](./complete-heatmap/AGENTS.md) | Heatmaps + hazard-avoiding shelter routing | **deck.gl `HeatmapLayer`**, flood-hazard avoidance route, map-click Weather + Elevation + Reverse Geocode incident log |
| [`spatial-intelligence`](./spatial-intelligence/AGENTS.md) | 2D Web GIS + GeoJSON + sensor clustering | **GeoJSON Data Layer**, basemap switcher, **deck.gl `ScatterplotLayer`/`HexagonLayer`**, **Terra Draw** point filter, Elevation (2D only) |
| [`3d-trail-explorer`](./3d-trail-explorer/AGENTS.md) | Photorealistic 3D maps & camera fly-throughs | **ONLY `Map3DElement` (`<gmp-map-3d>`)** sample: extruded red `Polyline3DElement`, `Marker3DInteractiveElement` + `PopoverElement`, `flyCameraTo`, Elevation |
| [`travel-route-comparator`](./travel-route-comparator/AGENTS.md) | 2D multi-modal commute + elevation profile | Driving/Cycling/Walking/Transit comparator, Avoid Tolls/Highways + **Eco-Routing**, `BicyclingLayer`, synced Elevation chart |

### 4. Environmental Intelligence & Trip Planning
| Solution | Choose When User Needs | Key Differentiators |
| :--- | :--- | :--- |
| [`environmental-dashboard`](./environmental-dashboard/AGENTS.md) | Weather, AQI, Pollen & rooftop Solar | **Weather**, **Air Quality** (`ImageMapType` `US_AQI` tiles), **Pollen**, and **Solar API** `buildingInsights:findClosest` (404 fallback) |
| [`itinerary-planner`](./itinerary-planner/AGENTS.md) | Multi-day travel itinerary + local time | **Time Zone API**, Day 1/2 tabs, numbered day-colored markers, `optimizeWaypointOrder` daily route, Places photos & Street View |

## UI & Geospatial Pattern Quick-Lookup

| Pattern / Capability | Best Reference Sample(s) |
| :--- | :--- |
| Custom HTML price-pill markers + bidirectional list hover | [`real-estate`](./real-estate/AGENTS.md) |
| Draggable `AdvancedMarkerElement` + reverse geocoding | [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/AGENTS.md) |
| Smoothly animate marker along route polyline (`spherical.interpolate`) | [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`ridesharing-and-tracker`](./ridesharing-and-tracker/AGENTS.md) |
| Marker clustering with `AdvancedMarkerElement` (never default legacy renderer) | [`store-locator`](./store-locator/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md) |
| Point-in-polygon check (`geometry.poly.containsLocation`) & Terra Draw | [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`real-estate`](./real-estate/AGENTS.md), [`spatial-intelligence`](./spatial-intelligence/AGENTS.md) |
| Binary image proxy hiding API key (Places Photo / Maps Static / AQI Tiles) | [`storefront-sample`](./storefront-sample/AGENTS.md), [`live-order-tracking`](./live-order-tracking/AGENTS.md), [`environmental-dashboard`](./environmental-dashboard/AGENTS.md) |
| WebGL-free tile overlay (`ImageMapType`) vs. WebGL2 `deck.gl` overlay | [`environmental-dashboard`](./environmental-dashboard/AGENTS.md) (`ImageMapType`), [`complete-heatmap`](./complete-heatmap/AGENTS.md) (`deck.gl`) |
| Multi-stop waypoint optimization (`optimizeWaypointOrder`) | [`driving-and-geofencing`](./driving-and-geofencing/AGENTS.md), [`itinerary-planner`](./itinerary-planner/AGENTS.md) |

## Non-Negotiable Rules When Adapting Any Sample

1. **Zero deprecated APIs**: Always use `AdvancedMarkerElement`, `PlaceAutocompleteElement` (`gmp-select`), `Place.searchByText`/`searchNearby`, `Route.computeRoutes`/`RouteMatrix`, `terra-draw`, and `deck.gl` — see [`BY_API.md`](./BY_API.md#legacy-to-modern-migration-guide) for the full migration table.
2. **Respect CORS & REST header boundaries**: Never call `places.googleapis.com`, `routes.googleapis.com`, `roads.googleapis.com`, or `addressvalidation.googleapis.com` directly from browser `fetch()`. Only Places (New) and Routes v2 require `X-Goog-FieldMask` — never send `X-Goog-FieldMask` to Roads, Elevation, Time Zone, or binary PNG tile/staticmap endpoints.
3. **Watch framework runtime traps**: Angular requires `serve-dist.mjs` (not `ng serve`); Vue/Svelte 5 must keep Maps instances non-reactive (plain `let`); Vite middleware proxies (`vite.config.ts`) need real backend routes for static CDN deploys. Details in [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md).
4. **Attribution, Map ID & Keys**: Keep `mapId: 'DEMO_MAP_ID'` on 2D maps (omit `mapId` on `<gmp-map-3d>`), keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']`, never hardcode API keys, bind local servers to `127.0.0.1`, and avoid `innerHTML`.
5. **Maps Demo Key vs. Cloud Key**: 7/15 solutions run fully on the free zero-billing Maps Demo Key; 8/15 require a billed GCP key for Air Quality, Pollen, Solar, Address Validation, Maps Static, Time Zone, Roads, or Elevation REST (see [`README.md`](./README.md#maps-demo-key-vs-cloud-billing-key-coverage)).
