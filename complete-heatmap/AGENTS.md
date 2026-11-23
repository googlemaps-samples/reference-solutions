# AGENTS.md — `complete-heatmap` (Disaster Hazard Heatmap, Civic Incident & Safe Shelter Router)

> **Category:** Environmental & Civic Intelligence | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** deck.gl `HeatmapLayer` (replaces deprecated Maps JS `HeatmapLayer`) + flood polygon + hazard-avoiding shelter route + map-click Weather/Elevation/Geocode incident reporter.
- **Prompt / Search Triggers:** `heatmap`, `deck.gl HeatmapLayer`, `disaster hazard`, `avoid polygon route`, `incident reporter`, `shelter routing`
- **API Key Requirement:** Requires billed Google Cloud key for: Elevation API (REST)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Geocoding`, `Elevation`, `Weather API`, `deck.gl`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1036x844) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Map & Markers:** [`src/components/map/DeckGlHeatmapOverlay.tsx`](./react-vite/src/components/map/DeckGlHeatmapOverlay.tsx), [`src/components/map/EvacuationRouteLayer.tsx`](./react-vite/src/components/map/EvacuationRouteLayer.tsx), [`src/components/map/ShelterMarkers.tsx`](./react-vite/src/components/map/ShelterMarkers.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./react-vite/src/components/PlaceAutocompleteInput.tsx), [`src/services/enrichmentService.ts`](./react-vite/src/services/enrichmentService.ts), [`src/services/routingService.ts`](./react-vite/src/services/routingService.ts), [`src/services/shelterService.ts`](./react-vite/src/services/shelterService.ts), [`src/services/weatherService.ts`](./react-vite/src/services/weatherService.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`
- **Map & Markers:** [`src/components/DeckGlHeatmapOverlay.tsx`](./nextjs/src/components/DeckGlHeatmapOverlay.tsx), [`src/components/HazardMapCanvas.tsx`](./nextjs/src/components/HazardMapCanvas.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteBox.tsx`](./nextjs/src/components/PlaceAutocompleteBox.tsx), [`src/components/StormWatchDashboard.tsx`](./nextjs/src/components/StormWatchDashboard.tsx), [`src/lib/flood-routing.ts`](./nextjs/src/lib/flood-routing.ts)
- **Backend API Proxy:** [`src/app/api/elevation/route.ts`](./nextjs/src/app/api/elevation/route.ts), [`src/app/api/geocode/reverse/route.ts`](./nextjs/src/app/api/geocode/reverse/route.ts), [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts), [`src/app/api/weather/current/route.ts`](./nextjs/src/app/api/weather/current/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1035x844) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Map & Markers:** [`src/lib/maps/heatmapOverlay.ts`](./sveltekit/src/lib/maps/heatmapOverlay.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/gmpClient.ts`](./sveltekit/src/lib/maps/gmpClient.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Map & Markers:** [`src/components/HazardMap.vue`](./vue-vite/src/components/HazardMap.vue)
- **Places, Routes & Geo Services:** [`src/services/incidentEnrichment.ts`](./vue-vite/src/services/incidentEnrichment.ts), [`src/services/shelterRouting.ts`](./vue-vite/src/services/shelterRouting.ts), [`src/services/weatherService.ts`](./vue-vite/src/services/weatherService.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Geo Libraries:** `deck.gl`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)
- **Places, Routes & Geo Services:** [`src/app/services/hazard-intelligence.service.ts`](./angular/src/app/services/hazard-intelligence.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`
- **Geo Libraries:** `deck.gl`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/geocode/reverse`, `/api/places/search`, `/api/routes/compute`, `/api/weather/current`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
