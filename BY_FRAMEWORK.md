# Google Maps Platform Samples by Framework (Idioms & Runtime Pitfalls)

Every one of the **15 solutions** in this directory has a complete standalone app for **all 8 frameworks** at `./<solution-id>/<framework>/`.
Instead of repeating 120 identical links, this guide documents the **stack-specific configuration idioms and fatal pitfalls** verified in the working apps, plus curated archetype samples per stack.

- Back to: [`AGENTS.md`](./AGENTS.md) | [`BY_API.md`](./BY_API.md) | [`INDEX.md`](./INDEX.md) | [`README.md`](./README.md)

## Quick Stack Comparison

| Framework | Env Var (`env` file) | Typecheck / Build | Loopback Serve Command |
| :--- | :--- | :--- | :--- |
| [`static-vanilla-js`](#static-vanilla-js) | `GOOGLE_MAPS_API_KEY` (`.env`) | `node --check app.js && node --check server.mjs` | `node server.mjs --host 127.0.0.1 --port {port}` |
| [`react-vite`](#react-vite) | `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | `npx tsc --noEmit` | `npx vite preview --host 127.0.0.1 --port {port} --strictPort` |
| [`nextjs`](#nextjs) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | `npx tsc --noEmit` | `npx next start --hostname 127.0.0.1 --port {port}` |
| [`sveltekit`](#sveltekit) | `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | `npm run check` | `npx vite preview --host 127.0.0.1 --port {port} --strictPort` |
| [`vue-vite`](#vue-vite) | `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | `npx vue-tsc --noEmit` | `npx vite preview --host 127.0.0.1 --port {port} --strictPort` |
| [`angular`](#angular) | `GOOGLE_MAPS_API_KEY` (`.env`) | `npx tsc --noEmit && node --check serve-dist.mjs` | `node serve-dist.mjs --host 127.0.0.1 --port {port}` |
| [`python-fastapi`](#python-fastapi) | `GOOGLE_MAPS_API_KEY` (`.env`) | `.venv/bin/python -m compileall -q -x ^\./?\.venv .` | `.venv/bin/uvicorn main:app --host 127.0.0.1 --port {port}` |
| [`nodejs-web`](#nodejs-web) | `GOOGLE_MAPS_API_KEY` (`.env`) | `npx tsc --noEmit` | `node dist/server.js --host 127.0.0.1 --port {port}` |

## `static-vanilla-js` — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)

- **Core Packages:** `@googlemaps/js-api-loader`
- **Env Variable:** `GOOGLE_MAPS_API_KEY` in `.env` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Zero-bundler ES modules served by `node server.mjs` (`127.0.0.1`) which exposes `/env-config.js` and `/node_modules/` for the importmap (always run `npm install` + `node server.mjs`, not `file://`).
  - Loads Maps JS via `@googlemaps/js-api-loader` v2 (`setOptions` + `importLibrary`) or inline Dynamic Library Import bootstrap.
  - 6/15 solutions proxy CORS-blocked REST APIs inside `server.mjs` under `/api/*`.
  - Strict XSS prevention: zero `innerHTML`/`outerHTML`/`insertAdjacentHTML` — uses `document.createElement()`, `textContent`, and `replaceChildren()` exclusively.
- **Curated Archetype Samples:** [`storefront-sample/static-vanilla-js`](./storefront-sample/static-vanilla-js/AGENTS.md) (Client JS SDK + Street View + Places + Routes); [`environmental-dashboard/static-vanilla-js`](./environmental-dashboard/static-vanilla-js/AGENTS.md) (Local `server.mjs` BFF proxying Weather/AQI/Pollen/Solar); [`3d-trail-explorer/static-vanilla-js`](./3d-trail-explorer/static-vanilla-js/AGENTS.md) (Native `<gmp-map-3d>` Photorealistic 3D + Elevation); [`real-estate/static-vanilla-js`](./real-estate/static-vanilla-js/AGENTS.md) (MarkerClusterer + Terra Draw + Custom HTML Price Pills)

## `react-vite` — React + Vite + TypeScript (@vis.gl/react-google-maps)

- **Core Packages:** `@vis.gl/react-google-maps`, `@types/google.maps`
- **Env Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Uses official `@vis.gl/react-google-maps` (`<APIProvider>`, `Map as GoogleMap`, `<AdvancedMarker>`, `useMapsLibrary`) — alias `Map as GoogleMap` so JavaScript's built-in `Map` constructor is never shadowed.
  - Imperatively mounts `PlaceAutocompleteElement` via `useRef` + `useEffect` and listens to `gmp-select` (avoids React JSX property stringification).
  - Photorealistic 3D uses `@vis.gl/react-google-maps/3d` (`Map3D`, `Polyline3D`, `Marker3D`).
  - Static-host caveat: 3/15 solutions (`itinerary-planner`, `live-order-tracking`, `logistics-and-routing`) proxy CORS-blocked REST APIs via Vite `configureServer`/`configurePreviewServer` middleware in `vite.config.ts` — move those routes to serverless/backend functions before deploying `dist/` to static CDN hosting.
- **Curated Archetype Samples:** [`store-locator/react-vite`](./store-locator/react-vite/AGENTS.md) (Client JS SDK + Custom `AdvancedMarkerElement` MarkerClusterer); [`environmental-dashboard/react-vite`](./environmental-dashboard/react-vite/AGENTS.md) (Direct Browser CORS REST (`?key=`) for Weather/AQI/Pollen/Solar); [`live-order-tracking/react-vite`](./live-order-tracking/react-vite/AGENTS.md) (Vite Middleware Proxy (`/api/address/validate`) + Live Courier); [`3d-trail-explorer/react-vite`](./3d-trail-explorer/react-vite/AGENTS.md) (`@vis.gl/react-google-maps/3d` Photorealistic 3D Trail)

## `nextjs` — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)

- **Core Packages:** `@vis.gl/react-google-maps`, `@types/google.maps`, `next`
- **Env Variable:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - App Router (`'use client'` map components) paired with `app/api/**/route.ts` or `src/app/api/**/route.ts` server Route Handlers (both root `app/` and `src/app/` layouts appear across solutions).
  - Bypasses build-time `NEXT_PUBLIC_*` inlining via `export const dynamic = 'force-dynamic'` + runtime `process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']` bracket lookup passed from the Server Component `page.tsx`; Route Handlers prefer server-only `GOOGLE_MAPS_API_KEY` when set.
  - Never set `output: 'export'` or `output: 'standalone'` in `next.config.*` so `next start` and `/api/*` Route Handlers work together; sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.
- **Curated Archetype Samples:** [`store-locator/nextjs`](./store-locator/nextjs/AGENTS.md) (App Router `/api/routes/matrix` + Custom MarkerClusterer); [`storefront-sample/nextjs`](./storefront-sample/nextjs/AGENTS.md) (Places Text Search + Binary Photo Stream BFF (`/api/places/photo`)); [`environmental-dashboard/nextjs`](./environmental-dashboard/nextjs/AGENTS.md) (Full Environmental BFF Suite + AQI PNG Tile Proxy); [`3d-trail-explorer/nextjs`](./3d-trail-explorer/nextjs/AGENTS.md) (`@vis.gl/react-google-maps/3d` + Elevation BFF Route Handler)

## `sveltekit` — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)

- **Core Packages:** `@googlemaps/js-api-loader`, `@types/google.maps`
- **Env Variable:** `PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Guards all Maps JS loading inside `onMount` so SSR never touches `window`/`document`, reading `$env/dynamic/public` (`PUBLIC_GOOGLE_MAPS_API_KEY`).
  - Svelte 5 runes safety: keep `mapInstance`, markers, polylines, and Maps library handles in plain `let` variables (NEVER `$state(...)`) so reactivity proxies don't corrupt Google Maps class instances.
  - 9/15 solutions include real SvelteKit `src/routes/api/**/+server.ts` BFF endpoints (forwarding `Referer` for single-key compatibility) plus `src/hooks.server.ts` security headers.
- **Curated Archetype Samples:** [`live-order-tracking/sveltekit`](./live-order-tracking/sveltekit/AGENTS.md) (SDK-First + `+server.ts` BFF Fallback + Binary Static Map Proxy); [`environmental-dashboard/sveltekit`](./environmental-dashboard/sveltekit/AGENTS.md) (7 SvelteKit `+server.ts` Environmental BFF Endpoints); [`real-estate/sveltekit`](./real-estate/sveltekit/AGENTS.md) (Terra Draw + MarkerClusterer + Svelte 5 Non-Reactive Handles); [`3d-trail-explorer/sveltekit`](./3d-trail-explorer/sveltekit/AGENTS.md) (Native `<gmp-map-3d>` + `+server.ts` Elevation Proxy)

## `vue-vite` — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)

- **Core Packages:** `@googlemaps/js-api-loader`, `@types/google.maps`
- **Env Variable:** `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Configures `vite.config.ts` with `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('gmp-') } } })` — prevents `[Vue warn]: Failed to resolve component: gmp-*`.
  - Keep Google Maps instances (`Map`, `Map3DElement`, markers, services) in plain non-reactive `let` variables (NOT `ref()` / `reactive()`) to avoid Vue Proxy errors.
  - For 3D (`<gmp-map-3d>`), always `await customElements.whenDefined('gmp-map-3d')` before mutating properties or calling `flyCameraTo()`, and set CSS `display: block`.
  - Static-host caveat: `logistics-and-routing/vue-vite` proxies `/api/roads/snap` inside `vite.config.ts` (`configureServer`/`configurePreviewServer`).
- **Curated Archetype Samples:** [`3d-trail-explorer/vue-vite`](./3d-trail-explorer/vue-vite/AGENTS.md) (Vue 3 `<gmp-map-3d>` + `whenDefined` + Non-Reactive Handles); [`environmental-dashboard/vue-vite`](./environmental-dashboard/vue-vite/AGENTS.md) (Direct Browser CORS REST (`?key=`) + `ImageMapType` AQI Tiles); [`complete-heatmap/vue-vite`](./complete-heatmap/vue-vite/AGENTS.md) (deck.gl `HeatmapLayer` + Flood-Avoiding Evacuation Route); [`logistics-and-routing/vue-vite`](./logistics-and-routing/vue-vite/AGENTS.md) (Vite Middleware Proxy for Roads API (`snapToRoads`))

## `angular` — Angular Standalone Components + TypeScript (@angular/google-maps)

- **Core Packages:** `@angular/google-maps`, `@googlemaps/js-api-loader`, `@types/google.maps`
- **Env Variable:** `GOOGLE_MAPS_API_KEY` in `.env` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Standalone components with `@angular/google-maps` (`GoogleMap`, `MapAdvancedMarker` — NEVER legacy `<map-marker>`) plus `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to prevent `NG8001` template errors on `<gmp-*>` elements.
  - CRITICAL run gotcha: `ng serve` serves an empty `public/env-config.js` stub and fails with a missing API key — always run `npm run build && node serve-dist.mjs --host 127.0.0.1 --port 4176` (`serve-dist.mjs` injects `/env-config.js` from `.env`, and proxies `/api/*` in 6/15 solutions).
  - Wrap third-party map callbacks (especially Terra Draw `ready`/`change`/`finish` events) in `ngZone.run(...)` so Angular signals and change detection update cleanly.
- **Curated Archetype Samples:** [`driving-and-geofencing/angular`](./driving-and-geofencing/angular/AGENTS.md) (Terra Draw `idle`+`isolatedData`+`ngZone.run` + Waypoint Optimization); [`real-estate/angular`](./real-estate/angular/AGENTS.md) (`MapAdvancedMarker` Price Pills + `MapMarkerClusterer` + Street View); [`environmental-dashboard/angular`](./environmental-dashboard/angular/AGENTS.md) (`serve-dist.mjs` BFF Proxies for Weather/AQI/Pollen/Solar); [`3d-trail-explorer/angular`](./3d-trail-explorer/angular/AGENTS.md) (`CUSTOM_ELEMENTS_SCHEMA` `<gmp-map-3d>` + Elevation Profile)

## `python-fastapi` — Python FastAPI Backend + Interactive Web Frontend

- **Core Packages:** `fastapi`, `uvicorn`, `httpx`, `pydantic`, `python-dotenv`
- **Env Variable:** `GOOGLE_MAPS_API_KEY` in `.env` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Async FastAPI BFF (`main.py`) using a shared `httpx.AsyncClient`, strict Pydantic v2 request validation, security headers (`nosniff`, `SAMEORIGIN`), and loopback binding (`127.0.0.1`).
  - Zero-bundler static web UI (`static/index.html`, `static/app.js`, `static/styles.css`) fetches the browser key from `GET /api/config` and boots Maps JS via Google's inline Dynamic Library Import loader (with CDN `<script>` tags for `deck.gl`/`terra-draw`/`markerclusterer`).
  - Strict DOM safety in `static/app.js`: zero `innerHTML` — uses `document.createElement()` and `textContent`.
- **Curated Archetype Samples:** [`logistics-and-routing/python-fastapi`](./logistics-and-routing/python-fastapi/AGENTS.md) (FastAPI Roads API `snapToRoads` (`GET ?path=&key=`) + Route Matrix); [`environmental-dashboard/python-fastapi`](./environmental-dashboard/python-fastapi/AGENTS.md) (7 Async FastAPI BFF Routes (Weather/AQI/Tiles/Pollen/Solar)); [`live-order-tracking/python-fastapi`](./live-order-tracking/python-fastapi/AGENTS.md) (Address Validation + Binary Maps Static PNG Receipt Stream); [`spatial-intelligence/python-fastapi`](./spatial-intelligence/python-fastapi/AGENTS.md) (CDN deck.gl + Terra Draw + FastAPI Elevation/Places BFF)

## `nodejs-web` — Node.js + Express + TypeScript Backend + Interactive Web Frontend

- **Core Packages:** `express`, `@googlemaps/js-api-loader`, `typescript`
- **Env Variable:** `GOOGLE_MAPS_API_KEY` in `.env` (never hardcoded)
- **Verified Idioms & Pitfalls:**
  - Compiled TypeScript Express backend (`src/server.ts` -> `npm run build` -> `dist/server.js`) bound strictly to `127.0.0.1` with validated typed BFF routes and security headers.
  - Serves interactive frontend from `public/` (`GET /api/config` or `/env-config.js`) and local `/vendor/*` bundles for geo libraries with zero `innerHTML`.
- **Curated Archetype Samples:** [`store-locator/nodejs-web`](./store-locator/nodejs-web/AGENTS.md) (Typed Express `RouteMatrix` + `Places` BFF + MarkerClusterer); [`ridesharing-and-tracker/nodejs-web`](./ridesharing-and-tracker/nodejs-web/AGENTS.md) (Eco-Friendly `FUEL_EFFICIENT` Routing BFF + Live Driver Animation); [`complete-heatmap/nodejs-web`](./complete-heatmap/nodejs-web/AGENTS.md) (deck.gl `HeatmapLayer` + Express Weather/Elevation/Routes BFF); [`itinerary-planner/nodejs-web`](./itinerary-planner/nodejs-web/AGENTS.md) (Places Photo Proxy + Time Zone + Waypoint Optimization BFF)
