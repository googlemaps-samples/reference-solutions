<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { MarkerClusterer, type Cluster } from '@googlemaps/markerclusterer';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import type {
  CommuteSummary,
  LatLngPoint,
  NearbyAmenity,
  PropertyListing,
} from '../types/realEstate';
import { SF_CENTER, SF_INITIAL_ZOOM, formatShortPrice } from '../data/properties';
import { GMP_ATTRIBUTION_ID, type LoadedMapsLibraries } from '../services/mapsLoader';

const props = defineProps<{
  libs: LoadedMapsLibraries | null;
  mapsError: string | null;
  allProperties: PropertyListing[];
  filteredProperties: PropertyListing[];
  selectedProperty: PropertyListing | null;
  hoveredPropertyId: string | null;
  hasPolygonFilter: boolean;
  nearbyAmenities: NearbyAmenity[];
  focusedAmenity: NearbyAmenity | null;
  commuteSummary: CommuteSummary | null;
}>();

const emit = defineEmits<{
  (e: 'selectProperty', id: string): void;
  (e: 'hoverProperty', id: string | null): void;
  (e: 'polygonChanged', polygon: LatLngPoint[] | null): void;
}>();

const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapType = ref<'roadmap' | 'satellite'>('roadmap');
const isDrawing = ref(false);
const mapInitialized = ref(false);

let mapInstance: google.maps.Map | null = null;
let clusterer: MarkerClusterer | null = null;
let terraDraw: TerraDraw | null = null;
let selectedParcelPolygon: google.maps.Polygon | null = null;
let hoverParcelPolygon: google.maps.Polygon | null = null;
let commutePolyline: google.maps.Polyline | null = null;
let workplaceMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let searchPinMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let amenityMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

const markerEntries = new Map<
  string,
  {
    marker: google.maps.marker.AdvancedMarkerElement;
    pill: HTMLButtonElement;
  }
>();

function createPricePillElement(property: PropertyListing): HTMLButtonElement {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'map-price-pill';
  pill.dataset.propertyId = property.id;
  pill.setAttribute('aria-label', `${property.title} - ${formatShortPrice(property.price)}`);
  pill.textContent = formatShortPrice(property.price);

  pill.addEventListener('mouseenter', () => {
    emit('hoverProperty', property.id);
  });
  pill.addEventListener('mouseleave', () => {
    emit('hoverProperty', null);
  });

  return pill;
}

function buildClusterRenderer(markerLib: google.maps.MarkerLibrary) {
  return {
    render(cluster: Cluster) {
      const badge = document.createElement('div');
      badge.className = 'map-cluster-pill';
      badge.textContent = `${cluster.count} homes`;
      return new markerLib.AdvancedMarkerElement({
        position: cluster.position,
        content: badge,
        zIndex: 250 + cluster.count,
      });
    },
  };
}

function syncMarkerVisualStates() {
  for (const [id, entry] of markerEntries.entries()) {
    const isSelected = props.selectedProperty?.id === id;
    const isHovered = props.hoveredPropertyId === id;
    entry.pill.classList.toggle('is-selected', isSelected);
    entry.pill.classList.toggle('is-hovered', isHovered);
    entry.marker.zIndex = isSelected ? 1000 : isHovered ? 600 : 10;
  }
}

function syncClusteredMarkers() {
  if (!clusterer || !mapInstance) return;
  const visibleIds = new Set(props.filteredProperties.map((p) => p.id));
  const visibleMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

  for (const [id, entry] of markerEntries.entries()) {
    if (visibleIds.has(id)) {
      visibleMarkers.push(entry.marker);
    } else {
      entry.marker.map = null;
    }
  }

  clusterer.clearMarkers(true);
  clusterer.addMarkers(visibleMarkers, false);
  syncMarkerVisualStates();
}

function syncParcelPolygons() {
  if (!mapInstance) return;

  if (selectedParcelPolygon) {
    if (props.selectedProperty) {
      selectedParcelPolygon.setPath(props.selectedProperty.parcelPolygon);
      selectedParcelPolygon.setMap(mapInstance);
    } else {
      selectedParcelPolygon.setMap(null);
    }
  }

  if (hoverParcelPolygon) {
    const hoveredProp =
      props.hoveredPropertyId && props.hoveredPropertyId !== props.selectedProperty?.id
        ? props.allProperties.find((p) => p.id === props.hoveredPropertyId) ?? null
        : null;
    if (hoveredProp) {
      hoverParcelPolygon.setPath(hoveredProp.parcelPolygon);
      hoverParcelPolygon.setMap(mapInstance);
    } else {
      hoverParcelPolygon.setMap(null);
    }
  }
}

function syncAmenityMarkers() {
  if (!mapInstance || !props.libs) return;

  for (const m of amenityMarkers) {
    m.map = null;
  }
  amenityMarkers = [];

  const { AdvancedMarkerElement } = props.libs.markerLib;
  for (const amenity of props.nearbyAmenities.slice(0, 10)) {
    const isFocused = props.focusedAmenity?.id === amenity.id;
    const dot = document.createElement('div');
    dot.className = 'amenity-map-dot';
    dot.dataset.cat = amenity.category;
    if (isFocused) {
      dot.classList.add('is-focused');
    }
    dot.title = amenity.name;

    const label = document.createElement('span');
    label.className = 'amenity-dot-label';
    label.textContent = amenity.name;
    if (isFocused) {
      dot.appendChild(label);
    }

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: amenity.location,
      content: dot,
      title: amenity.name,
      zIndex: isFocused ? 500 : 5,
    });
    amenityMarkers.push(marker);
  }
}

function syncCommuteOverlay() {
  if (!mapInstance || !props.libs) return;

  if (commutePolyline) {
    commutePolyline.setMap(null);
    commutePolyline = null;
  }
  if (workplaceMarker) {
    workplaceMarker.map = null;
    workplaceMarker = null;
  }

  const summary = props.commuteSummary;
  if (!summary) return;

  const path =
    summary.drivingPath.length > 1
      ? summary.drivingPath
      : summary.transitPath.length > 1
        ? summary.transitPath
        : props.selectedProperty
          ? [props.selectedProperty.position, summary.workplaceLocation]
          : [];

  if (path.length > 1) {
    commutePolyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.88,
      strokeWeight: 4,
      map: mapInstance,
    });
  }

  const { AdvancedMarkerElement, PinElement } = props.libs.markerLib;
  const pin = new PinElement({
    glyphText: 'W',
    glyphColor: '#ffffff',
    background: '#1d4ed8',
    borderColor: '#ffffff',
    scale: 1.05,
  });

  workplaceMarker = new AdvancedMarkerElement({
    map: mapInstance,
    position: summary.workplaceLocation,
    title: summary.workplaceName,
    zIndex: 800,
  });
  workplaceMarker.append(pin);

  const bounds = new props.libs.coreLib.LatLngBounds();
  if (props.selectedProperty) {
    bounds.extend(props.selectedProperty.position);
  }
  bounds.extend(summary.workplaceLocation);
  mapInstance.fitBounds(bounds, 64);
}

function extractDrawnPolygonCoords(): LatLngPoint[] | null {
  if (!terraDraw) return null;
  const snapshot = terraDraw.getSnapshot();
  const polyFeature = snapshot.find((f) => f.geometry.type === 'Polygon');
  if (!polyFeature || polyFeature.geometry.type !== 'Polygon') {
    return null;
  }
  const outerRing = polyFeature.geometry.coordinates[0];
  if (!outerRing || outerRing.length < 3) {
    return null;
  }
  return outerRing.map(([lng, lat]) => ({ lat, lng }));
}

function setupTerraDraw(map: google.maps.Map) {
  if (terraDraw) return;

  const initDraw = () => {
    if (terraDraw) return;
    const draw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
      }),
      modes: [
        new TerraDrawRenderMode({
          modeName: 'static',
          styles: {},
        }),
        new TerraDrawPolygonMode({
          styles: {
            fillColor: '#2563eb',
            fillOpacity: 0.14,
            outlineColor: '#1d4ed8',
            outlineWidth: 2.5,
            closingPointColor: '#1d4ed8',
            closingPointWidth: 5,
            closingPointOutlineColor: '#ffffff',
            closingPointOutlineWidth: 2,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
          },
        }),
      ],
    });

    draw.on('finish', () => {
      const coords = extractDrawnPolygonCoords();
      emit('polygonChanged', coords);
      isDrawing.value = false;
      draw.setMode('select');
    });

    draw.on('change', () => {
      if (draw.getMode() === 'select') {
        const coords = extractDrawnPolygonCoords();
        emit('polygonChanged', coords);
      }
    });

    draw.start();
    draw.setMode('static');
    terraDraw = draw;
  };

  if (map.getProjection()) {
    initDraw();
  } else {
    google.maps.event.addListenerOnce(map, 'projection_changed', initDraw);
  }
}

function initializeMap() {
  if (!props.libs || !mapContainerRef.value || mapInitialized.value) return;

  const { Map } = props.libs.mapsLib;
  const { AdvancedMarkerElement } = props.libs.markerLib;

  const map = new Map(mapContainerRef.value, {
    center: SF_CENTER,
    zoom: SF_INITIAL_ZOOM,
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    mapTypeId: mapType.value,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
  });

  mapInstance = map;

  selectedParcelPolygon = new google.maps.Polygon({
    strokeColor: '#0f766e',
    strokeOpacity: 0.95,
    strokeWeight: 2.5,
    fillColor: '#14b8a6',
    fillOpacity: 0.25,
    zIndex: 50,
  });

  hoverParcelPolygon = new google.maps.Polygon({
    strokeColor: '#2563eb',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.14,
    zIndex: 40,
  });

  for (const property of props.allProperties) {
    const pill = createPricePillElement(property);
    const marker = new AdvancedMarkerElement({
      position: property.position,
      title: `${property.title} (${formatShortPrice(property.price)})`,
      zIndex: 10,
    });
    marker.append(pill);
    marker.addListener('click', () => {
      emit('selectProperty', property.id);
    });
    markerEntries.set(property.id, { marker, pill });
  }

  clusterer = new MarkerClusterer({
    map,
    markers: [],
    renderer: buildClusterRenderer(props.libs.markerLib),
  });

  setupTerraDraw(map);
  mapInitialized.value = true;

  syncClusteredMarkers();
  syncParcelPolygons();
  syncAmenityMarkers();
}

function startDrawingArea() {
  if (!terraDraw) return;
  terraDraw.clear();
  emit('polygonChanged', null);
  terraDraw.setMode('polygon');
  isDrawing.value = true;
}

function clearDrawnArea() {
  if (terraDraw) {
    terraDraw.clear();
    terraDraw.setMode('static');
  }
  isDrawing.value = false;
  emit('polygonChanged', null);
}

function toggleMapType() {
  const next = mapType.value === 'roadmap' ? 'satellite' : 'roadmap';
  mapType.value = next;
  if (mapInstance) {
    mapInstance.setMapTypeId(next);
  }
}

function panToLocation(
  location: LatLngPoint,
  viewport?: google.maps.LatLngBounds | null,
  showSearchPin = false
) {
  if (!mapInstance) return;
  if (viewport) {
    mapInstance.fitBounds(viewport, 48);
  } else {
    mapInstance.panTo(location);
    if ((mapInstance.getZoom() ?? 13) < 15) {
      mapInstance.setZoom(15);
    }
  }

  if (searchPinMarker) {
    searchPinMarker.map = null;
    searchPinMarker = null;
  }

  if (showSearchPin && props.libs) {
    const { AdvancedMarkerElement, PinElement } = props.libs.markerLib;
    const pin = new PinElement({
      background: '#0f172a',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 0.9,
    });
    searchPinMarker = new AdvancedMarkerElement({
      map: mapInstance,
      position: location,
      zIndex: 450,
    });
    searchPinMarker.append(pin);
  }
}

defineExpose({
  panToLocation,
  clearDrawnArea,
});

watch(
  () => props.libs,
  () => {
    initializeMap();
  }
);

watch(
  () => props.filteredProperties,
  () => {
    syncClusteredMarkers();
  },
  { deep: false }
);

watch(
  () => props.selectedProperty?.id,
  (newId) => {
    syncMarkerVisualStates();
    syncParcelPolygons();
    if (newId && props.selectedProperty && mapInstance) {
      mapInstance.panTo(props.selectedProperty.position);
      if ((mapInstance.getZoom() ?? 13) < 15) {
        mapInstance.setZoom(16);
      }
    }
  }
);

watch(
  () => props.hoveredPropertyId,
  () => {
    syncMarkerVisualStates();
    syncParcelPolygons();
  }
);

watch(
  () => [props.nearbyAmenities, props.focusedAmenity?.id],
  () => {
    syncAmenityMarkers();
  }
);

watch(
  () => props.focusedAmenity,
  (amenity) => {
    if (amenity && mapInstance) {
      mapInstance.panTo(amenity.location);
    }
  }
);

watch(
  () => props.commuteSummary,
  () => {
    syncCommuteOverlay();
  }
);

onMounted(() => {
  initializeMap();
});

onBeforeUnmount(() => {
  if (terraDraw) {
    try {
      terraDraw.stop();
    } catch {
      // ignore teardown errors
    }
    terraDraw = null;
  }
  if (clusterer) {
    clusterer.clearMarkers();
    clusterer = null;
  }
  selectedParcelPolygon?.setMap(null);
  hoverParcelPolygon?.setMap(null);
  commutePolyline?.setMap(null);
  if (workplaceMarker) workplaceMarker.map = null;
  if (searchPinMarker) searchPinMarker.map = null;
  for (const m of amenityMarkers) {
    m.map = null;
  }
  markerEntries.clear();
  mapInstance = null;
});
</script>

<template>
  <div class="map-pane">
    <div
      ref="mapContainerRef"
      id="map-container"
      data-testid="map-container"
      class="map-canvas"
    ></div>

    <!-- Floating Top-Left Map Controls -->
    <div class="map-floating-controls">
      <button
        id="draw-area-btn"
        data-testid="draw-area-btn"
        type="button"
        class="map-ctrl-btn"
        :class="{ 'is-active': isDrawing }"
        :disabled="!mapInitialized"
        @click="startDrawingArea"
      >
        <span class="ctrl-dot" aria-hidden="true"></span>
        {{ isDrawing ? 'Drawing Polygon...' : 'Draw Search Area' }}
      </button>

      <button
        id="clear-area-btn"
        data-testid="clear-area-btn"
        type="button"
        class="map-ctrl-btn"
        :disabled="!isDrawing && !hasPolygonFilter"
        @click="clearDrawnArea"
      >
        Clear Area
      </button>

      <button
        id="map-type-toggle"
        data-testid="map-type-toggle"
        type="button"
        class="map-ctrl-btn"
        :class="{ 'is-active': mapType === 'satellite' }"
        :disabled="!mapInitialized"
        @click="toggleMapType"
      >
        {{ mapType === 'roadmap' ? 'Satellite' : 'Roadmap' }}
      </button>
    </div>

    <!-- Drawing Helper Toast -->
    <div v-if="isDrawing" class="drawing-hint-banner">
      Click vertices on the map to outline a search polygon. Click the starting point to close.
    </div>

    <!-- Parcel Legend Pill -->
    <div v-if="selectedProperty && mapInitialized" class="map-parcel-legend">
      <span class="legend-swatch" aria-hidden="true"></span>
      <span>
        Parcel Lot Outline · APN {{ selectedProperty.apn }} ({{
          selectedProperty.lotSqFt.toLocaleString()
        }}
        sq ft)
      </span>
    </div>

    <!-- Fallback Notice if API key is missing -->
    <div v-if="mapsError" class="map-api-notice">
      <strong>Google Maps API Key Required</strong>
      <p>{{ mapsError }}</p>
      <p class="notice-sub">
        Get a free zero-billing Maps Demo Key in seconds and add
        <code>VITE_GOOGLE_MAPS_API_KEY=...</code> to <code>.env.local</code>.
      </p>
    </div>
  </div>
</template>
