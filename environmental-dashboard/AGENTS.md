# AGENTS.md — `environmental-dashboard` (Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard)

> **Category:** Environmental & Civic Intelligence | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Weather API (current + forecast) + Air Quality API (AQI + WebGL-free `ImageMapType` `US_AQI` heatmap tiles) + Pollen API + Solar API rooftop `buildingInsights:findClosest` (with 404 handling).
- **Prompt / Search Triggers:** `weather api`, `air quality`, `aqi heatmap tiles`, `pollen api`, `solar api`, `rooftop solar`, `ImageMapType`
- **API Key Requirement:** Requires billed Google Cloud key for: Air Quality API, Pollen API, Solar API
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Geocoding`, `Weather API`, `Air Quality`, `Pollen API`, `Solar API`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1020x829) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/components/EnvironmentalMap.tsx`](./react-vite/src/components/EnvironmentalMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/EnvironmentalMap.tsx`](./react-vite/src/components/EnvironmentalMap.tsx), [`src/components/PlacesSearchInput.tsx`](./react-vite/src/components/PlacesSearchInput.tsx), [`src/services/environmentalApi.ts`](./react-vite/src/services/environmentalApi.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`components/EnvironmentalMap.tsx`](./nextjs/components/EnvironmentalMap.tsx)
- **Places, Routes & Geo Services:** [`components/EnvironmentalDashboard.tsx`](./nextjs/components/EnvironmentalDashboard.tsx), [`components/EnvironmentalMap.tsx`](./nextjs/components/EnvironmentalMap.tsx), [`components/PlaceAutocompleteControl.tsx`](./nextjs/components/PlaceAutocompleteControl.tsx)
- **Backend API Proxy:** [`app/api/air-quality/current/route.ts`](./nextjs/app/api/air-quality/current/route.ts), [`app/api/air-quality/tiles/route.ts`](./nextjs/app/api/air-quality/tiles/route.ts), [`app/api/places/search-text/route.ts`](./nextjs/app/api/places/search-text/route.ts), [`app/api/pollen/forecast/route.ts`](./nextjs/app/api/pollen/forecast/route.ts), [`app/api/solar/building-insights/route.ts`](./nextjs/app/api/solar/building-insights/route.ts), [`app/api/weather/current/route.ts`](./nextjs/app/api/weather/current/route.ts), [`app/api/weather/forecast/route.ts`](./nextjs/app/api/weather/forecast/route.ts)
- **App Entry & Config:** [`app/page.tsx`](./nextjs/app/page.tsx), [`next.config.ts`](./nextjs/next.config.ts)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`src/lib/components/GoogleMapPanel.svelte`](./sveltekit/src/lib/components/GoogleMapPanel.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/GoogleMapPanel.svelte`](./sveltekit/src/lib/components/GoogleMapPanel.svelte), [`src/lib/components/HeaderBar.svelte`](./sveltekit/src/lib/components/HeaderBar.svelte), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/air-quality/current/+server.ts`](./sveltekit/src/routes/api/air-quality/current/+server.ts), [`src/routes/api/air-quality/tiles/+server.ts`](./sveltekit/src/routes/api/air-quality/tiles/+server.ts), [`src/routes/api/places/search-text/+server.ts`](./sveltekit/src/routes/api/places/search-text/+server.ts), [`src/routes/api/pollen/forecast/+server.ts`](./sveltekit/src/routes/api/pollen/forecast/+server.ts), [`src/routes/api/solar/building-insights/+server.ts`](./sveltekit/src/routes/api/solar/building-insights/+server.ts), [`src/routes/api/weather/current/+server.ts`](./sveltekit/src/routes/api/weather/current/+server.ts), [`src/routes/api/weather/forecast/+server.ts`](./sveltekit/src/routes/api/weather/forecast/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/components/MapCanvas.vue`](./vue-vite/src/components/MapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/MapCanvas.vue`](./vue-vite/src/components/MapCanvas.vue), [`src/components/TopHeaderBar.vue`](./vue-vite/src/components/TopHeaderBar.vue), [`src/services/environmentalApi.ts`](./vue-vite/src/services/environmentalApi.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`src/app/components/environmental-map/environmental-map.component.ts`](./angular/src/app/components/environmental-map/environmental-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/environmental-map/environmental-map.component.ts`](./angular/src/app/components/environmental-map/environmental-map.component.ts), [`src/app/components/header-bar/header-bar.component.ts`](./angular/src/app/components/header-bar/header-bar.component.ts), [`src/app/services/environmental-api.service.ts`](./angular/src/app/services/environmental-api.service.ts), [`src/app/services/maps-loader.service.ts`](./angular/src/app/services/maps-loader.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/air-quality/current`, `/api/air-quality/tiles`, `/api/air-quality/tiles/:mapType/:zoom/:x/:y`, `/api/places/search-text`, `/api/pollen/forecast`, `/api/solar/building-insights`, `/api/weather/current`, `/api/weather/forecast`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
