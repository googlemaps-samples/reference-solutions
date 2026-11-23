# AGENTS.md — `ridesharing-and-tracker` (Rideshare Booking, Fare Estimator & Live Driver Tracking)

> **Category:** Logistics, Dispatch & Tracking | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Fastest vs. Eco-Friendly (`FUEL_EFFICIENT` / `FUEL_CONSUMPTION`) side-by-side route comparison + Economy/Comfort/Green fare estimator + closest-driver dispatch & animated marker along polyline.
- **Prompt / Search Triggers:** `rideshare`, `eco-friendly routing`, `FUEL_EFFICIENT`, `fuel savings`, `fare estimator`, `animated driver marker`
- **API Key Requirement:** Full Maps Demo Key support (prototyping only)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Eco-Routing`, `Route Matrix`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x844) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/components/RideshareMap.tsx`](./react-vite/src/components/RideshareMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./react-vite/src/components/PlaceAutocompleteInput.tsx), [`src/services/mapsService.ts`](./react-vite/src/services/mapsService.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/components/RideshareMap.tsx`](./nextjs/src/components/RideshareMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./nextjs/src/components/PlaceAutocompleteInput.tsx), [`src/components/RideshareWorkspace.tsx`](./nextjs/src/components/RideshareWorkspace.tsx)
- **Backend API Proxy:** [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./nextjs/src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.mjs`](./nextjs/next.config.mjs), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./sveltekit/src/lib/maps.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/places/search/+server.ts`](./sveltekit/src/routes/api/places/search/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./sveltekit/src/routes/api/routes/compute/+server.ts), [`src/routes/api/routes/matrix/+server.ts`](./sveltekit/src/routes/api/routes/matrix/+server.ts)
- **App Entry & Config:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1024x844) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/composables/useRideshareMap.ts`](./vue-vite/src/composables/useRideshareMap.ts)
- **Places, Routes & Geo Services:** [`src/composables/useRideshareMap.ts`](./vue-vite/src/composables/useRideshareMap.ts), [`src/utils/drivers.ts`](./vue-vite/src/utils/drivers.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/app/components/rideshare-map/rideshare-map.component.ts`](./angular/src/app/components/rideshare-map/rideshare-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/place-autocomplete-input/place-autocomplete-input.component.ts`](./angular/src/app/components/place-autocomplete-input/place-autocomplete-input.component.ts), [`src/app/services/rideshare-routing.service.ts`](./angular/src/app/services/rideshare-routing.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1032x844) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x844) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/places/search`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
