# AGENTS.md — `live-order-tracking` (On-Demand Delivery Checkout, Zone Validation & Live Tracker)

> **Category:** Logistics, Dispatch & Tracking | **Back to:** [`../AGENTS.md`](../AGENTS.md) · [`../BY_API.md`](../BY_API.md) · [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) · [`README.md`](./README.md)

## When to Use This Solution as a Reference

- **Best match for:** Address Validation API (deliverability + USPS CASS) + delivery polygon & 8 km fee check + smoothly animated courier `AdvancedMarkerElement` + Maps Static API PNG receipt proxy.
- **Prompt / Search Triggers:** `address validation`, `usps cass`, `delivery tracking`, `animate marker along polyline`, `maps static api`, `delivery zone polygon`
- **API Key Requirement:** Requires billed Google Cloud key for: Address Validation API, Maps Static API
- **Verified Modern APIs:** `Maps JS 2D`, `Places (New)`, `Routes API`, `Geocoding`, `Address Validation`, `Maps Static`

## Per-Framework Entry-Point File Map (Code-Extracted)

Jump directly to the verified source files for your target stack:

### [`static-vanilla-js`](./static-vanilla-js/) — Static HTML + Vanilla JavaScript (Zero-Bundler ES Modules)
- **Transport:** Client + Local Server Proxy (`server.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./static-vanilla-js/AGENTS.md) · [`README.md`](./static-vanilla-js/README.md)
- **Detected JS Libraries:** `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`app.js`](./static-vanilla-js/app.js)
- **Places, Routes & Geo Services:** [`app.js`](./static-vanilla-js/app.js)
- **Backend API Proxy:** [`server.mjs`](./static-vanilla-js/server.mjs)
- **App Entry & Config:** [`index.html`](./static-vanilla-js/index.html)

### [`react-vite`](./react-vite/) — React + Vite + TypeScript (@vis.gl/react-google-maps)
- **Transport:** Client + Local Proxy (Vite Middleware) | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./react-vite/AGENTS.md) · [`README.md`](./react-vite/README.md)
- **Detected JS Libraries:** `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`
- **Map & Markers:** [`src/components/DeliveryMap.tsx`](./react-vite/src/components/DeliveryMap.tsx)
- **Places, Routes & Geo Services:** [`src/App.tsx`](./react-vite/src/App.tsx), [`src/components/AddressAutocompleteInput.tsx`](./react-vite/src/components/AddressAutocompleteInput.tsx), [`src/components/CheckoutSidebar.tsx`](./react-vite/src/components/CheckoutSidebar.tsx), [`src/components/DeliveryMap.tsx`](./react-vite/src/components/DeliveryMap.tsx), [`src/services/mapsServices.ts`](./react-vite/src/services/mapsServices.ts)
- **Backend API Proxy:** [`vite.config.ts`](./react-vite/vite.config.ts)
- **App Entry & Config:** [`index.html`](./react-vite/index.html), [`src/App.tsx`](./react-vite/src/App.tsx)

### [`nextjs`](./nextjs/) — Next.js App Router + TypeScript (@vis.gl/react-google-maps + Route Handlers)
- **Transport:** Full-Stack Server BFF | **Env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nextjs/AGENTS.md) · [`README.md`](./nextjs/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`src/components/DeliveryMap.tsx`](./nextjs/src/components/DeliveryMap.tsx)
- **Places, Routes & Geo Services:** [`src/components/DeliveryTrackerApp.tsx`](./nextjs/src/components/DeliveryTrackerApp.tsx), [`src/components/OrderReceiptCard.tsx`](./nextjs/src/components/OrderReceiptCard.tsx), [`src/components/PlaceAutocompleteInput.tsx`](./nextjs/src/components/PlaceAutocompleteInput.tsx), [`src/lib/delivery.ts`](./nextjs/src/lib/delivery.ts)
- **Backend API Proxy:** [`src/app/api/address/validate/route.ts`](./nextjs/src/app/api/address/validate/route.ts), [`src/app/api/maps/static-receipt/route.ts`](./nextjs/src/app/api/maps/static-receipt/route.ts), [`src/app/api/routes/compute/route.ts`](./nextjs/src/app/api/routes/compute/route.ts)
- **App Entry & Config:** [`next.config.ts`](./nextjs/next.config.ts), [`src/app/page.tsx`](./nextjs/src/app/page.tsx)

### [`sveltekit`](./sveltekit/) — SvelteKit + TypeScript (@googlemaps/js-api-loader + Native Web Components)
- **Transport:** Full-Stack Server BFF | **Env:** `PUBLIC_GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./sveltekit/AGENTS.md) · [`README.md`](./sveltekit/README.md)
- **Detected JS Libraries:** `addressValidation`, `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Places, Routes & Geo Services:** [`src/lib/services/deliveryApi.ts`](./sveltekit/src/lib/services/deliveryApi.ts), [`src/lib/services/mapsLoader.ts`](./sveltekit/src/lib/services/mapsLoader.ts), [`src/lib/types/delivery.ts`](./sveltekit/src/lib/types/delivery.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte)
- **Backend API Proxy:** [`src/routes/api/address/validate/+server.ts`](./sveltekit/src/routes/api/address/validate/+server.ts), [`src/routes/api/maps/static-receipt/+server.ts`](./sveltekit/src/routes/api/maps/static-receipt/+server.ts), [`src/routes/api/routes/compute/+server.ts`](./sveltekit/src/routes/api/routes/compute/+server.ts)
- **App Entry & Config:** [`src/hooks.server.ts`](./sveltekit/src/hooks.server.ts), [`src/routes/+page.svelte`](./sveltekit/src/routes/+page.svelte), [`svelte.config.js`](./sveltekit/svelte.config.js), [`vite.config.ts`](./sveltekit/vite.config.ts)

### [`vue-vite`](./vue-vite/) — Vue 3 + Vite + TypeScript (@googlemaps/js-api-loader + Custom Elements)
- **Transport:** Client JS SDK + Browser CORS REST | **Env:** `VITE_GOOGLE_MAPS_API_KEY` (`.env.local`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./vue-vite/AGENTS.md) · [`README.md`](./vue-vite/README.md)
- **Detected JS Libraries:** `addressValidation`, `core`, `geocoding`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Map & Markers:** [`src/App.vue`](./vue-vite/src/App.vue)
- **Places, Routes & Geo Services:** [`src/App.vue`](./vue-vite/src/App.vue), [`src/services/mapsService.ts`](./vue-vite/src/services/mapsService.ts), [`src/types/delivery.ts`](./vue-vite/src/types/delivery.ts)
- **App Entry & Config:** [`index.html`](./vue-vite/index.html), [`src/App.vue`](./vue-vite/src/App.vue), [`vite.config.ts`](./vue-vite/vite.config.ts)

### [`angular`](./angular/) — Angular Standalone Components + TypeScript (@angular/google-maps)
- **Transport:** Client + Local Server Proxy (`serve-dist.mjs`) | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./angular/AGENTS.md) · [`README.md`](./angular/README.md)
- **Detected JS Libraries:** `addressValidation`, `core`, `geometry`, `maps`, `marker`, `places`, `routes`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`src/app/app.component.html`](./angular/src/app/app.component.html)
- **Places, Routes & Geo Services:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts), [`src/app/models/delivery.models.ts`](./angular/src/app/models/delivery.models.ts), [`src/app/services/delivery-tracking.service.ts`](./angular/src/app/services/delivery-tracking.service.ts), [`src/app/services/maps-loader.service.ts`](./angular/src/app/services/maps-loader.service.ts)
- **Backend API Proxy:** [`serve-dist.mjs`](./angular/serve-dist.mjs)
- **App Entry & Config:** [`src/app/app.component.ts`](./angular/src/app/app.component.ts)

### [`python-fastapi`](./python-fastapi/) — Python FastAPI Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./python-fastapi/AGENTS.md) · [`README.md`](./python-fastapi/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`static/app.js`](./python-fastapi/static/app.js)
- **Places, Routes & Geo Services:** [`static/app.js`](./python-fastapi/static/app.js)
- **Backend API Proxy:** [`main.py`](./python-fastapi/main.py)
- **App Entry & Config:** [`static/index.html`](./python-fastapi/static/index.html)

### [`nodejs-web`](./nodejs-web/) — Node.js + Express + TypeScript Backend + Interactive Web Frontend
- **Transport:** Full-Stack Server BFF | **Env:** `GOOGLE_MAPS_API_KEY` (`.env`) | **Verified:** PASS (1000x836) | **Docs:** [`AGENTS.md`](./nodejs-web/AGENTS.md) · [`README.md`](./nodejs-web/README.md)
- **Detected JS Libraries:** `core`, `geometry`, `maps`, `marker`, `places`
- **Actual `/api/*` Proxy Routes:** `/api/address/validate`, `/api/maps/static-receipt`, `/api/routes/compute`
- **Map & Markers:** [`public/app.js`](./nodejs-web/public/app.js)
- **Places, Routes & Geo Services:** [`public/app.js`](./nodejs-web/public/app.js)
- **Backend API Proxy:** [`src/server.ts`](./nodejs-web/src/server.ts)
- **App Entry & Config:** [`public/index.html`](./nodejs-web/public/index.html)

## Guardrails Reminder

- Keep `internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0']` (and `mapId: 'DEMO_MAP_ID'` on 2D maps; omit `mapId` on `<gmp-map-3d>`).
- Never introduce deprecated APIs — see the single authoritative migration guide in [`../BY_API.md`](../BY_API.md#legacy-to-modern-migration-guide).
- Check stack-specific build & runtime pitfalls in [`../BY_FRAMEWORK.md`](../BY_FRAMEWORK.md) before adapting.
