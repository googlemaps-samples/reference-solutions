# AGENTS.md — `itinerary-planner` (Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub)

> **Category:** Travel, Navigation & Itineraries | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Multi-day Tokyo trip tabs + Time Zone API local clock/UTC offset + numbered day-colored markers + `optimizeWaypointOrder` daily route + Places photos & Street View preview.
- **Prompt / Search Triggers:** `itinerary planner`, `time zone api`, `multi-day trip`, `numbered markers`, `hotel discovery`, `street view preview`
- **API Key Requirement:** Requires billed Google Cloud key for: Time Zone API
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Street View`, `Time Zone`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x592) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/timezone`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client + Local Proxy (Vite Middleware) | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1010x596) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/timezone`
- **Map & Markers:** [`src/components/MapWorkspace.tsx`](./react-vite/src/components/MapWorkspace.tsx), [`src/components/StreetViewPanel.tsx`](./react-vite/src/components/StreetViewPanel.tsx)
- **Places, Routes & Geo Services:** [`src/components/DestinationHeader.tsx`](./react-vite/src/components/DestinationHeader.tsx), [`src/services/placesService.ts`](./react-vite/src/services/placesService.ts), [`src/services/routesService.ts`](./react-vite/src/services/routesService.ts), [`src/services/timezoneService.ts`](./react-vite/src/services/timezoneService.ts)
- **Backend API Proxy:** [`vite.config.ts`](./react-vite/vite.config.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1020x587) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`
- **Map & Markers:** [`components/StreetViewPanel.tsx`](./nextjs/components/StreetViewPanel.tsx), [`components/TripMap.tsx`](./nextjs/components/TripMap.tsx)
- **Places, Routes & Geo Services:** [`components/DestinationSearch.tsx`](./nextjs/components/DestinationSearch.tsx), [`components/ItineraryWorkspace.tsx`](./nextjs/components/ItineraryWorkspace.tsx)
- **Backend API Proxy:** [`app/api/places/details/route.ts`](./nextjs/app/api/places/details/route.ts), [`app/api/places/nearby/route.ts`](./nextjs/app/api/places/nearby/route.ts), [`app/api/places/photo/route.ts`](./nextjs/app/api/places/photo/route.ts), [`app/api/places/search/route.ts`](./nextjs/app/api/places/search/route.ts), [`app/api/routes/compute/route.ts`](./nextjs/app/api/routes/compute/route.ts), [`app/api/timezone/route.ts`](./nextjs/app/api/timezone/route.ts)
- **App Entry & Config:** [`app/page.tsx`](./nextjs/app/page.tsx), [`next.config.ts`](./nextjs/next.config.ts)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x596) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/timezone`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps.ts`](./sveltekit/src/lib/maps.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/timezone/+server.ts`](./sveltekit/src/routes/api/timezone/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1020x589) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`src/components/MapAndStreetView.vue`](./vue-vite/src/components/MapAndStreetView.vue)
- **Places, Routes & Geo Services:** [`src/services/placesService.ts`](./vue-vite/src/services/placesService.ts), [`src/services/routesService.ts`](./vue-vite/src/services/routesService.ts), [`src/services/timezoneService.ts`](./vue-vite/src/services/timezoneService.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x596) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/timezone`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html), [`src/app/components/street-view-panel/street-view-panel.component.ts`](./angular/src/app/components/street-view-panel/street-view-panel.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/places-discovery.service.ts`](./angular/src/app/services/places-discovery.service.ts), [`src/app/services/routes-planner.service.ts`](./angular/src/app/services/routes-planner.service.ts), [`src/app/services/timezone.service.ts`](./angular/src/app/services/timezone.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x596) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1020x596) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/details`, `/api/places/nearby`, `/api/places/photo`, `/api/places/search`, `/api/routes/compute`, `/api/timezone`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
