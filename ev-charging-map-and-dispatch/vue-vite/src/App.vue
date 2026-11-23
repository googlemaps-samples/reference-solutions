<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import ProviderCard from './components/ProviderCard.vue';
import RouteSummaryPanel from './components/RouteSummaryPanel.vue';
import {
  ATTRIBUTION_ID,
  computeDispatchRoute,
  initGoogleMaps,
  rankProvidersWithRouteMatrix,
  reverseGeocodeLocation,
  searchNearbyProviders,
  type LoadedGoogleMapsLibraries,
} from './services/googleMapsDispatch';
import type {
  ActiveRouteSummary,
  LatLngLiteral,
  ProviderOption,
  SearchRadiusMeters,
  ServiceCategory,
} from './types/dispatch';

const SEATTLE_CENTER: LatLngLiteral = { lat: 47.6062, lng: -122.3321 };
const RADIUS_OPTIONS: Array<{ value: SearchRadiusMeters; id: string; label: string }> = [
  { value: 5000, id: 'radius-5km', label: '5 km' },
  { value: 10000, id: 'radius-10km', label: '10 km' },
  { value: 15000, id: 'radius-15km', label: '15 km' },
];

const mapContainerRef = ref<HTMLDivElement | null>(null);
const autocompleteRef = ref<HTMLElement | null>(null);

const driverLocation = ref<LatLngLiteral>({ ...SEATTLE_CENTER });
const driverAddress = ref<string>('Downtown Seattle, WA');
const activeCategory = ref<ServiceCategory>('all');
const radiusMeters = ref<SearchRadiusMeters>(10000);

const providers = ref<ProviderOption[]>([]);
const selectedProviderId = ref<string | null>(null);
const activeRouteSummary = ref<ActiveRouteSummary | null>(null);

const missingApiKey = ref(false);
const mapReady = ref(false);
const isSearching = ref(false);
const isRouting = ref(false);
const errorMessage = ref<string | null>(null);

const libsRef = shallowRef<LoadedGoogleMapsLibraries | null>(null);
let mapInstance: google.maps.Map | null = null;
let driverMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let searchCircle: google.maps.Circle | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let providerMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
let activePolylines: google.maps.Polyline[] = [];
let mapClickListener: google.maps.MapsEventListener | null = null;
let driverDragListener: google.maps.MapsEventListener | null = null;
let autocompleteSelectHandler: ((event: Event) => void) | null = null;
let searchRequestToken = 0;

const filteredProviders = computed(() => {
  if (activeCategory.value === 'all') {
    return providers.value;
  }
  return providers.value.filter((p) => p.category === activeCategory.value);
});

const evCount = computed(
  () => providers.value.filter((p) => p.category === 'ev').length,
);
const repairCount = computed(
  () => providers.value.filter((p) => p.category === 'repair').length,
);

function createDriverPinElement(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'driver-pin-badge';

  const pulse = document.createElement('span');
  pulse.className = 'driver-pin-pulse';
  wrapper.appendChild(pulse);

  const core = document.createElement('span');
  core.className = 'driver-pin-core';
  core.textContent = 'SOS';
  wrapper.appendChild(core);

  return wrapper;
}

function buildInfoWindowContent(provider: ProviderOption): HTMLElement {
  const container = document.createElement('div');
  container.className = 'map-infowindow';

  const badge = document.createElement('div');
  badge.className =
    provider.category === 'ev' ? 'iw-badge iw-badge-ev' : 'iw-badge iw-badge-repair';
  badge.textContent =
    provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair';
  container.appendChild(badge);

  const title = document.createElement('h4');
  title.className = 'iw-title';
  title.textContent = provider.name;
  container.appendChild(title);

  const addr = document.createElement('p');
  addr.className = 'iw-address';
  addr.textContent = provider.address;
  container.appendChild(addr);

  const meta = document.createElement('p');
  meta.className = 'iw-meta';
  const parts: string[] = [];
  if (provider.rating !== null) {
    parts.push(`${provider.rating.toFixed(1)} ★`);
  }
  if (provider.etaText) {
    parts.push(`${provider.etaText} drive`);
  }
  if (provider.distanceText) {
    parts.push(provider.distanceText);
  }
  meta.textContent = parts.join(' · ') || provider.openingStatus.badgeText;
  container.appendChild(meta);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'iw-route-btn';
  btn.textContent = 'Route Here';
  btn.addEventListener('click', () => {
    void dispatchRouteToProvider(provider);
  });
  container.appendChild(btn);

  return container;
}

function clearRoutePolylines(): void {
  for (const poly of activePolylines) {
    poly.setMap(null);
  }
  activePolylines = [];
}

function clearRouteSelection(): void {
  clearRoutePolylines();
  activeRouteSummary.value = null;
  selectedProviderId.value = null;
  syncProviderMarkers();
}

function syncProviderMarkers(): void {
  const libs = libsRef.value;
  if (!libs || !mapInstance) return;

  for (const marker of providerMarkers.values()) {
    marker.map = null;
  }
  providerMarkers.clear();

  const { AdvancedMarkerElement, PinElement } = libs.marker;

  for (const provider of filteredProviders.value) {
    const isSelected = provider.id === selectedProviderId.value;
    const isEv = provider.category === 'ev';

    const pin = new PinElement({
      background: isSelected ? '#1d4ed8' : isEv ? '#0d9488' : '#d97706',
      borderColor: isSelected ? '#1e3a8a' : isEv ? '#115e59' : '#92400e',
      glyphColor: '#ffffff',
      glyphText: isEv ? '⚡' : '🔧',
      scale: isSelected ? 1.22 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: provider.location,
      title: provider.name,
      content: pin,
      zIndex: isSelected ? 500 : 100,
    });

    // Listen to plain 'click' on the marker for weekly-channel compatibility
    marker.addListener('click', () => {
      selectedProviderId.value = provider.id;
      if (infoWindow && mapInstance) {
        infoWindow.setContent(buildInfoWindowContent(provider));
        infoWindow.open({ map: mapInstance, anchor: marker });
      }
      syncProviderMarkers();
    });

    providerMarkers.set(provider.id, marker);
  }
}

async function refreshNearbyProviders(): Promise<void> {
  const libs = libsRef.value;
  if (!libs) return;

  const token = ++searchRequestToken;
  isSearching.value = true;
  errorMessage.value = null;

  try {
    const discovered = await searchNearbyProviders(
      libs.places,
      driverLocation.value,
      radiusMeters.value,
    );
    if (token !== searchRequestToken) return;

    const ranked = await rankProvidersWithRouteMatrix(
      libs.routes,
      driverLocation.value,
      discovered,
    );
    if (token !== searchRequestToken) return;

    providers.value = ranked;
    syncProviderMarkers();
  } catch (err) {
    if (token !== searchRequestToken) return;
    errorMessage.value =
      err instanceof Error
        ? err.message
        : 'Unable to fetch nearby EV charging and repair options.';
  } finally {
    if (token === searchRequestToken) {
      isSearching.value = false;
    }
  }
}

async function relocateDriver(
  newLocation: LatLngLiteral,
  presetAddress?: string,
  panMap = false,
): Promise<void> {
  const libs = libsRef.value;
  driverLocation.value = { ...newLocation };

  if (driverMarker) {
    driverMarker.position = newLocation;
  }
  if (searchCircle) {
    searchCircle.setCenter(newLocation);
  }
  if (autocompleteRef.value) {
    const acEl = autocompleteRef.value as google.maps.places.PlaceAutocompleteElement;
    acEl.locationBias = { center: newLocation, radius: radiusMeters.value };
    acEl.origin = newLocation;
  }
  if (panMap && mapInstance) {
    mapInstance.panTo(newLocation);
  }

  clearRouteSelection();
  if (infoWindow) {
    infoWindow.close();
  }

  if (presetAddress) {
    driverAddress.value = presetAddress;
  } else if (libs) {
    driverAddress.value = 'Resolving address...';
    driverAddress.value = await reverseGeocodeLocation(libs.geocoding, newLocation);
  }

  await refreshNearbyProviders();
}

async function handleUseMapCenter(): Promise<void> {
  if (!mapInstance) return;
  const center = mapInstance.getCenter();
  if (!center) return;
  await relocateDriver({ lat: center.lat(), lng: center.lng() }, undefined, false);
}

async function handleRadiusChange(newRadius: SearchRadiusMeters): Promise<void> {
  if (radiusMeters.value === newRadius) return;
  radiusMeters.value = newRadius;

  if (searchCircle) {
    searchCircle.setRadius(newRadius);
    const bounds = searchCircle.getBounds();
    if (bounds && mapInstance) {
      mapInstance.fitBounds(bounds, 36);
    }
  }
  if (autocompleteRef.value) {
    const acEl = autocompleteRef.value as google.maps.places.PlaceAutocompleteElement;
    acEl.locationBias = { center: driverLocation.value, radius: newRadius };
  }

  clearRouteSelection();
  await refreshNearbyProviders();
}

function handleCardSelect(provider: ProviderOption): void {
  selectedProviderId.value = provider.id;
  syncProviderMarkers();

  const marker = providerMarkers.get(provider.id);
  if (mapInstance && marker && infoWindow) {
    mapInstance.panTo(provider.location);
    infoWindow.setContent(buildInfoWindowContent(provider));
    infoWindow.open({ map: mapInstance, anchor: marker });
  }
}

async function dispatchRouteToProvider(provider: ProviderOption): Promise<void> {
  const libs = libsRef.value;
  if (!libs || !mapInstance) return;

  isRouting.value = true;
  errorMessage.value = null;
  selectedProviderId.value = provider.id;

  try {
    const { route, summary } = await computeDispatchRoute(
      libs.routes,
      driverLocation.value,
      driverAddress.value,
      provider,
    );

    clearRoutePolylines();
    const polylines = route.createPolylines({
      polylineOptions: {
        strokeColor: '#2563eb',
        strokeWeight: 6,
        strokeOpacity: 0.92,
      },
    });
    for (const poly of polylines) {
      poly.setMap(mapInstance);
    }
    activePolylines = polylines;

    activeRouteSummary.value = summary;
    syncProviderMarkers();

    if (route.viewport) {
      mapInstance.fitBounds(route.viewport, 64);
    } else {
      const bounds = new libs.core.LatLngBounds(driverLocation.value, provider.location);
      bounds.extend(driverLocation.value);
      bounds.extend(provider.location);
      mapInstance.fitBounds(bounds, 64);
    }

    const marker = providerMarkers.get(provider.id);
    if (infoWindow && marker) {
      infoWindow.setContent(buildInfoWindowContent(provider));
      infoWindow.open({ map: mapInstance, anchor: marker });
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Unable to compute dispatch route.';
  } finally {
    isRouting.value = false;
  }
}

watch(activeCategory, () => {
  syncProviderMarkers();
});

onMounted(async () => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    missingApiKey.value = true;
    return;
  }

  try {
    const libs = await initGoogleMaps(apiKey);
    libsRef.value = libs;

    if (!mapContainerRef.value) return;

    mapInstance = new libs.maps.Map(mapContainerRef.value, {
      center: SEATTLE_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindow = new libs.maps.InfoWindow();

    searchCircle = new libs.maps.Circle({
      map: mapInstance,
      center: driverLocation.value,
      radius: radiusMeters.value,
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      strokeColor: '#0284c7',
      strokeOpacity: 0.55,
      strokeWeight: 2,
      clickable: false,
    });

    driverMarker = new libs.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: driverLocation.value,
      gmpDraggable: true,
      title: 'Driver Breakdown Location (Drag or click map to move)',
      zIndex: 1000,
    });
    driverMarker.append(createDriverPinElement());

    driverDragListener = driverMarker.addListener('dragend', () => {
      const pos = driverMarker?.position;
      if (!pos) return;
      const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
      const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
      void relocateDriver({ lat, lng }, undefined, false);
    });

    mapClickListener = mapInstance.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        void relocateDriver(
          { lat: event.latLng.lat(), lng: event.latLng.lng() },
          undefined,
          false,
        );
      },
    );

    await customElements.whenDefined('gmp-place-autocomplete');
    if (autocompleteRef.value) {
      const acEl = autocompleteRef.value as google.maps.places.PlaceAutocompleteElement;
      acEl.locationBias = { center: driverLocation.value, radius: radiusMeters.value };
      acEl.origin = driverLocation.value;

      autocompleteSelectHandler = async (event: Event) => {
        const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
        const prediction = selectEvent.placePrediction;
        if (!prediction) return;

        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['location', 'formattedAddress', 'displayName'],
        });
        if (!place.location) return;

        const nextLoc: LatLngLiteral = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const label = place.formattedAddress || place.displayName || undefined;
        await relocateDriver(nextLoc, label, true);
      };

      acEl.addEventListener('gmp-select', autocompleteSelectHandler);
    }

    mapReady.value = true;
    await relocateDriver(SEATTLE_CENTER, undefined, false);
  } catch (err) {
    errorMessage.value =
      err instanceof Error
        ? err.message
        : 'Failed to initialize Google Maps Platform libraries.';
  }
});

onBeforeUnmount(() => {
  mapClickListener?.remove();
  driverDragListener?.remove();
  if (autocompleteRef.value && autocompleteSelectHandler) {
    autocompleteRef.value.removeEventListener('gmp-select', autocompleteSelectHandler);
  }
  clearRoutePolylines();
  for (const marker of providerMarkers.values()) {
    marker.map = null;
  }
  providerMarkers.clear();
  if (driverMarker) {
    driverMarker.map = null;
  }
  if (searchCircle) {
    searchCircle.setMap(null);
  }
  infoWindow?.close();
});
</script>

<template>
  <div class="dispatch-shell">
    <header class="dispatch-header">
      <div class="brand-cluster">
        <div class="brand-mark" aria-hidden="true">⚡</div>
        <div>
          <h1 class="brand-title">Seattle EV &amp; Roadside Dispatch</h1>
          <p class="brand-subtitle">On-Demand Local Services &amp; Fast-Charging Locator</p>
        </div>
      </div>

      <div id="autocomplete-container" class="autocomplete-container">
        <gmp-place-autocomplete
          ref="autocompleteRef"
          included-region-codes="us"
          internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
          placeholder="Search Seattle breakdown address..."
        ></gmp-place-autocomplete>
      </div>

      <div class="header-controls">
        <div id="driver-address-badge" class="driver-address-badge" :title="driverAddress">
          <span class="pin-dot" aria-hidden="true"></span>
          <span class="address-text">{{ driverAddress }}</span>
        </div>

        <button
          id="use-map-center-btn"
          type="button"
          class="secondary-btn"
          :disabled="!mapReady || isSearching"
          @click="handleUseMapCenter"
        >
          Use Map Center
        </button>

        <div class="filter-group" role="group" aria-label="Service category">
          <button
            id="category-filter-all"
            type="button"
            class="filter-pill"
            :class="{ 'is-active': activeCategory === 'all' }"
            @click="activeCategory = 'all'"
          >
            All ({{ providers.length }})
          </button>
          <button
            id="category-filter-ev"
            type="button"
            class="filter-pill"
            :class="{ 'is-active': activeCategory === 'ev' }"
            @click="activeCategory = 'ev'"
          >
            EV Fast Charging ({{ evCount }})
          </button>
          <button
            id="category-filter-repair"
            type="button"
            class="filter-pill"
            :class="{ 'is-active': activeCategory === 'repair' }"
            @click="activeCategory = 'repair'"
          >
            Auto Repair ({{ repairCount }})
          </button>
        </div>

        <div id="radius-select" class="radius-group" role="group" aria-label="Search radius">
          <button
            v-for="opt in RADIUS_OPTIONS"
            :id="opt.id"
            :key="opt.id"
            type="button"
            class="radius-btn"
            :class="{ 'is-active': radiusMeters === opt.value }"
            @click="handleRadiusChange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </header>

    <main class="dispatch-workspace">
      <aside class="dispatch-sidebar">
        <div v-if="missingApiKey" class="setup-banner" role="alert">
          <h2>Google Maps API Key Required</h2>
          <p>
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load
            live Seattle EV charging stations, auto repair shops, and driving ETAs.
          </p>
          <p class="setup-hint">
            Need a quick prototyping key? Get a free zero-billing
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Maps Demo Key
            </a>
            and copy <code>.env.example</code> to <code>.env.local</code>.
          </p>
        </div>

        <div v-if="errorMessage" class="error-banner" role="alert">
          {{ errorMessage }}
        </div>

        <RouteSummaryPanel
          v-if="activeRouteSummary"
          :summary="activeRouteSummary"
          @clear="clearRouteSelection"
        />

        <div class="sidebar-status-bar">
          <span v-if="isSearching">Scanning {{ radiusMeters / 1000 }} km radius &amp; ranking ETAs...</span>
          <span v-else>
            {{ filteredProviders.length }} options within {{ radiusMeters / 1000 }} km · Ranked by driving ETA
          </span>
        </div>

        <div id="provider-list" class="provider-list">
          <div v-if="!missingApiKey && !isSearching && filteredProviders.length === 0" class="empty-state">
            No matching EV stations or auto repair providers found inside this radius. Try
            expanding to 15 km or dragging the SOS breakdown pin.
          </div>

          <ProviderCard
            v-for="(provider, idx) in filteredProviders"
            :key="provider.id"
            :provider="provider"
            :index="idx"
            :selected="provider.id === selectedProviderId"
            :routing-loading="isRouting"
            @select="handleCardSelect"
            @route="dispatchRouteToProvider"
          />
        </div>
      </aside>

      <section class="map-pane" aria-label="Seattle dispatch map">
        <div id="map-container" ref="mapContainerRef" class="map-container">
          <div v-if="missingApiKey" class="map-placeholder">
            <strong>Seattle Dispatch Map</strong>
            <span>Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to render the interactive map.</span>
          </div>
        </div>

        <div v-if="mapReady" class="map-overlay-legend">
          <span class="legend-item"><i class="dot-sos"></i> Driver Pin (Draggable)</span>
          <span class="legend-item"><i class="dot-ev"></i> EV Charging</span>
          <span class="legend-item"><i class="dot-repair"></i> Auto Repair</span>
          <span class="legend-tip">Click map or drag SOS pin to relocate</span>
        </div>
      </section>
    </main>
  </div>
</template>
