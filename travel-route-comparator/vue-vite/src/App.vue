<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import ElevationProfileChart from './components/ElevationProfileChart.vue';
import PlaceSearchInput from './components/PlaceSearchInput.vue';
import {
  ATTRIBUTION_IDS,
  DEMO_MAP_ID,
  DENVER_BOULDER_CENTER,
  SEED_DESTINATION_QUERY,
  SEED_ORIGIN_QUERY,
  computeRoutesForMode,
  fetchRouteElevationProfile,
  isApiKeyConfigured,
  loadGoogleMapsLibraries,
  searchSeedPlace,
  type LoadedMapsLibraries,
} from './services/mapsClient';
import type {
  ComputedRouteOption,
  ElevationSamplePoint,
  ElevationStats,
  ModeComparisonSummary,
  PlaceEndpoint,
  RoutePreferences,
  TravelModeKey,
} from './types/routing';
import { formatFeet } from './utils/formatters';

interface ExtendedMapOptions extends google.maps.MapOptions {
  internalUsageAttributionIds?: string[];
}

const MODE_DEFINITIONS: Array<{
  key: TravelModeKey;
  label: string;
  buttonId: string;
  shortLabel: string;
}> = [
  { key: 'DRIVING', label: 'Driving', buttonId: 'mode-drive-btn', shortLabel: 'Drive' },
  { key: 'BICYCLING', label: 'Cycling', buttonId: 'mode-bicycle-btn', shortLabel: 'Cycle' },
  { key: 'WALKING', label: 'Walking', buttonId: 'mode-walk-btn', shortLabel: 'Walk' },
  { key: 'TRANSIT', label: 'Transit', buttonId: 'mode-transit-btn', shortLabel: 'Transit' },
];

const mapContainerRef = ref<HTMLDivElement | null>(null);
const libs = shallowRef<LoadedMapsLibraries | null>(null);
const mapInstance = shallowRef<google.maps.Map | null>(null);
const bicyclingLayer = shallowRef<google.maps.BicyclingLayer | null>(null);

const originMarker = shallowRef<google.maps.marker.AdvancedMarkerElement | null>(null);
const destinationMarker = shallowRef<google.maps.marker.AdvancedMarkerElement | null>(null);
const hoverMarker = shallowRef<google.maps.marker.AdvancedMarkerElement | null>(null);
const hoverLabelEl = shallowRef<HTMLSpanElement | null>(null);
const activePolylines = shallowRef<google.maps.Polyline[]>([]);

const apiKeyMissing = ref(!isApiKeyConfigured());
const initializing = ref(true);
const globalError = ref<string | null>(null);

const originPlace = ref<PlaceEndpoint | null>(null);
const destinationPlace = ref<PlaceEndpoint | null>(null);

const activeMode = ref<TravelModeKey>('BICYCLING');
const selectedRouteIndex = ref(0);

const preferences = reactive<RoutePreferences>({
  avoidTolls: false,
  avoidHighways: false,
  ecoFriendly: true,
});

const modeResults = reactive<Record<TravelModeKey, ModeComparisonSummary>>({
  DRIVING: { mode: 'DRIVING', label: 'Driving', loading: false, error: null, routes: [] },
  BICYCLING: { mode: 'BICYCLING', label: 'Cycling', loading: false, error: null, routes: [] },
  WALKING: { mode: 'WALKING', label: 'Walking', loading: false, error: null, routes: [] },
  TRANSIT: { mode: 'TRANSIT', label: 'Transit', loading: false, error: null, routes: [] },
});

const elevationStats = ref<ElevationStats | null>(null);
const elevationLoading = ref(false);
const elevationError = ref<string | null>(null);
const hoveredSample = ref<ElevationSamplePoint | null>(null);

const mapsReady = computed(() => Boolean(libs.value && mapInstance.value));

const activeModeSummary = computed(() => modeResults[activeMode.value]);

const activeRoute = computed<ComputedRouteOption | null>(() => {
  const routes = activeModeSummary.value.routes;
  if (!routes.length) return null;
  return routes[selectedRouteIndex.value] ?? routes[0];
});

const isBetaTrailMode = computed(
  () => activeMode.value === 'BICYCLING' || activeMode.value === 'WALKING',
);

function clearPolylines(): void {
  activePolylines.value.forEach((poly) => poly.setMap(null));
  activePolylines.value = [];
}

function createHoverIndicatorElement(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'elev-hover-pin';

  const core = document.createElement('span');
  core.className = 'elev-hover-pin-core';
  wrapper.appendChild(core);

  const label = document.createElement('span');
  label.className = 'elev-hover-pin-label';
  label.textContent = '';
  wrapper.appendChild(label);
  hoverLabelEl.value = label;

  return wrapper;
}

function updateEndpointMarkers(): void {
  const loaded = libs.value;
  const map = mapInstance.value;
  if (!loaded || !map) return;

  const { AdvancedMarkerElement, PinElement } = loaded.marker;

  if (originPlace.value) {
    if (!originMarker.value) {
      const pin = new PinElement({
        glyphText: 'A',
        glyphColor: '#ffffff',
        background: '#0f766e',
        borderColor: '#115e59',
        scale: 1.05,
      });
      const marker = new AdvancedMarkerElement({
        map,
        position: originPlace.value.location,
        title: `Origin: ${originPlace.value.displayName}`,
      });
      marker.append(pin);
      originMarker.value = marker;
    } else {
      originMarker.value.position = originPlace.value.location;
      originMarker.value.title = `Origin: ${originPlace.value.displayName}`;
      originMarker.value.map = map;
    }
  }

  if (destinationPlace.value) {
    if (!destinationMarker.value) {
      const pin = new PinElement({
        glyphText: 'B',
        glyphColor: '#ffffff',
        background: '#e11d48',
        borderColor: '#be123c',
        scale: 1.05,
      });
      const marker = new AdvancedMarkerElement({
        map,
        position: destinationPlace.value.location,
        title: `Destination: ${destinationPlace.value.displayName}`,
      });
      marker.append(pin);
      destinationMarker.value = marker;
    } else {
      destinationMarker.value.position = destinationPlace.value.location;
      destinationMarker.value.title = `Destination: ${destinationPlace.value.displayName}`;
      destinationMarker.value.map = map;
    }
  }
}

function syncBicyclingLayer(): void {
  if (!bicyclingLayer.value || !mapInstance.value) return;
  bicyclingLayer.value.setMap(
    activeMode.value === 'BICYCLING' ? mapInstance.value : null,
  );
}

function renderActiveModePolylines(shouldFitBounds = true): void {
  const loaded = libs.value;
  const map = mapInstance.value;
  if (!loaded || !map) return;

  clearPolylines();
  hoveredSample.value = null;
  if (hoverMarker.value) {
    hoverMarker.value.map = null;
  }

  const routes = activeModeSummary.value.routes;
  if (!routes.length) return;

  const { Polyline } = loaded.maps;
  const { LatLngBounds } = loaded.core;
  const bounds = new LatLngBounds();
  let hasBoundsPoints = false;

  // Draw non-selected routes underneath, then active route on top
  const ordered = [...routes].sort((a, b) => {
    if (a.index === selectedRouteIndex.value) return 1;
    if (b.index === selectedRouteIndex.value) return -1;
    return a.index - b.index;
  });

  const created: google.maps.Polyline[] = [];

  for (const route of ordered) {
    if (!route.path.length) continue;
    const isSelected = route.index === selectedRouteIndex.value;

    const poly = new Polyline({
      path: route.path,
      map,
      strokeColor: isSelected ? route.color : '#64748b',
      strokeOpacity: isSelected ? 0.95 : 0.45,
      strokeWeight: isSelected ? 6 : 4,
      zIndex: isSelected ? 20 : 10,
      clickable: true,
    });

    poly.addListener('click', () => {
      void selectRouteCard(route.index);
    });

    created.push(poly);

    if (isSelected) {
      route.path.forEach((pt) => {
        bounds.extend(pt);
        hasBoundsPoints = true;
      });
    }
  }

  activePolylines.value = created;

  if (shouldFitBounds) {
    if (hasBoundsPoints) {
      map.fitBounds(bounds, { top: 44, right: 44, bottom: 44, left: 44 });
    } else if (originPlace.value && destinationPlace.value) {
      bounds.extend(originPlace.value.location);
      bounds.extend(destinationPlace.value.location);
      map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
    }
  }
}

async function loadElevationForActiveRoute(force = false): Promise<void> {
  const loaded = libs.value;
  const route = activeRoute.value;
  if (!loaded || !route || route.path.length < 2) {
    elevationStats.value = null;
    elevationError.value = null;
    return;
  }

  if (!force && !isBetaTrailMode.value) {
    elevationStats.value = null;
    elevationError.value = null;
    return;
  }

  elevationLoading.value = true;
  elevationError.value = null;
  hoveredSample.value = null;
  if (hoverMarker.value) {
    hoverMarker.value.map = null;
  }

  try {
    elevationStats.value = await fetchRouteElevationProfile(
      loaded.elevation,
      route.path,
      route.distanceMeters,
      64,
    );
  } catch (err) {
    elevationError.value =
      err instanceof Error ? err.message : 'Unable to fetch route elevation profile.';
    elevationStats.value = null;
  } finally {
    elevationLoading.value = false;
  }
}

async function computeSingleMode(mode: TravelModeKey): Promise<void> {
  const loaded = libs.value;
  if (!loaded || !originPlace.value || !destinationPlace.value) return;

  modeResults[mode].loading = true;
  modeResults[mode].error = null;

  try {
    const computed = await computeRoutesForMode(
      loaded.routes,
      originPlace.value,
      destinationPlace.value,
      mode,
      preferences,
    );
    modeResults[mode].routes = computed;
    if (!computed.length) {
      modeResults[mode].error = `No ${modeResults[mode].label.toLowerCase()} routes found.`;
    }
  } catch (err) {
    modeResults[mode].routes = [];
    modeResults[mode].error =
      err instanceof Error
        ? err.message
        : `Failed to compute ${modeResults[mode].label.toLowerCase()} routes.`;
  } finally {
    modeResults[mode].loading = false;
  }
}

async function recomputeAllModes(): Promise<void> {
  if (!originPlace.value || !destinationPlace.value || !libs.value) return;
  selectedRouteIndex.value = 0;

  await Promise.allSettled(
    MODE_DEFINITIONS.map((m) => computeSingleMode(m.key)),
  );

  syncBicyclingLayer();
  renderActiveModePolylines(true);
  await loadElevationForActiveRoute(false);
}

async function selectMode(mode: TravelModeKey): Promise<void> {
  if (activeMode.value === mode) return;
  activeMode.value = mode;
  selectedRouteIndex.value = 0;
  syncBicyclingLayer();
  renderActiveModePolylines(true);
  await loadElevationForActiveRoute(false);
}

async function selectRouteCard(index: number): Promise<void> {
  selectedRouteIndex.value = index;
  renderActiveModePolylines(false);
  await loadElevationForActiveRoute(false);
}

async function handleOriginSelect(place: PlaceEndpoint): Promise<void> {
  originPlace.value = place;
  updateEndpointMarkers();
  await recomputeAllModes();
}

async function handleDestinationSelect(place: PlaceEndpoint): Promise<void> {
  destinationPlace.value = place;
  updateEndpointMarkers();
  await recomputeAllModes();
}

async function swapEndpoints(): Promise<void> {
  if (!originPlace.value || !destinationPlace.value) return;
  const prevOrigin = originPlace.value;
  originPlace.value = destinationPlace.value;
  destinationPlace.value = prevOrigin;
  updateEndpointMarkers();
  await recomputeAllModes();
}

async function handlePreferenceChange(): Promise<void> {
  await computeSingleMode('DRIVING');
  if (activeMode.value === 'DRIVING') {
    selectedRouteIndex.value = 0;
    renderActiveModePolylines(true);
  }
}

function handleElevationHover(sample: ElevationSamplePoint | null): void {
  hoveredSample.value = sample;
  const loaded = libs.value;
  const map = mapInstance.value;
  if (!loaded || !map) return;

  if (!sample) {
    if (hoverMarker.value) {
      hoverMarker.value.map = null;
    }
    return;
  }

  const pos = { lat: sample.lat, lng: sample.lng };
  if (!hoverMarker.value) {
    const { AdvancedMarkerElement } = loaded.marker;
    const pinEl = createHoverIndicatorElement();
    const marker = new AdvancedMarkerElement({
      map,
      position: pos,
      zIndex: 100,
      title: 'Elevation cursor',
    });
    marker.append(pinEl);
    hoverMarker.value = marker;
  } else {
    hoverMarker.value.position = pos;
    hoverMarker.value.map = map;
  }

  if (hoverLabelEl.value) {
    hoverLabelEl.value.textContent = `${Math.round(sample.elevationFeet).toLocaleString()} ft`;
  }
}

onMounted(async () => {
  if (apiKeyMissing.value) {
    initializing.value = false;
    return;
  }

  try {
    const loaded = await loadGoogleMapsLibraries();
    libs.value = loaded;

    if (!mapContainerRef.value) {
      throw new Error('Map container element failed to mount.');
    }

    const mapOptions: ExtendedMapOptions = {
      center: DENVER_BOULDER_CENTER,
      zoom: 11,
      mapId: DEMO_MAP_ID,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: [...ATTRIBUTION_IDS],
    };

    const map = new loaded.maps.Map(mapContainerRef.value, mapOptions);
    mapInstance.value = map;
    bicyclingLayer.value = new loaded.maps.BicyclingLayer();
    syncBicyclingLayer();

    const [seededOrigin, seededDestination] = await Promise.all([
      searchSeedPlace(loaded.places, SEED_ORIGIN_QUERY),
      searchSeedPlace(loaded.places, SEED_DESTINATION_QUERY),
    ]);

    originPlace.value = seededOrigin;
    destinationPlace.value = seededDestination;
    updateEndpointMarkers();

    await recomputeAllModes();
  } catch (err) {
    globalError.value =
      err instanceof Error
        ? err.message
        : 'Unable to initialize Google Maps Platform services.';
  } finally {
    initializing.value = false;
  }
});

onBeforeUnmount(() => {
  clearPolylines();
  if (originMarker.value) originMarker.value.map = null;
  if (destinationMarker.value) destinationMarker.value.map = null;
  if (hoverMarker.value) hoverMarker.value.map = null;
  if (bicyclingLayer.value) bicyclingLayer.value.setMap(null);
});
</script>

<template>
  <div class="app-shell">
    <!-- Top 64px Header Bar -->
    <header class="top-header">
      <div class="brand-cluster">
        <div class="brand-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M17 7h4v4" />
          </svg>
        </div>
        <div>
          <h1 class="brand-title">Multi-Modal Commute &amp; Trail Elevation Comparator</h1>
          <div class="brand-meta">
            <span class="corridor-badge">Denver ↔ Boulder Corridor</span>
            <span v-if="isBetaTrailMode" class="beta-advisory">
              Beta cycling/walking paths — verify trail conditions &amp; crossings on-site
            </span>
          </div>
        </div>
      </div>

      <div class="header-kpis">
        <div v-if="activeRoute" class="header-kpi-pill">
          <span class="hk-label">ETA</span>
          <span class="hk-val">{{ activeRoute.durationText }}</span>
        </div>
        <div v-if="activeRoute" class="header-kpi-pill">
          <span class="hk-label">Distance</span>
          <span class="hk-val">{{ activeRoute.distanceText }}</span>
        </div>
        <div v-if="elevationStats && elevationStats.samples.length" class="header-kpi-pill elev">
          <span class="hk-label">Elev. Gain</span>
          <span class="hk-val">+{{ formatFeet(elevationStats.gainMeters) }}</span>
        </div>
      </div>
    </header>

    <!-- API Key Missing Banner -->
    <div v-if="apiKeyMissing" class="setup-overlay">
      <div class="setup-card">
        <h2>Google Maps Platform API Key Required</h2>
        <p>
          Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to activate
          Places Autocomplete, multi-modal Routes API comparison, and the live Elevation profile.
        </p>
        <ol>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> in <code>vue-vite/</code>.
          </li>
          <li>
            Obtain a free zero-billing Maps Demo Key at
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              mapsplatform.google.com/maps-demo-key
            </a>
            (or use a Google Cloud key with Maps JS, Places New, Routes, and Elevation APIs enabled).
          </li>
          <li>Restart the Vite dev or preview server.</li>
        </ol>
      </div>
    </div>

    <!-- Main Split-Screen Workspace -->
    <main v-else class="workspace">
      <!-- Left Scrollable Sidebar (410px) -->
      <aside class="sidebar">
        <div v-if="globalError" class="alert-banner error">
          {{ globalError }}
        </div>

        <!-- Origin & Destination Section -->
        <section class="panel-section">
          <div class="section-header-row">
            <h2 class="section-title">Route Endpoints</h2>
            <button
              id="swap-locations-btn"
              type="button"
              class="swap-btn"
              :disabled="initializing || !originPlace || !destinationPlace"
              title="Swap origin and destination"
              @click="swapEndpoints"
            >
              ⇅ Swap
            </button>
          </div>

          <PlaceSearchInput
            input-id="origin-autocomplete-input"
            label="Origin"
            badge-text="A"
            badge-tone="origin"
            placeholder="Search Denver / Boulder origin…"
            :selected-place="originPlace"
            :maps-ready="mapsReady"
            @select="handleOriginSelect"
          />

          <PlaceSearchInput
            input-id="destination-autocomplete-input"
            label="Destination"
            badge-text="B"
            badge-tone="destination"
            placeholder="Search Denver / Boulder destination…"
            :selected-place="destinationPlace"
            :maps-ready="mapsReady"
            @select="handleDestinationSelect"
          />
        </section>

        <!-- Multi-Modal Mode Comparison Selector -->
        <section class="panel-section">
          <h2 class="section-title">Travel Modes</h2>
          <div class="mode-grid" role="tablist" aria-label="Travel modes">
            <button
              v-for="modeDef in MODE_DEFINITIONS"
              :id="modeDef.buttonId"
              :key="modeDef.key"
              type="button"
              role="tab"
              :aria-selected="activeMode === modeDef.key"
              class="mode-btn"
              :class="{ active: activeMode === modeDef.key }"
              @click="selectMode(modeDef.key)"
            >
              <span class="mode-name">{{ modeDef.label }}</span>
              <span class="mode-eta">
                <template v-if="modeResults[modeDef.key].loading">…</template>
                <template v-else-if="modeResults[modeDef.key].routes[0]">
                  {{ modeResults[modeDef.key].routes[0].durationText }}
                </template>
                <template v-else>—</template>
              </span>
              <span class="mode-dist">
                {{ modeResults[modeDef.key].routes[0]?.distanceText ?? '' }}
              </span>
            </button>
          </div>
        </section>

        <!-- Route Modifiers -->
        <section class="panel-section">
          <div class="section-header-row">
            <h2 class="section-title">Route Preferences</h2>
            <span class="section-hint">Applies to Driving</span>
          </div>

          <div class="toggles-row">
            <label class="toggle-chip" :class="{ checked: preferences.avoidTolls }">
              <input
                id="avoid-tolls-toggle"
                v-model="preferences.avoidTolls"
                type="checkbox"
                @change="handlePreferenceChange"
              />
              <span>Avoid Tolls</span>
            </label>

            <label class="toggle-chip" :class="{ checked: preferences.avoidHighways }">
              <input
                id="avoid-highways-toggle"
                v-model="preferences.avoidHighways"
                type="checkbox"
                @change="handlePreferenceChange"
              />
              <span>Avoid Highways</span>
            </label>

            <label class="toggle-chip eco" :class="{ checked: preferences.ecoFriendly }">
              <input
                id="eco-friendly-toggle"
                v-model="preferences.ecoFriendly"
                type="checkbox"
                @change="handlePreferenceChange"
              />
              <span>Eco-Friendly</span>
            </label>
          </div>
        </section>

        <!-- Comparative Route Cards -->
        <section class="panel-section routes-section">
          <div class="section-header-row">
            <h2 class="section-title">
              {{ activeModeSummary.label }} Routes
            </h2>
            <span v-if="activeModeSummary.routes.length" class="count-pill">
              {{ activeModeSummary.routes.length }} option{{
                activeModeSummary.routes.length > 1 ? 's' : ''
              }}
            </span>
          </div>

          <div v-if="initializing || activeModeSummary.loading" class="route-placeholder">
            Computing live Routes API options…
          </div>

          <div v-else-if="activeModeSummary.error" class="alert-banner warn">
            {{ activeModeSummary.error }}
          </div>

          <div v-else id="route-cards-list" class="route-cards-list">
            <button
              v-for="route in activeModeSummary.routes"
              :id="`route-card-${route.index}`"
              :key="route.id"
              type="button"
              class="route-card"
              :class="{ selected: route.index === selectedRouteIndex }"
              @click="selectRouteCard(route.index)"
            >
              <div class="route-card-top">
                <span class="route-swatch" :style="{ backgroundColor: route.color }"></span>
                <span class="route-label-text">{{ route.label }}</span>
                <span v-if="route.isFuelEfficient" class="badge eco">Eco</span>
                <span v-else-if="route.isDefaultRoute" class="badge primary">Best</span>
              </div>

              <div class="route-card-metrics">
                <span class="route-eta">{{ route.durationText }}</span>
                <span class="route-dot">•</span>
                <span class="route-dist">{{ route.distanceText }}</span>
              </div>

              <div
                v-if="route.tollText || route.fuelText || route.transitFareText"
                class="route-advisories"
              >
                <span v-if="route.tollText" class="adv-tag">Tolls: {{ route.tollText }}</span>
                <span v-if="route.fuelText" class="adv-tag">Fuel: {{ route.fuelText }}</span>
                <span v-if="route.transitFareText" class="adv-tag">
                  Fare: {{ route.transitFareText }}
                </span>
              </div>

              <div v-if="route.warnings.length" class="route-warnings">
                {{ route.warnings[0] }}
              </div>
            </button>
          </div>
        </section>
      </aside>

      <!-- Right Map + Elevation Stack -->
      <section class="map-workspace">
        <div class="map-frame">
          <div id="map-canvas" ref="mapContainerRef" class="map-canvas"></div>
        </div>

        <ElevationProfileChart
          :stats="elevationStats"
          :loading="elevationLoading"
          :error="elevationError"
          :active-mode="activeMode"
          :route-label="activeRoute?.label ?? ''"
          :hovered-sample="hoveredSample"
          @hover-sample="handleElevationHover"
          @request-elevation="loadElevationForActiveRoute(true)"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 750px;
  width: 100%;
  overflow: hidden;
  background: #f1f5f9;
}

.top-header {
  height: 64px;
  min-height: 64px;
  padding: 0 20px;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #1e293b;
}

.brand-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f766e, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.corridor-badge {
  font-size: 11px;
  font-weight: 600;
  color: #5eead4;
  background: rgba(20, 184, 166, 0.16);
  border: 1px solid rgba(94, 234, 212, 0.3);
  padding: 1px 8px;
  border-radius: 9999px;
}

.beta-advisory {
  font-size: 11px;
  color: #fde68a;
}

.header-kpis {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-kpi-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  background: #1e293b;
  border: 1px solid #334155;
  font-variant-numeric: tabular-nums;
}

.header-kpi-pill.elev {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(52, 211, 153, 0.35);
}

.hk-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.hk-val {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 410px;
  min-width: 360px;
  max-width: 430px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-section:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #334155;
}

.section-hint {
  font-size: 11px;
  color: #64748b;
}

.swap-btn {
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.swap-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.swap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  border-color: #94a3b8;
  background: #ffffff;
}

.mode-btn.active {
  border-color: #0f766e;
  background: #f0fdfa;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.12);
}

.mode-name {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.mode-btn.active .mode-name {
  color: #0f766e;
}

.mode-eta {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.mode-dist {
  font-size: 11.5px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.toggles-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  user-select: none;
}

.toggle-chip input {
  accent-color: #0f766e;
  margin: 0;
}

.toggle-chip.checked {
  background: #f0fdfa;
  border-color: #0f766e;
  color: #0f766e;
}

.toggle-chip.eco.checked {
  background: #ecfdf5;
  border-color: #059669;
  color: #047857;
}

.count-pill {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 9999px;
}

.route-cards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-card {
  width: 100%;
  text-align: left;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: all 0.15s ease;
}

.route-card:hover {
  border-color: #94a3b8;
}

.route-card.selected {
  border-color: #0f766e;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.route-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.route-swatch {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.route-label-text {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
}

.badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
}

.badge.eco {
  background: #dcfce7;
  color: #166534;
}

.badge.primary {
  background: #ccfbf1;
  color: #115e59;
}

.route-card-metrics {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.route-eta {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.route-dot {
  color: #94a3b8;
}

.route-dist {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.route-advisories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.adv-tag {
  font-size: 11px;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 5px;
}

.route-warnings {
  font-size: 11px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 4px 7px;
}

.route-placeholder {
  padding: 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  font-size: 12.5px;
  color: #64748b;
  text-align: center;
}

.alert-banner {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.alert-banner.error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.alert-banner.warn {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.map-workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.map-frame {
  flex: 1;
  min-height: 540px;
  position: relative;
  width: 100%;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 540px;
}

.setup-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.setup-card {
  max-width: 560px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
}

.setup-card h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #0f172a;
}

.setup-card p,
.setup-card li {
  font-size: 14px;
  line-height: 1.55;
  color: #334155;
}

.setup-card code {
  background: #f1f5f9;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}

/* Global style for custom AdvancedMarkerElement hover pin */
:deep(.elev-hover-pin) {
  display: flex;
  align-items: center;
  gap: 5px;
  transform: translate(0, 50%);
  pointer-events: none;
}

:deep(.elev-hover-pin-core) {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #f59e0b;
  border: 2.5px solid #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.45);
}

:deep(.elev-hover-pin-label) {
  background: #0f172a;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
  white-space: nowrap;
}

@media (max-width: 960px) {
  .app-shell {
    height: auto;
    overflow: auto;
  }
  .workspace {
    flex-direction: column;
    overflow: visible;
  }
  .sidebar {
    width: 100%;
    max-width: none;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .map-frame,
  .map-canvas {
    min-height: 520px;
    height: 520px;
  }
  .header-kpis {
    display: none;
  }
}
</style>
