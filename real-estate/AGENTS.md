# AGENTS.md — `real-estate` (Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer)

> **Category:** Real Estate & Property Mapping | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Zillow-style split screen + custom HTML price-pill `AdvancedMarkerElement` with bidirectional hover sync + `MarkerClusterer` + cadastral parcel polygons + Terra Draw search-area filter + Street View + `RouteMatrix` commute times.
- **Prompt / Search Triggers:** `real estate`, `zillow map`, `price pill marker`, `hover highlight marker`, `parcel polygon`, `draw search area`, `commute calculator`, `marker clustering`
- **API Key Requirement:** Full Maps Demo Key support (prototyping only)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Geocoding`, `Street View`, `MarkerClusterer`, `Terra Draw`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (980x836) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Map & Markers:** [`src/components/ListingDetailPanel.tsx`](./react-vite/src/components/ListingDetailPanel.tsx), [`src/components/RealEstateMap.tsx`](./react-vite/src/components/RealEstateMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/ListingDetailPanel.tsx`](./react-vite/src/components/ListingDetailPanel.tsx), [`src/components/TopSearchBar.tsx`](./react-vite/src/components/TopSearchBar.tsx)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/components/RealEstateMap.tsx`](./nextjs/src/components/RealEstateMap.tsx), [`src/components/StreetViewPreview.tsx`](./nextjs/src/components/StreetViewPreview.tsx)
- **Places, Routes & Geo Services:** [`src/components/CommuteCalculatorPanel.tsx`](./nextjs/src/components/CommuteCalculatorPanel.tsx), [`src/components/NearbyAmenitiesPanel.tsx`](./nextjs/src/components/NearbyAmenitiesPanel.tsx), [`src/components/TopSearchBar.tsx`](./nextjs/src/components/TopSearchBar.tsx)
- **Backend API Proxy:** [`src/app/api/places/nearby/route.ts`](./nextjs/src/app/api/places/nearby/route.ts), [`src/app/api/places/search-text/route.ts`](./nextjs/src/app/api/places/search-text/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./nextjs/src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/lib/components/ListingDetailPanel.svelte`](./sveltekit/src/lib/components/ListingDetailPanel.svelte), [`src/lib/components/RealEstateMap.svelte`](./sveltekit/src/lib/components/RealEstateMap.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/TopFilterBar.svelte`](./sveltekit/src/lib/components/TopFilterBar.svelte), [`src/lib/maps/services.ts`](./sveltekit/src/lib/maps/services.ts)
- **Backend API Proxy:** [`src/routes/api/places/nearby/+server.ts`](./sveltekit/src/routes/api/places/nearby/+server.ts), [`src/routes/api/places/search-text/+server.ts`](./sveltekit/src/routes/api/places/search-text/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./sveltekit/src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./sveltekit/src/routes/api/routes/matrix/+server.ts)
- **App Entry & Config:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Map & Markers:** [`src/components/ListingDetailPanel.vue`](./vue-vite/src/components/ListingDetailPanel.vue), [`src/components/PropertyMap.vue`](./vue-vite/src/components/PropertyMap.vue)
- **Places, Routes & Geo Services:** [`src/components/TopFilterBar.vue`](./vue-vite/src/components/TopFilterBar.vue), [`src/services/placesService.ts`](./vue-vite/src/services/placesService.ts), [`src/services/routesService.ts`](./vue-vite/src/services/routesService.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html), [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/components/listing-detail/listing-detail.component.ts`](./angular/src/app/components/listing-detail/listing-detail.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/google-maps.service.ts`](./angular/src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Geo Libraries:** `@googlemaps/markerclusterer`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
