# Google Maps Platform Multi-Framework Web Reference Samples

A catalog of **15 production-style Google Maps Platform web solutions** built across **8 standalone frameworks (120 verified apps)** — zero deprecated APIs, zero console errors under Playwright WebGL verification, and audited for Google Maps Platform Terms of Service compliance.

> **AI Coding Agents:** Start with [`AGENTS.md`](./AGENTS.md) (1-hop sample router), [`llms.txt`](./llms.txt) (compact single-fetch index), [`BY_API.md`](./BY_API.md) (API headers, errors & migrations), [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md) (stack pitfalls), or [`catalog.json`](./catalog.json) (JSON manifest). For installable Google Maps Platform agent skills and full product guides, see the [Google Maps Platform Agent Skills README](https://github.com/googlemaps/agent-skills).

## Browse Solutions by Domain

### Advanced Spatial Analytics & 3D
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`3d-trail-explorer`**](./3d-trail-explorer/README.md) ([AGENTS](./3d-trail-explorer/AGENTS.md)) | **Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route** — ONLY Photorealistic 3D (`<gmp-map-3d>` / `Map3DElement`) app; extruded red `Polyline3DElement`, `Marker3DInteractiveElement` + `PopoverElement`, `flyCameraTo` chapter tour, Elevation profile. | Maps JS 2D, Photorealistic 3D, Places (New), Elevation | Cloud Key |
| [**`spatial-intelligence`**](./spatial-intelligence/README.md) ([AGENTS](./spatial-intelligence/AGENTS.md)) | **Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics** — 2D Enterprise Web GIS workbench: basemap switcher (roadmap/satellite/hybrid/terrain) + GeoJSON Data Layer styled by capacity + deck.gl `ScatterplotLayer`/`HexagonLayer` + Terra Draw study-zone point filter + Elevation. | Maps JS 2D, Places (New), Elevation, deck.gl, Terra Draw | Cloud Key |

### Environmental & Civic Intelligence
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`complete-heatmap`**](./complete-heatmap/README.md) ([AGENTS](./complete-heatmap/AGENTS.md)) | **Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router** — deck.gl `HeatmapLayer` (replaces deprecated Maps JS `HeatmapLayer`) + flood polygon + hazard-avoiding shelter route + map-click Weather/Elevation/Geocode incident reporter. | Maps JS 2D, Places (New), Routes API, Geocoding, Elevation, Weather API, deck.gl | Cloud Key |
| [**`environmental-dashboard`**](./environmental-dashboard/README.md) ([AGENTS](./environmental-dashboard/AGENTS.md)) | **Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard** — Weather API (current + forecast) + Air Quality API (AQI + WebGL-free `ImageMapType` `US_AQI` heatmap tiles) + Pollen API + Solar API rooftop `buildingInsights:findClosest` (with 404 handling). | Maps JS 2D, Places (New), Geocoding, Weather API, Air Quality, Pollen API, Solar API | Cloud Key |

### Logistics, Dispatch & Tracking
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`driving-and-geofencing`**](./driving-and-geofencing/README.md) ([AGENTS](./driving-and-geofencing/AGENTS.md)) | **Field Workforce Geofenced Attendance & Site Audit Router** — Terra Draw polygon geofence editor (replaces `DrawingManager`) + worker GPS inside/outside `containsLocation` clock-in + Geocoding v4 reverse geocode + `optimizeWaypointOrder` multi-stop audit route. | Maps JS 2D, Places (New), Routes API, Geocoding, Terra Draw | Demo Key |
| [**`live-order-tracking`**](./live-order-tracking/README.md) ([AGENTS](./live-order-tracking/AGENTS.md)) | **On-Demand Delivery Checkout, Zone Validation & Live Tracker** — Address Validation API (deliverability + USPS CASS) + delivery polygon & 8 km fee check + smoothly animated courier `AdvancedMarkerElement` + Maps Static API PNG receipt proxy. | Maps JS 2D, Places (New), Routes API, Geocoding, Address Validation, Maps Static | Cloud Key |
| [**`logistics-and-routing`**](./logistics-and-routing/README.md) ([AGENTS](./logistics-and-routing/AGENTS.md)) | **Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard** — Roads API `snapToRoads` (raw noisy GPS vs. road-snapped polyline) + `TrafficLayer` + status-coded fleet markers (En Route/Delayed/Idle) + depot-to-hub `RouteMatrix`. | Maps JS 2D, Places (New), Routes API, Route Matrix, Roads API | Cloud Key |
| [**`ridesharing-and-tracker`**](./ridesharing-and-tracker/README.md) ([AGENTS](./ridesharing-and-tracker/AGENTS.md)) | **Rideshare Booking, Fare Estimator & Live Driver Tracking** — Fastest vs. Eco-Friendly (`FUEL_EFFICIENT` / `FUEL_CONSUMPTION`) side-by-side route comparison + Economy/Comfort/Green fare estimator + closest-driver dispatch & animated marker along polyline. | Maps JS 2D, Places (New), Routes API, Eco-Routing, Route Matrix | Demo Key |

### Local Discovery & Storefronts
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`ev-charging-map-and-dispatch`**](./ev-charging-map-and-dispatch/README.md) ([AGENTS](./ev-charging-map-and-dispatch/AGENTS.md)) | **On-Demand Local Services & EV Roadside Dispatch** — Draggable user pin with reverse geocode + configurable 5–15 km search ring + `Place.searchNearby` (`evChargeOptions`) + driving ETA ranking & turn-by-turn dispatch route. | Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding | Demo Key |
| [**`neighborhood-discovery`**](./neighborhood-discovery/README.md) ([AGENTS](./neighborhood-discovery/AGENTS.md)) | **Hyperlocal Neighborhood Directory & Spot Mapper** — 5 km category `Place.searchNearby` (restaurants/cafes/museums/parks) + side-by-side place comparison drawer (ratings, hours, reviews, photo proxy) + map-click reverse-geocode spot pinning. | Maps JS 2D, Places (New), Geocoding | Demo Key |
| [**`store-locator`**](./store-locator/README.md) ([AGENTS](./store-locator/AGENTS.md)) | **Multi-Branch Store, ATM & Inventory Locator** — Dense NYC multi-branch locator with `@googlemaps/markerclusterer` (custom `AdvancedMarkerElement` cluster renderer) + type/inventory filters + `RouteMatrix` ETAs + 'Route to Fastest' branch. | Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding, MarkerClusterer | Demo Key |
| [**`storefront-sample`**](./storefront-sample/README.md) ([AGENTS](./storefront-sample/AGENTS.md)) | **Single-Venue Storefront, Booking & Get Directions Hub** — Single-venue clinic booking hub + branded `AdvancedMarkerElement` + toggleable service-area `Circle` + synchronized `StreetViewPanorama` entrance + live Places reviews/hours/photo proxy + Driving/Transit/Walking directions. | Maps JS 2D, Places (New), Routes API, Street View | Demo Key |

### Travel, Navigation & Itineraries
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`itinerary-planner`**](./itinerary-planner/README.md) ([AGENTS](./itinerary-planner/AGENTS.md)) | **Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub** — Multi-day Tokyo trip tabs + Time Zone API local clock/UTC offset + numbered day-colored markers + `optimizeWaypointOrder` daily route + Places photos & Street View preview. | Maps JS 2D, Places (New), Routes API, Street View, Time Zone | Cloud Key |
| [**`travel-route-comparator`**](./travel-route-comparator/README.md) ([AGENTS](./travel-route-comparator/AGENTS.md)) | **Multi-Modal Commute Comparator & Trail Elevation Tracker** — 4-mode commute comparator (Driving/Cycling/Walking/Transit) + Avoid Tolls/Highways & Eco-Friendly toggles + `BicyclingLayer` + Elevation API path profile chart synced with map hover marker. | Maps JS 2D, Places (New), Routes API, Eco-Routing, Elevation | Cloud Key |

### Real Estate & Property Mapping
| Solution | Overview & Key Capabilities | APIs & Geo Libraries | Key Tier |
| :--- | :--- | :--- | :--- |
| [**`real-estate`**](./real-estate/README.md) ([AGENTS](./real-estate/AGENTS.md)) | **Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer** — Zillow-style split screen + custom HTML price-pill `AdvancedMarkerElement` with bidirectional hover sync + `MarkerClusterer` + cadastral parcel polygons + Terra Draw search-area filter + Street View + `RouteMatrix` commute times. | Maps JS 2D, Places (New), Routes API, Route Matrix, Geocoding, Street View, MarkerClusterer, Terra Draw | Demo Key |

## 8 Standalone Frameworks (Every Solution)

| Slug | Stack | Primary GMP Package(s) | Env Var | Run Notes |
| :--- | :--- | :--- | :--- | :--- |
| `static-vanilla-js` | Static HTML + ES Modules | `@googlemaps/js-api-loader` | `GOOGLE_MAPS_API_KEY` | `npm install && node server.mjs` (`6/15` proxy `/api/*`) |
| `react-vite` | React + Vite + TS | `@vis.gl/react-google-maps` | `VITE_GOOGLE_MAPS_API_KEY` | `3/15` use Vite dev/preview proxy middleware |
| `nextjs` | Next.js App Router + TS | `@vis.gl/react-google-maps` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Full-stack `/api/*` Route Handlers (`GOOGLE_MAPS_API_KEY` optional) |
| `sveltekit` | SvelteKit + TS | `@googlemaps/js-api-loader` | `PUBLIC_GOOGLE_MAPS_API_KEY` | `onMount` SSR guard; `9/15` include `+server.ts` BFF routes |
| `vue-vite` | Vue 3 + Vite + TS | `@googlemaps/js-api-loader` | `VITE_GOOGLE_MAPS_API_KEY` | `isCustomElement` for `<gmp-*>`; `1/15` uses Vite proxy |
| `angular` | Angular Standalone + TS | `@angular/google-maps` | `GOOGLE_MAPS_API_KEY` | `npm run build && node serve-dist.mjs` (`6/15` proxy `/api/*`) |
| `python-fastapi` | Python FastAPI + Web UI | `httpx` + inline JS loader | `GOOGLE_MAPS_API_KEY` | Async BFF + `GET /api/config` (`uvicorn main:app --host 127.0.0.1`) |
| `nodejs-web` | Node.js + Express + TS | `express` + JS loader | `GOOGLE_MAPS_API_KEY` | `npm run build && node dist/server.js` |

See [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md) for stack-specific configuration idioms and runtime gotchas.

## Maps Demo Key vs. Cloud Billing Key Coverage

- **Free Prototyping (Maps Demo Key):** Mint a zero-billing [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) (daily reset limit, **prototyping only — not for production**). Covers Maps JS, Photorealistic 3D, Places (New), Routes, Geocoding, Street View, and Weather.
- **Full Demo Key Solutions (7/15):** [`driving-and-geofencing`](./driving-and-geofencing/), [`ev-charging-map-and-dispatch`](./ev-charging-map-and-dispatch/), [`neighborhood-discovery`](./neighborhood-discovery/), [`real-estate`](./real-estate/), [`ridesharing-and-tracker`](./ridesharing-and-tracker/), [`store-locator`](./store-locator/), [`storefront-sample`](./storefront-sample/)
- **Cloud Billing Key Required (8/15):** [`3d-trail-explorer`](./3d-trail-explorer/) (Elevation API (REST)), [`complete-heatmap`](./complete-heatmap/) (Elevation API (REST)), [`environmental-dashboard`](./environmental-dashboard/) (Air Quality API, Pollen API, Solar API), [`itinerary-planner`](./itinerary-planner/) (Time Zone API), [`live-order-tracking`](./live-order-tracking/) (Address Validation API, Maps Static API), [`logistics-and-routing`](./logistics-and-routing/) (Roads API), [`spatial-intelligence`](./spatial-intelligence/) (Elevation API (REST)), [`travel-route-comparator`](./travel-route-comparator/) (Elevation API (REST))

## Quickstart (Any Sample)

```bash
cd <solution-id>/<framework>     # e.g., cd store-locator/nextjs
cp .env.example .env.local       # or .env — check the sample's README.md
# Add your Maps Demo Key or restricted Google Cloud API key
# Follow the exact install, build, and 127.0.0.1 serve commands in that folder's README.md
```

## Navigation

- [`AGENTS.md`](./AGENTS.md) — Agent routing handbook & overlap disambiguation
- [`BY_API.md`](./BY_API.md) — Reverse lookup by GMP API, REST headers, error fixes & legacy migrations
- [`BY_FRAMEWORK.md`](./BY_FRAMEWORK.md) — Stack idioms, compiler settings & runtime pitfalls
- [`INDEX.md`](./INDEX.md) — Compact master table with all screenshots & verification reports
- [`llms.txt`](./llms.txt) & [`catalog.json`](./catalog.json) — Single-fetch LLM & machine-readable indexes

---

## Google Maps Platform Compliance & Licensing Notice

1. **Cost Notice:** *"Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account."* (Use a [Maps Demo Key](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0) for zero-cost prototyping only; Demo Keys have a daily reset quota and are not for production.)
2. **API Key Restrictions:** Restrict production browser keys by HTTP referrer and server BFF keys by IP address + designated APIs via [Add API Key Restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentsamples_v1.0.0).
3. **License Scope:** Google-sourced code snippets are provided "as-is" under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). This license covers only Google-sourced snippets, not full generated projects. Developers are responsible for security review, testing, and compliance.
4. **Terms of Service & Policies:** Use of these samples is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_git_agentsamples_v1.0.0), including [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms?utm_campaign=gmp_git_agentsamples_v1.0.0) and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?utm_campaign=gmp_git_agentsamples_v1.0.0). Do not train AI/ML models on Google Maps Platform content or cache non-`place_id` Places data in violation of Terms; ensure explicit user consent and AUP compliance for high-risk or workforce location-tracking workflows.
