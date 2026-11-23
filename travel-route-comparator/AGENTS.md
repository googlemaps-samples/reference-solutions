# AGENTS.md — `travel-route-comparator` (Multi-Modal Commute Comparator & Trail Elevation Tracker)

> **Category:** Travel, Navigation & Itineraries | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** 4-mode commute comparator (Driving/Cycling/Walking/Transit) + Avoid Tolls/Highways & Eco-Friendly toggles + `BicyclingLayer` + Elevation API path profile chart synced with map hover marker.
- **Prompt / Search Triggers:** `commute comparator`, `multi-modal routing`, `avoid tolls`, `avoid highways`, `eco routing`, `BicyclingLayer`, `trail elevation chart`
- **API Key Requirement:** Requires billed Google Cloud key for: Elevation API (REST)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Eco-Routing`, `Elevation`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1080x622) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1030x626) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/components/RouteMap.tsx`](./react-vite/src/components/RouteMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlacePicker.tsx`](./react-vite/src/components/PlacePicker.tsx), [`src/services/mapsService.ts`](./react-vite/src/services/mapsService.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1030x626) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`src/components/RouteMap.tsx`](./nextjs/src/components/RouteMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlacePicker.tsx`](./nextjs/src/components/PlacePicker.tsx), [`src/components/TravelComparatorApp.tsx`](./nextjs/src/components/TravelComparatorApp.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/profile/route.ts`](./nextjs/src/app/api/elevation/profile/route.ts), [`src/app/api/places/autocomplete/route.ts`](./nextjs/src/app/api/places/autocomplete/route.ts), [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Client JS SDK | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x626) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/elevation.ts`](./sveltekit/src/lib/maps/elevation.ts), [`src/lib/maps/places.ts`](./sveltekit/src/lib/maps/places.ts), [`src/lib/maps/routes.ts`](./sveltekit/src/lib/maps/routes.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1030x626) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/App.vue`](./vue-vite/src/App.vue)
- **Places, Routes & Geo Services:** [`src/components/PlaceSearchInput.vue`](./vue-vite/src/components/PlaceSearchInput.vue), [`src/services/mapsClient.ts`](./vue-vite/src/services/mapsClient.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x626) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html)
- **Places, Routes & Geo Services:** [`src/app/components/place-picker/place-picker.component.ts`](./angular/src/app/components/place-picker/place-picker.component.ts), [`src/app/services/route-comparator.service.ts`](./angular/src/app/services/route-comparator.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x632) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x742) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/gmpClient.ts`](./nodejs-web/src/gmpClient.ts), [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
