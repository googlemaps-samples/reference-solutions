# AGENTS.md — `neighborhood-discovery` (Hyperlocal Neighborhood Directory & Spot Mapper)

> **Category:** Local Discovery & Storefronts | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** 5 km category `Place.searchNearby` (restaurants/cafes/museums/parks) + side-by-side place comparison drawer (ratings, hours, reviews, photo proxy) + map-click reverse-geocode spot pinning.
- **Prompt / Search Triggers:** `neighborhood directory`, `nearby places`, `place comparison`, `reverse geocode click`, `community spot mapper`
- **API Key Requirement:** Full Maps Demo Key support (prototyping only)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Geocoding`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/components/NeighborhoodMap.tsx`](./react-vite/src/components/NeighborhoodMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/HeaderBar.tsx`](./react-vite/src/components/HeaderBar.tsx), [`src/utils/placeMapper.ts`](./react-vite/src/utils/placeMapper.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x833) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `geocoding`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`
- **Map & Markers:** [`app/components/MapCanvas.tsx`](./nextjs/app/components/MapCanvas.tsx)
- **Places, Routes & Geo Services:** [`app/components/NeighborhoodExplorer.tsx`](./nextjs/app/components/NeighborhoodExplorer.tsx), [`app/components/PlaceAutocompleteInput.tsx`](./nextjs/app/components/PlaceAutocompleteInput.tsx), [`lib/gmp-client-fallback.ts`](./nextjs/lib/gmp-client-fallback.ts), [`lib/gmp-server.ts`](./nextjs/lib/gmp-server.ts)
- **Backend API Proxy:** [`app/api/geocode/route.ts`](./nextjs/app/api/geocode/route.ts), [`app/api/places/details/route.ts`](./nextjs/app/api/places/details/route.ts), [`app/api/places/nearby/route.ts`](./nextjs/app/api/places/nearby/route.ts), [`app/api/places/photo/route.ts`](./nextjs/app/api/places/photo/route.ts), [`app/api/places/search/route.ts`](./nextjs/app/api/places/search/route.ts)
- **App Entry & Config:** [`app/page.tsx`](./nextjs/app/page.tsx), [`next.config.mjs`](./nextjs/next.config.mjs)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Client JS SDK | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./sveltekit/src/lib/maps.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/components/MapCanvas.vue`](./vue-vite/src/components/MapCanvas.vue)
- **Places, Routes & Geo Services:** [`src/components/HeaderBar.vue`](./vue-vite/src/components/HeaderBar.vue), [`src/services/googleMaps.ts`](./vue-vite/src/services/googleMaps.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `maps`, `marker`, `places`
- **Map & Markers:** [`src/app/app.ts`](./angular/src/app/app.ts), [`src/app/services/google-maps-loader.service.ts`](./angular/src/app/services/google-maps-loader.service.ts)
- **Places, Routes & Geo Services:** [`src/app/components/header-bar.component.ts`](./angular/src/app/components/header-bar.component.ts), [`src/app/services/google-maps-loader.service.ts`](./angular/src/app/services/google-maps-loader.service.ts), [`src/app/services/neighborhood-discovery.service.ts`](./angular/src/app/services/neighborhood-discovery.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1040x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/geocode`, `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
