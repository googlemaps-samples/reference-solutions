# AGENTS.md — `3d-trail-explorer` (Photorealistic 3D Map Explorer, Camera Tour & 3D Trail Route)

> **Category:** Advanced Spatial Analytics & 3D | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** ONLY Photorealistic 3D (`<gmp-map-3d>` / `Map3DElement`) app; extruded red `Polyline3DElement`, `Marker3DInteractiveElement` + `PopoverElement`, `flyCameraTo` chapter tour, Elevation profile.
- **Prompt / Search Triggers:** `3d map`, `photorealistic 3d`, `gmp-map-3d`, `Map3DElement`, `flyCameraTo`, `Polyline3DElement`, `3d trail`, `elevation profile`
- **API Key Requirement:** Requires billed Google Cloud key for: Elevation API (REST)
- **Verified Modern APIs:** `Maps JS 2D`, `Photorealistic 3D`, `Places (New)`, `Elevation`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1080x829) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Map & Markers:** [`index.html`](./static-vanilla-js/index.html)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html), [`server.mjs`](./static-vanilla-js/server.mjs)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1440x900) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `elevation`, `maps3d`, `places`
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/TopBar.tsx`](./react-vite/src/components/TopBar.tsx)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx), [`vite.config.ts`](./react-vite/vite.config.ts)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1065x821) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `maps3d`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`
- **Places, Routes & Geo Services:** [`src/components/PlaceSearchBar.tsx`](./nextjs/src/components/PlaceSearchBar.tsx), [`src/components/TrailExplorerApp.tsx`](./nextjs/src/components/TrailExplorerApp.tsx)
- **Backend API Proxy:** [`src/app/api/elevation/profile/route.ts`](./nextjs/src/app/api/elevation/profile/route.ts), [`src/app/api/places/autocomplete/route.ts`](./nextjs/src/app/api/places/autocomplete/route.ts), [`src/app/api/places/search/route.ts`](./nextjs/src/app/api/places/search/route.ts)
- **App Entry & Config:** [`next.config.mjs`](./nextjs/next.config.mjs), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1080x829) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `core`, `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/elevation/profile/+server.ts`](./sveltekit/src/routes/api/elevation/profile/+server.ts), [`src/routes/api/places/autocomplete/+server.ts`](./sveltekit/src/routes/api/places/autocomplete/+server.ts), [`src/routes/api/places/search/+server.ts`](./sveltekit/src/routes/api/places/search/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1440x900) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Map & Markers:** [`src/App.vue`](./vue-vite/src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./vue-vite/src/App.vue)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client JS SDK | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1440x900) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Map & Markers:** [`src/app/components/trail-map-2d/trail-map-2d.component.ts`](./angular/src/app/components/trail-map-2d/trail-map-2d.component.ts), [`src/app/components/trail-map-3d/trail-map-3d.component.ts`](./angular/src/app/components/trail-map-3d/trail-map-3d.component.ts)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/services/trail-geospatial.service.ts`](./angular/src/app/services/trail-geospatial.service.ts)
- **App Entry & Config:** [`serve-dist.mjs`](./angular/serve-dist.mjs), [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1080x840) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`
- **Map & Markers:** [`static/index.html`](./python-fastapi/static/index.html)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1440x900) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `elevation`, `maps`, `maps3d`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/elevation/profile`, `/api/places/autocomplete`, `/api/places/search`
- **Map & Markers:** [`public/index.html`](./nodejs-web/public/index.html)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js), [`public/index.html`](./nodejs-web/public/index.html)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
