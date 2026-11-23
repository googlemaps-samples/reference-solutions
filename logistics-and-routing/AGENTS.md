# AGENTS.md — `logistics-and-routing` (Fleet Telematics, Road-Snapped GPS & Dispatch Dashboard)

> **Category:** Logistics, Dispatch & Tracking | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Roads API `snapToRoads` (raw noisy GPS vs. road-snapped polyline) + `TrafficLayer` + status-coded fleet markers (En Route/Delayed/Idle) + depot-to-hub `RouteMatrix`.
- **Prompt / Search Triggers:** `roads api`, `snapToRoads`, `gps breadcrumbs`, `fleet telematics`, `TrafficLayer`, `depot dispatch`, `route matrix`
- **API Key Requirement:** Requires billed Google Cloud key for: Roads API
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Roads API`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x844) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client + Local Proxy (Vite Middleware) | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/roads/snap`
- **Map & Markers:** [`src/components/VehicleMarkers.tsx`](./react-vite/src/components/VehicleMarkers.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceSearchBar.tsx`](./react-vite/src/components/PlaceSearchBar.tsx), [`src/services/roadsService.ts`](./react-vite/src/services/roadsService.ts), [`src/services/routingService.ts`](./react-vite/src/services/routingService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./react-vite/vite.config.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/components/MapOverlays.tsx`](./nextjs/src/components/MapOverlays.tsx)
- **Places, Routes & Geo Services:** [`src/components/FleetDashboardClient.tsx`](./nextjs/src/components/FleetDashboardClient.tsx), [`src/components/PlaceAutocompleteBox.tsx`](./nextjs/src/components/PlaceAutocompleteBox.tsx)
- **Backend API Proxy:** [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts), [`src/app/api/roads/snap/route.ts`](./nextjs/src/app/api/roads/snap/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./nextjs/src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/lib/components/DispatchMap.svelte`](./sveltekit/src/lib/components/DispatchMap.svelte)
- **Places, Routes & Geo Services:** [`src/lib/components/TopCommandBar.svelte`](./sveltekit/src/lib/components/TopCommandBar.svelte), [`src/lib/maps/services.ts`](./sveltekit/src/lib/maps/services.ts)
- **Backend API Proxy:** [`src/routes/api/places/search/+server.ts`](./sveltekit/src/routes/api/places/search/+server.ts), [`src/routes/api/roads/snap/+server.ts`](./sveltekit/src/routes/api/roads/snap/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./sveltekit/src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./sveltekit/src/routes/api/routes/matrix/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client + Local Proxy (Vite Middleware) | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/roads/snap`
- **Map & Markers:** [`src/components/FleetMapCanvas.vue`](./vue-vite/src/components/FleetMapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/TopCommandBar.vue`](./vue-vite/src/components/TopCommandBar.vue), [`src/services/dispatchService.ts`](./vue-vite/src/services/dispatchService.ts), [`src/services/roadsService.ts`](./vue-vite/src/services/roadsService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./vue-vite/vite.config.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/app/app.html`](./angular/src/app/app.html)
- **Places, Routes & Geo Services:** [`src/app/app.ts`](./angular/src/app/app.ts), [`src/app/services/telematics-api.service.ts`](./angular/src/app/services/telematics-api.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/roads/snap`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
