<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import {
  AUSTIN_CENTER,
  INITIAL_ZOOM,
  PRESEEDED_GEOFENCES,
  SEED_SEARCH_QUERY,
  WORKER_PRESETS,
} from './data/austinSeedData';
import {
  computeOptimizedAuditRoute,
  loadGoogleMapsLibraries,
  reverseGeocodeCoordinates,
  searchAuditSites,
  type LoadedGmpLibraries,
} from './services/googleMapsService';
import type {
  AuditStop,
  ClockInRecord,
  DrawMode,
  GeofenceZone,
  LatLngPoint,
  RouteSummary,
} from './types/workforce';
import { formatCoordinates, formatDistance, formatDuration } from './utils/formatters';

const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

// Reactive UI State (serializable data only; SDK instances stay non-reactive)
const mapContainerRef = ref<HTMLElement | null>(null);
const isMissingKey = ref<boolean>(!apiKey || apiKey === 'your_google_maps_api_key_here');
const initError = ref<string | null>(null);
const isMapReady = ref<boolean>(false);

const selectedPresetId = ref<string>(WORKER_PRESETS[0].id);
const workerPosition = ref<LatLngPoint>({ ...WORKER_PRESETS[0].coordinates });
const workerAddress = ref<string>('Resolving Austin street address...');
const isGeocoding = ref<boolean>(false);

const drawnZones = ref<GeofenceZone[]>([]);
const activeDrawMode = ref<DrawMode>('static');
const matchingZoneIds = ref<string[]>([]);
const lastClockIn = ref<ClockInRecord | null>(null);

const searchQuery = ref<string>(SEED_SEARCH_QUERY);
const isSearchingSites = ref<boolean>(false);
const isComputingRoute = ref<boolean>(false);
const routeError = ref<string | null>(null);
const auditStops = ref<AuditStop[]>([]);
const routeSummary = ref<RouteSummary | null>(null);

// Non-reactive Google Maps & Terra Draw instances
let gmpLibs: LoadedGmpLibraries | null = null;
let mapInstance: google.maps.Map | null = null;
let terraDrawInstance: TerraDraw | null = null;
let workerMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let workerBadgeEl: HTMLDivElement | null = null;
let infoWindowInstance: google.maps.InfoWindow | null = null;
let routePolylines: google.maps.Polyline[] = [];
let auditMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

const preseededPolygons = new Map<string, google.maps.Polygon>();
const drawnPolygonsForContainment = new Map<string, google.maps.Polygon>();

const allZones = computed<GeofenceZone[]>(() => [
  ...PRESEEDED_GEOFENCES,
  ...drawnZones.value,
]);

const activeZoneCount = computed<number>(() => allZones.value.length);

const activeMatchingZone = computed<GeofenceZone | null>(() => {
  if (matchingZoneIds.value.length === 0) {
    return null;
  }
  const firstId = matchingZoneIds.value[0];
  return allZones.value.find((zone) => zone.id === firstId) ?? null;
});

const isInsideGeofence = computed<boolean>(() => matchingZoneIds.value.length > 0);

const routeSummaryText = computed<string>(() => {
  if (isComputingRoute.value) {
    return 'Optimizing route...';
  }
  if (!routeSummary.value) {
    return `${auditStops.value.length} Stops · Route Pending`;
  }
  return `${routeSummary.value.stopCount} Stops · ${formatDistance(routeSummary.value.totalDistanceMeters)} · ${formatDuration(routeSummary.value.totalDurationMillis)}`;
});

function buildWorkerMarkerDom(inside: boolean): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = 'center';
  wrapper.style.transform = 'translateY(-4px)';

  const pill = document.createElement('div');
  pill.style.padding = '4px 8px';
  pill.style.borderRadius = '9999px';
  pill.style.fontSize = '11px';
  pill.style.fontWeight = '700';
  pill.style.color = '#ffffff';
  pill.style.border = '2px solid #ffffff';
  pill.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.35)';
  pill.style.whiteSpace = 'nowrap';
  pill.style.backgroundColor = inside ? '#059669' : '#d97706';
  pill.textContent = inside ? 'WORKER · IN ZONE' : 'WORKER · OUTSIDE';

  const dot = document.createElement('div');
  dot.style.width = '12px';
  dot.style.height = '12px';
  dot.style.marginTop = '3px';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = inside ? '#10b981' : '#f59e0b';
  dot.style.border = '2px solid #ffffff';
  dot.style.boxShadow = '0 1px 4px rgba(15, 23, 42, 0.4)';

  wrapper.appendChild(pill);
  wrapper.appendChild(dot);
  return wrapper;
}

function updateWorkerMarkerAppearance(inside: boolean): void {
  if (!workerMarker) {
    return;
  }
  const updated = buildWorkerMarkerDom(inside);
  if (workerBadgeEl && workerBadgeEl.parentNode === workerMarker) {
    workerMarker.replaceChild(updated, workerBadgeEl);
  } else {
    workerMarker.append(updated);
  }
  workerBadgeEl = updated;
}

function createInfoWindowContent(stop: AuditStop, stopIndex: number): HTMLElement {
  const container = document.createElement('div');
  container.style.maxWidth = '240px';
  container.style.fontFamily = 'Inter, sans-serif';
  container.style.padding = '2px 4px';

  const badge = document.createElement('div');
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '700';
  badge.style.color = '#1d4ed8';
  badge.style.marginBottom = '3px';
  badge.textContent = `Audit Stop #${stopIndex + 1}`;

  const title = document.createElement('div');
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.color = '#0f172a';
  title.style.marginBottom = '4px';
  title.textContent = stop.displayName;

  const address = document.createElement('div');
  address.style.fontSize = '12px';
  address.style.color = '#475569';
  address.style.lineHeight = '1.4';
  address.textContent = stop.formattedAddress;

  container.appendChild(badge);
  container.appendChild(title);
  container.appendChild(address);

  if (stop.legDistanceMeters !== undefined && stop.legDurationMillis !== undefined) {
    const legMeta = document.createElement('div');
    legMeta.style.marginTop = '6px';
    legMeta.style.fontSize = '11px';
    legMeta.style.fontWeight = '600';
    legMeta.style.color = '#065f46';
    legMeta.textContent = `Leg: ${formatDistance(stop.legDistanceMeters)} · ${formatDuration(stop.legDurationMillis)}`;
    container.appendChild(legMeta);
  }

  return container;
}

function syncPreseededPolygonStyles(): void {
  for (const zone of PRESEEDED_GEOFENCES) {
    const poly = preseededPolygons.get(zone.id);
    if (!poly) {
      continue;
    }
    const containsWorker = matchingZoneIds.value.includes(zone.id);
    poly.setOptions({
      strokeColor: containsWorker ? '#059669' : zone.color,
      strokeWeight: containsWorker ? 3 : 2,
      fillColor: containsWorker ? '#10b981' : zone.color,
      fillOpacity: containsWorker ? 0.28 : 0.14,
    });
  }
}

function evaluateWorkerGeofence(): void {
  if (!gmpLibs) {
    return;
  }

  const point = workerPosition.value;
  const matched: string[] = [];

  for (const [zoneId, polygon] of preseededPolygons.entries()) {
    if (gmpLibs.poly.containsLocation(point, polygon)) {
      matched.push(zoneId);
    }
  }

  for (const [zoneId, polygon] of drawnPolygonsForContainment.entries()) {
    if (gmpLibs.poly.containsLocation(point, polygon)) {
      matched.push(zoneId);
    }
  }

  matchingZoneIds.value = matched;
  const inside = matched.length > 0;

  if (!inside) {
    lastClockIn.value = null;
  }

  updateWorkerMarkerAppearance(inside);
  syncPreseededPolygonStyles();
}

async function updateWorkerLocation(coords: LatLngPoint, panMap = false): Promise<void> {
  workerPosition.value = { ...coords };

  if (workerMarker) {
    workerMarker.position = coords;
  }
  if (panMap && mapInstance) {
    mapInstance.panTo(coords);
  }

  evaluateWorkerGeofence();

  if (!gmpLibs) {
    return;
  }

  isGeocoding.value = true;
  try {
    workerAddress.value = await reverseGeocodeCoordinates(gmpLibs.Geocoder, coords);
  } catch (error: unknown) {
    console.warn('Reverse geocoding failed:', error);
    workerAddress.value = `${formatCoordinates(coords.lat, coords.lng)} (Austin, TX)`;
  } finally {
    isGeocoding.value = false;
  }
}

function handlePresetChange(): void {
  const preset = WORKER_PRESETS.find((item) => item.id === selectedPresetId.value);
  if (!preset) {
    return;
  }
  lastClockIn.value = null;
  void updateWorkerLocation(preset.coordinates, true);
}

function handleClockIn(): void {
  if (!isInsideGeofence.value || !activeMatchingZone.value) {
    return;
  }
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  lastClockIn.value = {
    timestamp,
    zoneName: activeMatchingZone.value.name,
    address: workerAddress.value,
  };
}

function syncTerraDrawFeatures(): void {
  if (!terraDrawInstance || !gmpLibs) {
    return;
  }

  const snapshot: GeoJSONStoreFeatures[] = terraDrawInstance.getSnapshot();
  const nextDrawnZones: GeofenceZone[] = [];
  drawnPolygonsForContainment.clear();

  let zoneCounter = 1;
  for (const feature of snapshot) {
    if (feature.geometry.type !== 'Polygon') {
      continue;
    }
    const outerRing = feature.geometry.coordinates[0] as [number, number][] | undefined;
    if (!outerRing || outerRing.length < 4) {
      continue;
    }
    const coords: LatLngPoint[] = outerRing.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    const zoneId = String(feature.id ?? `drawn-zone-${zoneCounter}`);

    nextDrawnZones.push({
      id: zoneId,
      name: `Supervisor Zone #${zoneCounter}`,
      district: 'Custom Drawn',
      source: 'drawn',
      coordinates: coords,
      color: '#ea580c',
    });

    const polygon = new gmpLibs.Polygon({
      paths: coords,
    });
    drawnPolygonsForContainment.set(zoneId, polygon);
    zoneCounter += 1;
  }

  drawnZones.value = nextDrawnZones;
  evaluateWorkerGeofence();
}

function setDrawMode(mode: DrawMode): void {
  activeDrawMode.value = mode;
  if (!terraDrawInstance) {
    return;
  }
  terraDrawInstance.setMode(mode);
}

function clearDrawnZones(): void {
  if (terraDrawInstance) {
    terraDrawInstance.clear();
    terraDrawInstance.setMode('static');
  }
  activeDrawMode.value = 'static';
  drawnZones.value = [];
  drawnPolygonsForContainment.clear();
  evaluateWorkerGeofence();
}

function focusGeofenceZone(zone: GeofenceZone): void {
  if (!mapInstance || !gmpLibs || zone.coordinates.length === 0) {
    return;
  }
  const bounds = new gmpLibs.LatLngBounds();
  for (const pt of zone.coordinates) {
    bounds.extend(pt);
  }
  mapInstance.fitBounds(bounds, 48);
}

function clearRouteOverlays(): void {
  for (const polyline of routePolylines) {
    polyline.setMap(null);
  }
  routePolylines = [];

  for (const marker of auditMarkers) {
    marker.map = null;
  }
  auditMarkers = [];
}

function renderAuditStopsAndPolyline(
  stops: AuditStop[],
  route: google.maps.routes.Route | null
): void {
  if (!mapInstance || !gmpLibs) {
    return;
  }

  clearRouteOverlays();

  if (route) {
    routePolylines = route.createPolylines({
      polylineOptions: {
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.88,
        strokeWeight: 5,
      },
    });
    for (const polyline of routePolylines) {
      polyline.setMap(mapInstance);
    }
  }

  const libs = gmpLibs;
  const map = mapInstance;

  stops.forEach((stop, index) => {
    const isOrigin = index === 0;
    const isDest = index === stops.length - 1 && stops.length > 1;
    const background = isOrigin ? '#059669' : isDest ? '#dc2626' : '#1d4ed8';

    const pin = new libs.PinElement({
      glyphText: String(index + 1),
      background,
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    });

    const marker = new libs.AdvancedMarkerElement({
      map,
      position: stop.location,
      title: `${index + 1}. ${stop.displayName}`,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      if (!infoWindowInstance) {
        return;
      }
      infoWindowInstance.setContent(createInfoWindowContent(stop, index));
      infoWindowInstance.open({
        map,
        anchor: marker,
      });
    });

    auditMarkers.push(marker);
  });
}

function focusAuditStop(index: number): void {
  const stop = auditStops.value[index];
  const marker = auditMarkers[index];
  if (!stop || !mapInstance) {
    return;
  }
  mapInstance.panTo(stop.location);
  if (marker && infoWindowInstance) {
    infoWindowInstance.setContent(createInfoWindowContent(stop, index));
    infoWindowInstance.open({
      map: mapInstance,
      anchor: marker,
    });
  }
}

async function optimizeRouteForStops(stopsToOptimize: AuditStop[]): Promise<void> {
  if (!gmpLibs || stopsToOptimize.length < 2) {
    routeSummary.value = null;
    renderAuditStopsAndPolyline(stopsToOptimize, null);
    return;
  }

  isComputingRoute.value = true;
  routeError.value = null;

  try {
    const result = await computeOptimizedAuditRoute(gmpLibs.Route, stopsToOptimize);
    if (!result) {
      routeError.value = 'No driving route found between the selected Austin audit sites.';
      renderAuditStopsAndPolyline(stopsToOptimize, null);
      return;
    }

    auditStops.value = result.orderedStops;
    routeSummary.value = result.summary;
    renderAuditStopsAndPolyline(result.orderedStops, result.route);
  } catch (error: unknown) {
    console.warn('Route optimization failed:', error);
    routeError.value = 'Unable to compute optimized route. Check Routes API enablement.';
    renderAuditStopsAndPolyline(stopsToOptimize, null);
  } finally {
    isComputingRoute.value = false;
  }
}

async function handleSiteSearch(): Promise<void> {
  if (!gmpLibs) {
    return;
  }

  isSearchingSites.value = true;
  routeError.value = null;

  try {
    const foundStops = await searchAuditSites(gmpLibs.Place, searchQuery.value);
    if (foundStops.length === 0) {
      routeError.value = 'No Austin sites matched your search. Try another retail category.';
      auditStops.value = [];
      routeSummary.value = null;
      clearRouteOverlays();
      return;
    }

    auditStops.value = foundStops;
    await optimizeRouteForStops(foundStops);
  } catch (error: unknown) {
    console.warn('Places search failed:', error);
    routeError.value = 'Places search failed. Verify Places API (New) is enabled for your key.';
  } finally {
    isSearchingSites.value = false;
  }
}

function initTerraDraw(): void {
  if (terraDrawInstance || !mapInstance) {
    return;
  }

  const draw = new TerraDraw({
    adapter: new TerraDrawGoogleMapsAdapter({
      map: mapInstance,
      lib: google.maps,
      coordinatePrecision: 9,
    }),
    modes: [
      new TerraDrawSelectMode({
        flags: {
          polygon: {
            feature: {
              draggable: true,
              rotateable: false,
              coordinates: {
                midpoints: true,
                draggable: true,
                deletable: true,
              },
            },
          },
        },
      }),
      new TerraDrawPolygonMode({
        styles: {
          fillColor: '#ea580c',
          fillOpacity: 0.22,
          outlineColor: '#c2410c',
          outlineWidth: 2,
          closingPointColor: '#ea580c',
          closingPointWidth: 4,
          closingPointOutlineColor: '#ffffff',
          closingPointOutlineWidth: 2,
        },
      }),
    ],
  });

  draw.start();
  draw.setMode('static');

  draw.on('finish', () => {
    syncTerraDrawFeatures();
  });

  draw.on('change', () => {
    syncTerraDrawFeatures();
  });

  terraDrawInstance = draw;
}

onMounted(async () => {
  if (isMissingKey.value || !mapContainerRef.value) {
    return;
  }

  try {
    const libs = await loadGoogleMapsLibraries(apiKey);
    gmpLibs = libs;

    const map = new libs.Map(mapContainerRef.value, {
      center: AUSTIN_CENTER,
      zoom: INITIAL_ZOOM,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstance = map;
    infoWindowInstance = new libs.InfoWindow();

    // Render 3 pre-seeded Austin geofence polygons
    for (const zone of PRESEEDED_GEOFENCES) {
      const polygon = new libs.Polygon({
        paths: zone.coordinates,
        map,
        strokeColor: zone.color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: zone.color,
        fillOpacity: 0.14,
        clickable: false,
      });
      preseededPolygons.set(zone.id, polygon);
    }

    // Create simulated worker AdvancedMarkerElement
    const workerMarkerEl = buildWorkerMarkerDom(true);
    workerBadgeEl = workerMarkerEl;
    workerMarker = new libs.AdvancedMarkerElement({
      map,
      position: workerPosition.value,
      title: 'Simulated Field Worker GPS',
      zIndex: 100,
    });
    workerMarker.append(workerMarkerEl);

    // Initialize Terra Draw once map projection is available
    if (map.getProjection()) {
      initTerraDraw();
    } else {
      map.addListener('projection_changed', () => {
        initTerraDraw();
      });
    }

    // Allow clicking on map in Pan/View mode to move simulated worker position
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (activeDrawMode.value !== 'static' || !event.latLng) {
        return;
      }
      lastClockIn.value = null;
      void updateWorkerLocation(
        {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        },
        false
      );
    });

    isMapReady.value = true;

    // Evaluate initial worker geofence + reverse geocode + load initial audit stops
    await Promise.all([
      updateWorkerLocation(workerPosition.value, false),
      handleSiteSearch(),
    ]);
  } catch (error: unknown) {
    console.warn('Google Maps initialization error:', error);
    initError.value =
      error instanceof Error ? error.message : 'Failed to initialize Google Maps Platform SDK.';
  }
});

onBeforeUnmount(() => {
  if (terraDrawInstance) {
    terraDrawInstance.stop();
    terraDrawInstance = null;
  }
  for (const polygon of preseededPolygons.values()) {
    polygon.setMap(null);
  }
  preseededPolygons.clear();
  drawnPolygonsForContainment.clear();
  clearRouteOverlays();
  if (workerMarker) {
    workerMarker.map = null;
    workerMarker = null;
  }
  if (infoWindowInstance) {
    infoWindowInstance.close();
    infoWindowInstance = null;
  }
  mapInstance = null;
});
</script>

<template>
  <div class="app-shell">
    <header class="top-header">
      <div class="header-brand">
        <div class="brand-mark" aria-hidden="true">FG</div>
        <h1 class="header-title">
          Field Workforce Geofenced Attendance &amp; Site Audit Router
        </h1>
      </div>

      <div class="header-metrics">
        <span class="header-pill header-pill--district">Austin, TX Metro</span>
        <span class="header-pill">{{ activeZoneCount }} Active Zones</span>
        <span
          class="header-pill"
          :class="isInsideGeofence ? 'header-pill--eligible' : 'header-pill--locked'"
        >
          {{
            lastClockIn
              ? 'Clocked In'
              : isInsideGeofence
                ? 'Clock-In Eligible'
                : 'Clock-In Locked'
          }}
        </span>
        <span id="route-summary" data-testid="route-summary" class="header-pill">
          {{ routeSummaryText }}
        </span>
      </div>
    </header>

    <main class="workspace">
      <aside class="operations-sidebar" aria-label="Operations Controls">
        <!-- Card 1: Worker GPS & Geofenced Attendance -->
        <section class="ops-card">
          <div class="card-header">
            <h2 class="card-title">1. Worker GPS &amp; Attendance</h2>
          </div>
          <p class="card-subtitle">
            Simulate field worker coordinates or click the map in Pan mode to verify geofence
            check-in eligibility.
          </p>

          <div>
            <label class="field-label" for="worker-preset-select">
              Simulated Worker GPS Position
            </label>
            <select
              id="worker-preset-select"
              data-testid="worker-preset-select"
              v-model="selectedPresetId"
              class="select-input"
              @change="handlePresetChange"
            >
              <option v-for="preset in WORKER_PRESETS" :key="preset.id" :value="preset.id">
                {{ preset.label }}
              </option>
            </select>
          </div>

          <div class="status-row">
            <span
              id="geofence-status-badge"
              data-testid="geofence-status-badge"
              class="status-badge"
              :class="isInsideGeofence ? 'status-badge--inside' : 'status-badge--outside'"
            >
              <span class="status-dot" aria-hidden="true"></span>
              {{
                activeMatchingZone
                  ? `Inside: ${activeMatchingZone.name}`
                  : 'Outside Active Geofences'
              }}
            </span>

            <span
              id="verified-clockin-badge"
              data-testid="verified-clockin-badge"
              class="status-badge"
              :class="
                lastClockIn
                  ? 'status-badge--clocked'
                  : isInsideGeofence
                    ? 'status-badge--inside'
                    : 'status-badge--outside'
              "
            >
              {{
                lastClockIn
                  ? `Verified Clock-In (${lastClockIn.timestamp})`
                  : isInsideGeofence
                    ? 'Verified Clock-In Unlocked'
                    : 'Verified Clock-In Locked'
              }}
            </span>
          </div>

          <div class="address-box">
            <strong>Reverse-Geocoded Location:</strong>
            <div id="worker-address" data-testid="worker-address">
              {{ isGeocoding ? 'Resolving street address...' : workerAddress }}
            </div>
            <span class="address-coords">
              Lat/Lng: {{ formatCoordinates(workerPosition.lat, workerPosition.lng) }}
            </span>
          </div>

          <button
            id="clockin-action-btn"
            data-testid="clockin-action-btn"
            type="button"
            class="btn"
            :class="isInsideGeofence ? 'btn--emerald' : ''"
            :disabled="!isInsideGeofence || !isMapReady"
            @click="handleClockIn"
          >
            {{
              lastClockIn
                ? 'Clock-In Verified — Refresh Timestamp'
                : isInsideGeofence
                  ? 'Record Verified Clock-In'
                  : 'Move Inside Geofence to Unlock Clock-In'
            }}
          </button>

          <div v-if="lastClockIn" class="clockin-receipt">
            Checked in at <strong>{{ lastClockIn.zoneName }}</strong> ({{ lastClockIn.timestamp }})
            — {{ lastClockIn.address }}
          </div>
        </section>

        <!-- Card 2: Geofence Zones & Terra Draw Controls -->
        <section class="ops-card">
          <div class="card-header">
            <h2 class="card-title">2. Geofence Zones &amp; Terra Draw</h2>
          </div>
          <p class="card-subtitle">
            Draw new polygon geofences on the map or edit existing drawn zones.
          </p>

          <div class="btn-group">
            <button
              type="button"
              class="btn"
              :class="activeDrawMode === 'polygon' ? 'btn--active' : ''"
              :disabled="!isMapReady"
              @click="setDrawMode('polygon')"
            >
              Draw Polygon
            </button>
            <button
              type="button"
              class="btn"
              :class="activeDrawMode === 'select' ? 'btn--active' : ''"
              :disabled="!isMapReady"
              @click="setDrawMode('select')"
            >
              Select / Edit
            </button>
            <button
              type="button"
              class="btn"
              :class="activeDrawMode === 'static' ? 'btn--active' : ''"
              :disabled="!isMapReady"
              @click="setDrawMode('static')"
            >
              Pan / Inspect
            </button>
            <button
              type="button"
              class="btn btn--danger"
              :disabled="!isMapReady || drawnZones.length === 0"
              @click="clearDrawnZones"
            >
              Clear Drawn
            </button>
          </div>

          <ul id="geofence-list" data-testid="geofence-list" class="zone-list">
            <li
              v-for="zone in allZones"
              :key="zone.id"
              class="list-item"
              :class="matchingZoneIds.includes(zone.id) ? 'list-item--active' : ''"
              @click="focusGeofenceZone(zone)"
            >
              <span
                class="zone-swatch"
                :style="{ backgroundColor: zone.color }"
                aria-hidden="true"
              ></span>
              <div class="item-main">
                <div class="item-title">{{ zone.name }}</div>
                <div class="item-meta">
                  {{ zone.district }} · {{ zone.coordinates.length }} vertices
                </div>
              </div>
              <span
                class="item-tag"
                :class="
                  matchingZoneIds.includes(zone.id)
                    ? 'item-tag--inside'
                    : zone.source === 'drawn'
                      ? 'item-tag--drawn'
                      : ''
                "
              >
                {{
                  matchingZoneIds.includes(zone.id)
                    ? 'Worker Inside'
                    : zone.source === 'drawn'
                      ? 'Drawn'
                      : 'Seeded'
                }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Card 3: Multi-Stop Audit Router -->
        <section class="ops-card">
          <div class="card-header">
            <h2 class="card-title">3. Multi-Stop Audit Router</h2>
          </div>
          <p class="card-subtitle">
            Search live Austin audit sites via Places API (New) and optimize driving order via
            Routes API.
          </p>

          <form class="search-row" @submit.prevent="handleSiteSearch">
            <input
              id="site-search-input"
              data-testid="site-search-input"
              v-model="searchQuery"
              type="text"
              class="text-input"
              placeholder="e.g., retail stores in Austin, TX"
              aria-label="Search Austin audit sites"
            />
            <button
              id="site-search-btn"
              data-testid="site-search-btn"
              type="submit"
              class="btn btn--primary"
              :disabled="!isMapReady || isSearchingSites"
            >
              {{ isSearchingSites ? 'Searching...' : 'Search' }}
            </button>
          </form>

          <button
            id="optimize-route-btn"
            data-testid="optimize-route-btn"
            type="button"
            class="btn btn--primary"
            :disabled="!isMapReady || isComputingRoute || auditStops.length < 2"
            @click="optimizeRouteForStops(auditStops)"
          >
            {{ isComputingRoute ? 'Optimizing Waypoints...' : 'Optimize Multi-Stop Driving Route' }}
          </button>

          <div v-if="routeError" class="inline-alert">
            {{ routeError }}
          </div>

          <ul id="audit-stops-list" data-testid="audit-stops-list" class="stops-list">
            <li
              v-for="(stop, idx) in auditStops"
              :key="stop.id"
              class="list-item"
              @click="focusAuditStop(idx)"
            >
              <span class="stop-number">{{ idx + 1 }}</span>
              <div class="item-main">
                <div class="item-title">{{ stop.displayName }}</div>
                <div class="item-meta">{{ stop.formattedAddress }}</div>
                <div
                  v-if="stop.legDistanceMeters !== undefined && stop.legDurationMillis !== undefined"
                  class="item-meta"
                >
                  Leg arrival: {{ formatDistance(stop.legDistanceMeters) }} ·
                  {{ formatDuration(stop.legDurationMillis) }}
                </div>
              </div>
              <span class="item-tag">
                {{ idx === 0 ? 'Start' : idx === auditStops.length - 1 ? 'End' : 'Stop' }}
              </span>
            </li>
          </ul>
        </section>
      </aside>

      <section class="map-stage" aria-label="Austin Operations Map">
        <div id="terra-draw-toolbar" data-testid="terra-draw-toolbar" class="terra-toolbar">
          <span class="toolbar-label">Geofence Tools</span>
          <button
            id="draw-polygon-btn"
            data-testid="draw-polygon-btn"
            type="button"
            class="btn"
            :class="activeDrawMode === 'polygon' ? 'btn--active' : ''"
            :disabled="!isMapReady"
            @click="setDrawMode('polygon')"
          >
            Draw Polygon
          </button>
          <button
            id="select-mode-btn"
            data-testid="select-mode-btn"
            type="button"
            class="btn"
            :class="activeDrawMode === 'select' ? 'btn--active' : ''"
            :disabled="!isMapReady"
            @click="setDrawMode('select')"
          >
            Select / Edit
          </button>
          <button
            id="clear-drawn-btn"
            data-testid="clear-drawn-btn"
            type="button"
            class="btn btn--danger"
            :disabled="!isMapReady || drawnZones.length === 0"
            @click="clearDrawnZones"
          >
            Clear Drawn
          </button>
        </div>

        <div id="map-container" ref="mapContainerRef" data-testid="map-container" class="map-canvas">
        </div>

        <div v-if="isMissingKey || initError" class="map-overlay-notice">
          <div class="notice-card">
            <h2>Google Maps Platform API Key Required</h2>
            <p v-if="isMissingKey">
              Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> (copied from
              <code>.env.example</code>) and restart the server to load the live Austin map, Terra
              Draw geofencing, Places Text Search, Geocoding, and Routes optimization.
            </p>
            <p v-else>
              Map initialization returned an error: <code>{{ initError }}</code>
            </p>
            <p>
              For zero-billing prototyping, obtain a free Maps Demo Key at
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                mapsplatform.google.com/maps-demo-key
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
