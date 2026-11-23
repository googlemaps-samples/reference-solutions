# AGENTS.md — `storefront-sample` (Single-Venue Storefront, Booking & Get Directions Hub)

> **Category:** Local Discovery & Storefronts | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Single-venue clinic booking hub + branded `AdvancedMarkerElement` + toggleable service-area `Circle` + synchronized `StreetViewPanorama` entrance + live Places reviews/hours/photo proxy + Driving/Transit/Walking directions.
- **Prompt / Search Triggers:** `storefront`, `single venue`, `appointment booking`, `get directions`, `street view entrance`, `place reviews`, `places photo proxy`
- **API Key Requirement:** Full Maps Demo Key support (prototyping only)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Street View`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`src/components/ClinicMapViewport.tsx`](./react-vite/src/components/ClinicMapViewport.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/ClinicMapViewport.tsx`](./react-vite/src/components/ClinicMapViewport.tsx), [`src/components/DirectionsPanel.tsx`](./react-vite/src/components/DirectionsPanel.tsx)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`src/components/ClinicMapViewport.tsx`](./nextjs/src/components/ClinicMapViewport.tsx)
- **Places, Routes & Geo Services:** [`src/components/OriginAutocompleteInput.tsx`](./nextjs/src/components/OriginAutocompleteInput.tsx), [`src/components/StorefrontApp.tsx`](./nextjs/src/components/StorefrontApp.tsx), [`src/components/VenueDetailsCard.tsx`](./nextjs/src/components/VenueDetailsCard.tsx)
- **Backend API Proxy:** [`src/app/api/places/photo/route.ts`](./nextjs/src/app/api/places/photo/route.ts), [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Client JS SDK | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`src/lib/maps/google-maps.ts`](./sveltekit/src/lib/maps/google-maps.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/maps/google-maps.ts`](./sveltekit/src/lib/maps/google-maps.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`src/components/StorefrontMapPane.vue`](./vue-vite/src/components/StorefrontMapPane.vue)
- **Places, Routes & Geo Services:** [`src/components/DirectionsPlannerCard.vue`](./vue-vite/src/components/DirectionsPlannerCard.vue), [`src/services/placesAndRoutes.ts`](./vue-vite/src/services/placesAndRoutes.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (950x802) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Map & Markers:** [`src/app/components/clinic-map/clinic-map.component.ts`](./angular/src/app/components/clinic-map/clinic-map.component.ts)
- **Places, Routes & Geo Services:** [`src/app/components/directions-planner/directions-planner.component.ts`](./angular/src/app/components/directions-planner/directions-planner.component.ts), [`src/app/services/google-maps.service.ts`](./angular/src/app/services/google-maps.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x540) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `routes`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`, `streetView`
- **Actual `/api/*` Proxy Routes:** `/api/places/photo`, `/api/places/search`, `/api/routes/compute`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
