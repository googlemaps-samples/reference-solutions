# AGENTS.md — `ev-charging-map-and-dispatch` (On-Demand Local Services & EV Roadside Dispatch)

> **Category:** Local Discovery & Storefronts | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Draggable user pin with reverse geocode + configurable 5–15 km search ring + `Place.searchNearby` (`evChargeOptions`) + driving ETA ranking & turn-by-turn dispatch route.
- **Prompt / Search Triggers:** `ev charging`, `evChargeOptions`, `draggable AdvancedMarkerElement`, `roadside dispatch`, `configurable radius`, `nearby search`
- **API Key Requirement:** Full Maps Demo Key support (prototyping only)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Route Matrix`, `Geocoding`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x829) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x795) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/components/DispatchMap.tsx`](./react-vite/src/components/DispatchMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/HeaderBar.tsx`](./react-vite/src/components/HeaderBar.tsx), [`src/services/reverseGeocode.ts`](./react-vite/src/services/reverseGeocode.ts), [`src/services/routeDispatch.ts`](./react-vite/src/services/routeDispatch.ts), [`src/services/routeMatrix.ts`](./react-vite/src/services/routeMatrix.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x833) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`src/components/DispatchMap.tsx`](./nextjs/src/components/DispatchMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/PlaceAutocompleteInput.tsx`](./nextjs/src/components/PlaceAutocompleteInput.tsx), [`src/lib/dispatch-client.ts`](./nextjs/src/lib/dispatch-client.ts)
- **Backend API Proxy:** [`src/app/api/geocode/reverse/route.ts`](./nextjs/src/app/api/geocode/reverse/route.ts), [`src/app/api/places/nearby/route.ts`](./nextjs/src/app/api/places/nearby/route.ts), [`src/app/api/places/search-text/route.ts`](./nextjs/src/app/api/places/search-text/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts), [`src/app/api/routes/matrix/route.ts`](./nextjs/src/app/api/routes/matrix/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Client JS SDK | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1030x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/dispatchService.ts`](./sveltekit/src/lib/dispatchService.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1030x795) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/App.vue`](./vue-vite/src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./vue-vite/src/App.vue), [`src/services/googleMapsDispatch.ts`](./vue-vite/src/services/googleMapsDispatch.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x785) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/google-maps.service.ts`](./angular/src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x785) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/geocode/reverse`, `/api/places/nearby`, `/api/places/search-text`, `/api/routes/compute`, `/api/routes/matrix`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
