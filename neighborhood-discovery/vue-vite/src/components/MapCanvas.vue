<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  CATEGORY_META,
  COMMUNITY_SPOT_PIN,
  DEFAULT_ZOOM,
  DEMO_MAP_ID,
  DISCOVERY_CATEGORIES,
  GMP_ATTRIBUTION_ID,
  SEARCH_RADIUS_METERS,
} from '../constants/london';
import { loadMapsLibraries } from '../services/googleMaps';
import type {
  CommunitySpot,
  DiscoveredPlace,
  LatLngLiteral,
  ReverseGeocodeResult,
} from '../types/neighborhood';

const props = defineProps<{
  activeCenter: LatLngLiteral;
  places: DiscoveredPlace[];
  selectedPlaceId: string | null;
  showRadiusCircle: boolean;
  communitySpots: CommunitySpot[];
  reverseGeocodeResult: ReverseGeocodeResult | null;
}>();

const emit = defineEmits<{
  (e: 'maps-ready'): void;
  (e: 'maps-error', message: string): void;
  (e: 'select-place', place: DiscoveredPlace): void;
  (e: 'map-clicked', coords: LatLngLiteral): void;
  (e: 'select-community-spot', spot: CommunitySpot): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const initError = ref<string | null>(null);

let mapInstance: google.maps.Map | null = null;
let radiusCircle: google.maps.Circle | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let markerLib: google.maps.MarkerLibrary | null = null;
let placeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let communityMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let reversePinMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let mapClickListener: google.maps.MapsEventListener | null = null;

function buildInfoWindowContent(
  titleText: string,
  subtitleText: string,
  extraText?: string
): HTMLElement {
  const root = document.createElement('div');
  root.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
  root.style.maxWidth = '240px';
  root.style.padding = '2px 0';

  const titleEl = document.createElement('strong');
  titleEl.style.display = 'block';
  titleEl.style.fontSize = '14px';
  titleEl.style.color = '#0f172a';
  titleEl.style.marginBottom = '4px';
  titleEl.textContent = titleText;
  root.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.style.fontSize = '12px';
  subEl.style.color = '#475569';
  subEl.textContent = subtitleText;
  root.appendChild(subEl);

  if (extraText) {
    const extraEl = document.createElement('div');
    extraEl.style.fontSize = '11px';
    extraEl.style.color = '#0f766e';
    extraEl.style.fontWeight = '600';
    extraEl.style.marginTop = '4px';
    extraEl.textContent = extraText;
    root.appendChild(extraEl);
  }

  return root;
}

function clearMarkerArray(list: google.maps.marker.AdvancedMarkerElement[]) {
  for (const marker of list) {
    marker.map = null;
  }
  list.length = 0;
}

function syncPlaceMarkers() {
  if (!mapInstance || !markerLib) return;
  clearMarkerArray(placeMarkers);

  const { AdvancedMarkerElement, PinElement } = markerLib;

  for (const place of props.places) {
    const meta = CATEGORY_META[place.category];
    const isSelected = place.id === props.selectedPlaceId;

    const pin = new PinElement({
      background: meta.background,
      borderColor: isSelected ? '#0f172a' : meta.borderColor,
      glyphText: meta.glyphText,
      glyphColor: meta.glyphColor,
      scale: isSelected ? 1.25 : 1.0,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: place.location,
      title: place.displayName,
      content: pin,
      zIndex: isSelected ? 100 : 10,
    });

    marker.addListener('click', () => {
      if (infoWindow && mapInstance) {
        const ratingInfo =
          place.rating !== null
            ? `★ ${place.rating.toFixed(1)} (${place.userRatingCount ?? 0})`
            : undefined;
        infoWindow.setContent(
          buildInfoWindowContent(
            place.displayName,
            place.formattedAddress,
            ratingInfo
          )
        );
        infoWindow.open({ map: mapInstance, anchor: marker });
      }
      emit('select-place', place);
    });

    placeMarkers.push(marker);
  }
}

function syncCommunityMarkers() {
  if (!mapInstance || !markerLib) return;
  clearMarkerArray(communityMarkers);

  const { AdvancedMarkerElement, PinElement } = markerLib;

  for (const spot of props.communitySpots) {
    const pin = new PinElement({
      background: COMMUNITY_SPOT_PIN.background,
      borderColor: COMMUNITY_SPOT_PIN.borderColor,
      glyphText: COMMUNITY_SPOT_PIN.glyphText,
      glyphColor: COMMUNITY_SPOT_PIN.glyphColor,
      scale: 1.15,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: spot.lat, lng: spot.lng },
      title: `${spot.name} (Community Spot)`,
      content: pin,
      zIndex: 80,
    });

    marker.addListener('click', () => {
      if (infoWindow && mapInstance) {
        infoWindow.setContent(
          buildInfoWindowContent(
            spot.name,
            spot.formattedAddress,
            `Community Spot · ${CATEGORY_META[spot.category].label}`
          )
        );
        infoWindow.open({ map: mapInstance, anchor: marker });
      }
      emit('select-community-spot', spot);
    });

    communityMarkers.push(marker);
  }
}

function syncReverseGeocodePin() {
  if (!mapInstance || !markerLib) return;

  if (reversePinMarker) {
    reversePinMarker.map = null;
    reversePinMarker = null;
  }

  const res = props.reverseGeocodeResult;
  if (!res) return;

  const { AdvancedMarkerElement, PinElement } = markerLib;
  const pin = new PinElement({
    background: '#0f172a',
    borderColor: '#38bdf8',
    glyphText: '+',
    glyphColor: '#ffffff',
    scale: 1.15,
  });

  reversePinMarker = new AdvancedMarkerElement({
    map: mapInstance,
    position: { lat: res.lat, lng: res.lng },
    title: res.formattedAddress,
    content: pin,
    zIndex: 120,
  });

  if (infoWindow) {
    infoWindow.setContent(
      buildInfoWindowContent(
        res.neighborhoodName,
        res.formattedAddress,
        `${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}`
      )
    );
    infoWindow.open({ map: mapInstance, anchor: reversePinMarker });
  }
}

onMounted(async () => {
  if (!mapContainerRef.value) return;

  try {
    const libs = await loadMapsLibraries();
    const { maps, marker } = libs;
    markerLib = marker;

    const mapOptions: google.maps.MapOptions = {
      center: props.activeCenter,
      zoom: DEFAULT_ZOOM,
      mapId: DEMO_MAP_ID,
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      clickableIcons: false,
    };

    mapInstance = new maps.Map(mapContainerRef.value, mapOptions);
    infoWindow = new maps.InfoWindow();

    radiusCircle = new maps.Circle({
      map: props.showRadiusCircle ? mapInstance : null,
      center: props.activeCenter,
      radius: SEARCH_RADIUS_METERS,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.65,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.07,
      clickable: false,
    });

    mapClickListener = mapInstance.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          emit('map-clicked', {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      }
    );

    syncPlaceMarkers();
    syncCommunityMarkers();
    syncReverseGeocodePin();
    emit('maps-ready');
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Unable to initialize Google Maps JavaScript API.';
    initError.value = msg;
    emit('maps-error', msg);
  }
});

watch(
  () => props.activeCenter,
  (nextCenter) => {
    if (mapInstance) {
      mapInstance.panTo(nextCenter);
    }
    if (radiusCircle) {
      radiusCircle.setCenter(nextCenter);
    }
  }
);

watch(
  () => props.showRadiusCircle,
  (visible) => {
    if (radiusCircle) {
      radiusCircle.setMap(visible ? mapInstance : null);
    }
  }
);

watch(
  () => [props.places, props.selectedPlaceId] as const,
  () => {
    syncPlaceMarkers();
    if (props.selectedPlaceId && mapInstance) {
      const target = props.places.find((p) => p.id === props.selectedPlaceId);
      if (target) {
        mapInstance.panTo(target.location);
      }
    }
  }
);

watch(
  () => props.communitySpots,
  () => {
    syncCommunityMarkers();
  },
  { deep: true }
);

watch(
  () => props.reverseGeocodeResult,
  () => {
    syncReverseGeocodePin();
  }
);

onBeforeUnmount(() => {
  if (mapClickListener) {
    mapClickListener.remove();
    mapClickListener = null;
  }
  clearMarkerArray(placeMarkers);
  clearMarkerArray(communityMarkers);
  if (reversePinMarker) {
    reversePinMarker.map = null;
    reversePinMarker = null;
  }
  if (radiusCircle) {
    radiusCircle.setMap(null);
    radiusCircle = null;
  }
  if (infoWindow) {
    infoWindow.close();
    infoWindow = null;
  }
  mapInstance = null;
});
</script>

<template>
  <div class="map-wrapper">
    <div
      id="map-canvas"
      ref="mapContainerRef"
      data-testid="map-canvas"
      class="map-canvas"
    ></div>

    <div v-if="!initError" class="map-hint-pill">
      Click anywhere on the map to reverse-geocode an address &amp; pin a community spot
    </div>

    <div class="map-legend" aria-label="Map marker category legend">
      <div
        v-for="cat in DISCOVERY_CATEGORIES"
        :key="cat"
        class="legend-item"
      >
        <span
          class="legend-pin"
          :style="{ backgroundColor: CATEGORY_META[cat].background }"
        >
          {{ CATEGORY_META[cat].glyphText }}
        </span>
        <span>{{ CATEGORY_META[cat].pluralLabel }}</span>
      </div>
      <div class="legend-item">
        <span
          class="legend-pin"
          :style="{ backgroundColor: COMMUNITY_SPOT_PIN.background }"
        >
          {{ COMMUNITY_SPOT_PIN.glyphText }}
        </span>
        <span>Community</span>
      </div>
    </div>

    <div v-if="initError" class="map-error-overlay" role="alert">
      <h2>Google Maps Setup Required</h2>
      <p>{{ initError }}</p>
      <p class="setup-tip">
        Create <code>.env.local</code> with <code>VITE_GOOGLE_MAPS_API_KEY</code> (get a free Maps Demo Key at
        <a
          href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
          target="_blank"
          rel="noopener noreferrer"
        >
          mapsplatform.google.com/maps-demo-key
        </a>
        ).
      </p>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  flex: 1;
  min-width: 300px;
  height: calc(100vh - 64px);
  min-height: 540px;
  background: #e2e8f0;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 540px;
}

.map-hint-pill {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.86);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  white-space: nowrap;
  z-index: 10;
}

.map-legend {
  position: absolute;
  bottom: 24px;
  left: 14px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  z-index: 10;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-pin {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.map-error-overlay {
  position: absolute;
  inset: 24px;
  margin: auto;
  max-width: 480px;
  height: fit-content;
  background: #ffffff;
  border: 1px solid #fecaca;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  z-index: 25;
}

.map-error-overlay h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #991b1b;
}

.map-error-overlay p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
}

.setup-tip code {
  background: #f1f5f9;
  padding: 2px 5px;
  border-radius: 4px;
}

@media (max-width: 900px) {
  .map-wrapper {
    height: 540px;
    min-height: 540px;
  }

  .map-hint-pill {
    display: none;
  }
}
</style>
