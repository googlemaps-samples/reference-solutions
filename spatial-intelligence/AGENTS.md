# AGENTS.md — `spatial-intelligence` (Enterprise GIS Workbench, GeoJSON Zones & Deck.gl Analytics)

> **Category:** Advanced Spatial Analytics & 3D | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** 2D Enterprise Web GIS workbench: basemap switcher (roadmap/satellite/hybrid/terrain) + GeoJSON Data Layer styled by capacity + deck.gl `ScatterplotLayer`/`HexagonLayer` + Terra Draw study-zone point filter + Elevation.
- **Prompt / Search Triggers:** `web gis`, `geojson data layer`, `deck.gl ScatterplotLayer`, `deck.gl HexagonLayer`, `basemap switcher`, `terra draw filter`
- **API Key Requirement:** Requires billed Google Cloud key for: Elevation API (REST)
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Elevation`, `deck.gl`, `Terra Draw`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Map & Markers:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/DeckGlSensorsOverlay.tsx`](./react-vite/src/components/DeckGlSensorsOverlay.tsx), [`src/components/TerraDrawController.tsx`](./react-vite/src/components/TerraDrawController.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/AnalyticsSidebar.tsx`](./react-vite/src/components/AnalyticsSidebar.tsx), [`src/components/PlaceAutocompleteControl.tsx`](./react-vite/src/components/PlaceAutocompleteControl.tsx)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`src/components/DeckGlOverlay.tsx`](./nextjs/src/components/DeckGlOverlay.tsx), [`src/components/GisWorkbench.tsx`](./nextjs/src/components/GisWorkbench.tsx), [`src/components/TerraDrawController.tsx`](./nextjs/src/components/TerraDrawController.tsx)
- **Places, Routes & Geo Services:** [`src/components/GisWorkbench.tsx`](./nextjs/src/components/GisWorkbench.tsx), [`src/components/PlaceSearchBox.tsx`](./nextjs/src/components/PlaceSearchBox.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/route.ts`](./nextjs/src/app/api/elevation/route.ts), [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1060x833) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`src/lib/maps/deckLayers.ts`](./sveltekit/src/lib/maps/deckLayers.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/elevation/+server.ts`](./sveltekit/src/routes/api/elevation/+server.ts), [`src/routes/api/places/search/+server.ts`](./sveltekit/src/routes/api/places/search/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Map & Markers:** [`src/composables/useGisWorkbench.ts`](./vue-vite/src/composables/useGisWorkbench.ts)
- **Places, Routes & Geo Services:** [`src/components/AnalyticsSidebar.vue`](./vue-vite/src/components/AnalyticsSidebar.vue), [`src/composables/useGisWorkbench.ts`](./vue-vite/src/composables/useGisWorkbench.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1060x833) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html), [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/spatial-gis.service.ts`](./angular/src/app/services/spatial-gis.service.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/spatial-gis.service.ts`](./angular/src/app/services/spatial-gis.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js), [`static/index.html`](./python-fastapi/static/index.html)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1060x844) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `marker`, `places`
- **Geo Libraries:** `deck.gl`, `terra-draw`
- **Actual `/api/*` Proxy Routes:** `/api/elevation`, `/api/places/search`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js), [`scripts/vendor-entry.mjs`](./nodejs-web/scripts/vendor-entry.mjs)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
