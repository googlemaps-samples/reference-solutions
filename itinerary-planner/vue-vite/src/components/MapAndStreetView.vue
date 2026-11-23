<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  DAY_COLORS,
  type ComputedRouteResult,
  type DayId,
  type DiscoveredPlace,
  type ItineraryStop,
  type LatLngPoint,
} from '../types/itinerary';
import { DEFAULT_MAP_ID, GMP_ATTRIBUTION_ID, type LoadedGoogleMapsLibraries } from '../services/mapsLoader';

const props = defineProps<{
  libs: LoadedGoogleMapsLibraries | null;
  center: LatLngPoint;
  zoom: number;
  activeDay: DayId;
  activeStops: ItineraryStop[];
  routeResult: ComputedRouteResult | null;
  selectedPlace: DiscoveredPlace | null;
  apiKeyError: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-place', place: DiscoveredPlace): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const streetViewContainerRef = ref<HTMLElement | null>(null);

const streetViewStatus = ref<string>('Select a landmark or hotel to preview Street View.');
const streetViewAvailable = ref<boolean>(false);

let mapInstance: google.maps.Map | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let activeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let activePolylines: google.maps.Polyline[] = [];
let selectedHighlightMarker: google.maps.marker.AdvancedMarkerElement | null = null;

let svService: google.maps.StreetViewService | null = null;
let svPanorama: google.maps.StreetViewPanorama | null = null;

function clearMarkers() {
  for (const m of activeMarkers) {
    m.map = null;
  }
  activeMarkers = [];
  if (selectedHighlightMarker) {
    selectedHighlightMarker.map = null;
    selectedHighlightMarker = null;
  }
}

function clearPolylines() {
  for (const p of activePolylines) {
    p.setMap(null);
  }
  activePolylines = [];
}

function initializeMapAndStreetView() {
  if (!props.libs || !mapContainerRef.value || mapInstance) return;

  const { mapsLib, streetViewLib } = props.libs;
  const { Map, InfoWindow } = mapsLib;
  const { StreetViewService, StreetViewPanorama } = streetViewLib;

  mapInstance = new Map(mapContainerRef.value, {
    center: props.center,
    zoom: props.zoom,
    mapId: DEFAULT_MAP_ID,
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
  });

  infoWindow = new InfoWindow();
  svService = new StreetViewService();

  if (streetViewContainerRef.value) {
    svPanorama = new StreetViewPanorama(streetViewContainerRef.value, {
      position: props.center,
      pov: { heading: 90, pitch: 0 },
      zoom: 1,
      visible: false,
      addressControl: true,
      linksControl: true,
      panControl: true,
      enableCloseButton: false,
    });
  }

  renderMarkersAndBounds();
  renderRoutePolylines();
  if (props.selectedPlace) {
    void updateStreetViewForPlace(props.selectedPlace);
  }
}

function openInfoWindowForPlace(
  place: DiscoveredPlace,
  marker: google.maps.marker.AdvancedMarkerElement,
  stopIndex?: number
) {
  if (!mapInstance || !infoWindow) return;

  const container = document.createElement('div');
  container.style.maxWidth = '240px';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const titleEl = document.createElement('div');
  titleEl.style.fontWeight = '700';
  titleEl.style.fontSize = '14px';
  titleEl.style.color = '#0f172a';
  titleEl.textContent = stopIndex !== undefined ? `${stopIndex + 1}. ${place.displayName}` : place.displayName;
  container.appendChild(titleEl);

  if (place.primaryTypeDisplayName || place.rating !== null) {
    const metaEl = document.createElement('div');
    metaEl.style.fontSize = '12px';
    metaEl.style.color = '#475569';
    metaEl.style.marginTop = '3px';
    const parts: string[] = [];
    if (place.primaryTypeDisplayName) parts.push(place.primaryTypeDisplayName);
    if (place.rating !== null) parts.push(`★ ${place.rating.toFixed(1)}`);
    metaEl.textContent = parts.join(' · ');
    container.appendChild(metaEl);
  }

  if (place.formattedAddress) {
    const addrEl = document.createElement('div');
    addrEl.style.fontSize = '11px';
    addrEl.style.color = '#64748b';
    addrEl.style.marginTop = '4px';
    addrEl.textContent = place.formattedAddress;
    container.appendChild(addrEl);
  }

  infoWindow.setContent(container);
  infoWindow.open({ anchor: marker, map: mapInstance });
}

function renderMarkersAndBounds() {
  if (!props.libs || !mapInstance) return;
  const { markerLib, coreLib } = props.libs;
  const { AdvancedMarkerElement, PinElement } = markerLib;
  const { LatLngBounds } = coreLib;

  clearMarkers();

  const theme = DAY_COLORS[props.activeDay];
  const bounds = new LatLngBounds();

  props.activeStops.forEach((stop, index) => {
    const pin = new PinElement({
      glyphText: String(index + 1),
      background: theme.primary,
      borderColor: theme.border,
      glyphColor: '#ffffff',
      scale: 1.05,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: stop.place.location,
      title: `${index + 1}. ${stop.place.displayName}`,
      zIndex: 100 + index,
    });
    marker.append(pin);

    marker.addEventListener('click', () => {
      emit('select-place', stop.place);
      openInfoWindowForPlace(stop.place, marker, index);
    });

    activeMarkers.push(marker);
    bounds.extend(stop.place.location);
  });

  if (
    props.selectedPlace &&
    !props.activeStops.some((s) => s.place.id === props.selectedPlace?.id)
  ) {
    const pin = new PinElement({
      glyphText: '★',
      background: '#1e293b',
      borderColor: '#0f172a',
      glyphColor: '#f8fafc',
      scale: 1.05,
    });
    selectedHighlightMarker = new AdvancedMarkerElement({
      map: mapInstance,
      position: props.selectedPlace.location,
      title: props.selectedPlace.displayName,
      zIndex: 200,
    });
    selectedHighlightMarker.append(pin);
    selectedHighlightMarker.addEventListener('click', () => {
      if (props.selectedPlace && selectedHighlightMarker) {
        openInfoWindowForPlace(props.selectedPlace, selectedHighlightMarker);
      }
    });
  }

  if (props.activeStops.length >= 2) {
    mapInstance.fitBounds(bounds, 56);
  } else if (props.activeStops.length === 1) {
    mapInstance.setCenter(props.activeStops[0].place.location);
    mapInstance.setZoom(14);
  } else {
    mapInstance.setCenter(props.center);
    mapInstance.setZoom(props.zoom);
  }
}

function renderRoutePolylines() {
  if (!mapInstance) return;
  clearPolylines();

  if (!props.routeResult || props.routeResult.polylines.length === 0) {
    return;
  }

  for (const polyline of props.routeResult.polylines) {
    polyline.setMap(mapInstance);
    activePolylines.push(polyline);
  }

  if (props.routeResult.bounds) {
    mapInstance.fitBounds(props.routeResult.bounds, 56);
  }
}

async function updateStreetViewForPlace(place: DiscoveredPlace) {
  if (!svService || !svPanorama) return;

  streetViewStatus.value = `Loading Street View near ${place.displayName}...`;

  try {
    const { data } = await svService.getPanorama({
      location: place.location,
      radius: 150,
      preference: google.maps.StreetViewPreference.BEST,
      source: google.maps.StreetViewSource.OUTDOOR,
    });

    if (data?.location?.pano) {
      svPanorama.setPano(data.location.pano);
      svPanorama.setPov({ heading: 120, pitch: 0 });
      svPanorama.setVisible(true);
      streetViewAvailable.value = true;
      streetViewStatus.value = data.location.description
        ? `${place.displayName} — ${data.location.description}`
        : `Street View: ${place.displayName}`;
    } else {
      svPanorama.setVisible(false);
      streetViewAvailable.value = false;
      streetViewStatus.value = `No outdoor Street View panorama found within 150m of ${place.displayName}.`;
    }
  } catch {
    svPanorama.setVisible(false);
    streetViewAvailable.value = false;
    streetViewStatus.value = `Street View imagery is unavailable near ${place.displayName}.`;
  }
}

onMounted(() => {
  if (props.libs) {
    initializeMapAndStreetView();
  }
});

watch(
  () => props.libs,
  (newLibs) => {
    if (newLibs) {
      initializeMapAndStreetView();
    }
  }
);

watch(
  () => [props.activeDay, props.activeStops],
  () => {
    renderMarkersAndBounds();
  },
  { deep: true }
);

watch(
  () => props.routeResult,
  () => {
    renderRoutePolylines();
  }
);

watch(
  () => props.center,
  (newCenter) => {
    if (mapInstance && props.activeStops.length === 0) {
      mapInstance.setCenter(newCenter);
      mapInstance.setZoom(props.zoom);
    }
  }
);

watch(
  () => props.selectedPlace,
  (newPlace) => {
    renderMarkersAndBounds();
    if (newPlace && mapInstance) {
      mapInstance.panTo(newPlace.location);
      void updateStreetViewForPlace(newPlace);
    }
  }
);

onBeforeUnmount(() => {
  clearMarkers();
  clearPolylines();
  infoWindow?.close();
});
</script>

<template>
  <div class="workspace-right">
    <div class="map-stage">
      <div
        ref="mapContainerRef"
        data-testid="map-container"
        class="map-container"
      ></div>

      <div v-if="apiKeyError" class="map-fallback-overlay" role="alert">
        <div class="fallback-card">
          <h3>Google Maps API Key Required</h3>
          <p>{{ apiKeyError }}</p>
          <p class="fallback-hint">
            Get a free Maps Demo Key at
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              mapsplatform.google.com/maps-demo-key
            </a>
            and set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>

      <div class="map-legend" aria-label="Itinerary day legend">
        <span class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: DAY_COLORS[1].primary }"></span>
          Day 1 Route
        </span>
        <span class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: DAY_COLORS[2].primary }"></span>
          Day 2 Route
        </span>
      </div>
    </div>

    <section class="street-view-panel" data-testid="street-view-panel" aria-label="Street View preview">
      <div class="sv-header">
        <span class="sv-badge">Street View Preview</span>
        <span class="sv-caption">{{ streetViewStatus }}</span>
      </div>
      <div class="sv-body">
        <div ref="streetViewContainerRef" class="sv-canvas"></div>
        <div v-if="!streetViewAvailable" class="sv-empty-overlay">
          <span>{{ streetViewStatus }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.workspace-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #e2e8f0;
}

.map-stage {
  position: relative;
  flex: 1;
  min-height: 520px;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 520px;
}

.map-fallback-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 15;
}

.fallback-card {
  max-width: 460px;
  background: #ffffff;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  color: #0f172a;
}

.fallback-card h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.fallback-card p {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: #334155;
  line-height: 1.45;
}

.fallback-hint a {
  color: #0f766e;
  font-weight: 600;
}

.map-legend {
  position: absolute;
  bottom: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  z-index: 10;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.street-view-panel {
  height: 240px;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  color: #f8fafc;
  border-top: 1px solid #334155;
}

.sv-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  background: #1e293b;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.sv-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: #0f766e;
  color: #ffffff;
  flex-shrink: 0;
}

.sv-caption {
  font-size: 0.78rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sv-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.sv-canvas {
  width: 100%;
  height: 100%;
}

.sv-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 0.82rem;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  pointer-events: none;
}
</style>
