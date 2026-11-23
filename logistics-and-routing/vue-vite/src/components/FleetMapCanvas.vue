<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { importLibrary } from '@googlemaps/js-api-loader';
import { DALLAS_CENTER } from '../data/dallasFleet';
import { ensureMapsOptions } from '../services/mapsLoader';
import type {
  DispatchRouteSummary,
  FleetVehicle,
  LogisticsHub,
  SnapToRoadsResult,
} from '../types/logistics';

const props = defineProps<{
  apiKey: string;
  vehicles: FleetVehicle[];
  selectedVehicleId: string;
  depot: LogisticsHub | null;
  stops: LogisticsHub[];
  snapResult: SnapToRoadsResult | null;
  showSnappedOverlay: boolean;
  dispatchRoute: DispatchRouteSummary | null;
  trafficEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'map-ready'): void;
  (e: 'map-error', message: string): void;
  (e: 'select-vehicle', vehicleId: string): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);

let mapInstance: google.maps.Map | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let trafficLayer: google.maps.TrafficLayer | null = null;

let vehicleMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let hubMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let rawTracePolyline: google.maps.Polyline | null = null;
let snappedTracePolyline: google.maps.Polyline | null = null;
let dispatchCorridorPolyline: google.maps.Polyline | null = null;

function buildSafeVehicleInfoContent(vehicle: FleetVehicle): HTMLElement {
  const container = document.createElement('div');
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.color = '#0f172a';
  container.style.minWidth = '210px';
  container.style.padding = '2px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.style.marginBottom = '4px';
  title.textContent = `${vehicle.callsign} · ${vehicle.status}`;
  container.appendChild(title);

  const sub = document.createElement('div');
  sub.style.fontSize = '12px';
  sub.style.color = '#475569';
  sub.style.marginBottom = '6px';
  sub.textContent = `${vehicle.vehicleClass} (${vehicle.corridor})`;
  container.appendChild(sub);

  const metrics = document.createElement('div');
  metrics.style.fontSize = '12px';
  metrics.style.lineHeight = '1.5';

  const line1 = document.createElement('div');
  line1.textContent = `Speed: ${vehicle.speedMph} mph · Load: ${vehicle.cargoLoadPct}%`;
  const line2 = document.createElement('div');
  line2.textContent = `Next Stop: ${vehicle.nextStopName}`;
  const line3 = document.createElement('div');
  line3.textContent = `Live ETA: ${vehicle.etaText} (${vehicle.distanceText})`;

  metrics.appendChild(line1);
  metrics.appendChild(line2);
  metrics.appendChild(line3);
  container.appendChild(metrics);

  return container;
}

function buildSafeHubInfoContent(hub: LogisticsHub, label: string): HTMLElement {
  const container = document.createElement('div');
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.style.color = '#0f172a';
  container.style.minWidth = '200px';
  container.style.padding = '2px';

  const badge = document.createElement('div');
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '700';
  badge.style.textTransform = 'uppercase';
  badge.style.color = hub.role === 'depot' ? '#1d4ed8' : '#0f766e';
  badge.textContent = label;
  container.appendChild(badge);

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.style.margin = '2px 0 4px';
  title.textContent = hub.name;
  container.appendChild(title);

  const addr = document.createElement('div');
  addr.style.fontSize = '12px';
  addr.style.color = '#475569';
  addr.textContent = hub.address;
  container.appendChild(addr);

  return container;
}

function statusColors(status: FleetVehicle['status']) {
  if (status === 'En Route') {
    return { bg: '#059669', border: '#ecfdf5', glyph: '#ffffff' };
  }
  if (status === 'Delayed') {
    return { bg: '#d97706', border: '#fffbeb', glyph: '#ffffff' };
  }
  return { bg: '#475569', border: '#f1f5f9', glyph: '#ffffff' };
}

async function initMap() {
  if (!props.apiKey || !mapContainerRef.value) {
    return;
  }

  try {
    ensureMapsOptions(props.apiKey);
    const { Map, InfoWindow, TrafficLayer } = await importLibrary('maps');

    mapInstance = new Map(mapContainerRef.value, {
      center: DALLAS_CENTER,
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    infoWindow = new InfoWindow();
    trafficLayer = new TrafficLayer();
    if (props.trafficEnabled) {
      trafficLayer.setMap(mapInstance);
    }

    await Promise.all([
      renderVehicleMarkers(),
      renderHubMarkers(),
      renderTracePolylines(),
      renderDispatchCorridor(),
    ]);

    emit('map-ready');
  } catch (err) {
    emit(
      'map-error',
      err instanceof Error ? err.message : 'Failed to initialize Google Map.',
    );
  }
}

async function renderVehicleMarkers() {
  if (!mapInstance) return;
  const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

  for (const marker of vehicleMarkers) {
    marker.map = null;
  }
  vehicleMarkers = [];

  for (const vehicle of props.vehicles) {
    const colors = statusColors(vehicle.status);
    const isSelected = vehicle.id === props.selectedVehicleId;

    const pin = new PinElement({
      background: colors.bg,
      borderColor: isSelected ? '#38bdf8' : colors.border,
      glyphColor: colors.glyph,
      glyphText: vehicle.callsign.split('-')[1] ?? 'V',
      scale: isSelected ? 1.25 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: vehicle.position,
      title: `${vehicle.callsign} (${vehicle.status})`,
      zIndex: isSelected ? 40 : 20,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      emit('select-vehicle', vehicle.id);
      if (infoWindow && mapInstance) {
        infoWindow.setContent(buildSafeVehicleInfoContent(vehicle));
        infoWindow.open({ anchor: marker, map: mapInstance });
      }
    });

    vehicleMarkers.push(marker);
  }
}

async function renderHubMarkers() {
  if (!mapInstance) return;
  const { AdvancedMarkerElement, PinElement } = await importLibrary('marker');

  for (const marker of hubMarkers) {
    marker.map = null;
  }
  hubMarkers = [];

  const allHubs: Array<{ hub: LogisticsHub; label: string; glyph: string; isDepot: boolean }> = [];
  if (props.depot) {
    allHubs.push({
      hub: props.depot,
      label: 'Central Dispatch Depot',
      glyph: 'D',
      isDepot: true,
    });
  }
  props.stops.forEach((stop, index) => {
    allHubs.push({
      hub: stop,
      label: `Drop-Off Hub #${index + 1}`,
      glyph: String(index + 1),
      isDepot: false,
    });
  });

  for (const item of allHubs) {
    const pin = new PinElement({
      background: item.isDepot ? '#2563eb' : '#0f172a',
      borderColor: item.isDepot ? '#dbeafe' : '#38bdf8',
      glyphColor: '#ffffff',
      glyphText: item.glyph,
      scale: item.isDepot ? 1.15 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: item.hub.location,
      title: item.hub.name,
      zIndex: item.isDepot ? 30 : 15,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      if (infoWindow && mapInstance) {
        infoWindow.setContent(buildSafeHubInfoContent(item.hub, item.label));
        infoWindow.open({ anchor: marker, map: mapInstance });
      }
    });

    hubMarkers.push(marker);
  }
}

async function renderTracePolylines() {
  if (!mapInstance) return;
  const { Polyline } = await importLibrary('maps');

  if (rawTracePolyline) {
    rawTracePolyline.setMap(null);
    rawTracePolyline = null;
  }
  if (snappedTracePolyline) {
    snappedTracePolyline.setMap(null);
    snappedTracePolyline = null;
  }

  if (!props.snapResult) return;

  // Dashed raw noisy GPS trace
  rawTracePolyline = new Polyline({
    map: mapInstance,
    path: props.snapResult.rawPoints,
    strokeColor: '#f97316',
    strokeOpacity: 0,
    strokeWeight: 3,
    zIndex: 25,
    icons: [
      {
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.95,
          strokeColor: '#f97316',
          scale: 3,
        },
        offset: '0',
        repeat: '12px',
      },
    ],
  });

  // Solid road-snapped trace
  if (props.showSnappedOverlay && props.snapResult.snappedPoints.length >= 2) {
    snappedTracePolyline = new Polyline({
      map: mapInstance,
      path: props.snapResult.snappedPoints,
      strokeColor: '#06b6d4',
      strokeOpacity: 0.95,
      strokeWeight: 5,
      zIndex: 26,
    });
  }
}

async function renderDispatchCorridor() {
  if (!mapInstance) return;
  const { Polyline } = await importLibrary('maps');

  if (dispatchCorridorPolyline) {
    dispatchCorridorPolyline.setMap(null);
    dispatchCorridorPolyline = null;
  }

  if (!props.dispatchRoute || props.dispatchRoute.path.length < 2) return;

  dispatchCorridorPolyline = new Polyline({
    map: mapInstance,
    path: props.dispatchRoute.path,
    strokeColor: '#3b82f6',
    strokeOpacity: 0.85,
    strokeWeight: 6,
    zIndex: 10,
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 2.6,
          strokeColor: '#eff6ff',
          fillColor: '#1d4ed8',
          fillOpacity: 1,
        },
        offset: '24px',
        repeat: '120px',
      },
    ],
  });
}

onMounted(() => {
  void initMap();
});

watch(
  () => props.apiKey,
  (newKey) => {
    if (newKey && !mapInstance) {
      void initMap();
    }
  },
);

watch(
  () => [props.vehicles, props.selectedVehicleId],
  () => {
    void renderVehicleMarkers();
  },
  { deep: true },
);

watch(
  () => [props.depot, props.stops],
  () => {
    void renderHubMarkers();
  },
  { deep: true },
);

watch(
  () => [props.snapResult, props.showSnappedOverlay],
  () => {
    void renderTracePolylines();
  },
  { deep: true },
);

watch(
  () => props.dispatchRoute,
  () => {
    void renderDispatchCorridor();
  },
  { deep: true },
);

watch(
  () => props.trafficEnabled,
  (enabled) => {
    if (trafficLayer && mapInstance) {
      trafficLayer.setMap(enabled ? mapInstance : null);
    }
  },
);

onBeforeUnmount(() => {
  for (const m of vehicleMarkers) m.map = null;
  for (const m of hubMarkers) m.map = null;
  rawTracePolyline?.setMap(null);
  snappedTracePolyline?.setMap(null);
  dispatchCorridorPolyline?.setMap(null);
  trafficLayer?.setMap(null);
});
</script>

<template>
  <main class="map-stage">
    <div ref="mapContainerRef" data-testid="map-container" class="map-canvas"></div>

    <div class="map-legend" aria-label="Map legend">
      <div class="legend-title">Dallas Logistics Layers</div>
      <div class="legend-items">
        <span class="legend-item">
          <span class="dot dot-en-route"></span> En Route
        </span>
        <span class="legend-item">
          <span class="dot dot-delayed"></span> Delayed
        </span>
        <span class="legend-item">
          <span class="dot dot-idle"></span> Idle
        </span>
        <span class="legend-item">
          <span class="line-swatch raw"></span> Raw GPS
        </span>
        <span class="legend-item">
          <span class="line-swatch snapped"></span> Road-Snapped
        </span>
        <span class="legend-item">
          <span class="line-swatch corridor"></span> Dispatch Corridor
        </span>
      </div>
    </div>
  </main>
</template>
