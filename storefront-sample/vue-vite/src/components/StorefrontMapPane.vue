<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { LoadedMapsLibraries } from '../services/mapsLoader';
import type {
  ClinicVenueData,
  LatLngPoint,
  MapViewMode,
  OriginSelection,
  TravelModeKey,
} from '../types/storefront';
import {
  GMP_ATTRIBUTION_IDS,
  HOME_VISIT_RADIUS_METERS,
  TRAVEL_MODE_META,
} from '../utils/formatters';

const props = defineProps<{
  libs: LoadedMapsLibraries | null;
  clinicLocation: LatLngPoint;
  venue: ClinicVenueData | null;
  origin: OriginSelection;
  showCoverage: boolean;
  viewMode: MapViewMode;
  activeRoute: google.maps.routes.Route | null;
  travelMode: TravelModeKey;
  setupError: string | null;
}>();

const emit = defineEmits<{
  (e: 'set-view-mode', mode: MapViewMode): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const streetViewContainerRef = ref<HTMLElement | null>(null);

const streetViewUnavailable = ref(false);

let mapInstance: google.maps.Map | null = null;
let clinicMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let clinicInfoWindow: google.maps.InfoWindow | null = null;
let coverageCircle: google.maps.Circle | null = null;
let activePolylines: google.maps.Polyline[] = [];
let panoramaInstance: google.maps.StreetViewPanorama | null = null;
let lastStreetViewCenterKey = '';

function buildClinicMarkerBadge(label: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'clinic-map-pin';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'clinic-pin-icon';

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');

  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute(
    'd',
    'M7 4c-2.2 0-4 1.9-4 4.4 0 2.1.9 3.7 1.4 5.7.5 1.8.8 5.9 2.3 5.9 1.2 0 1.6-2.5 2.3-4.2.5-1.2 1.2-1.8 3-1.8s2.5.6 3 1.8c.7 1.7 1.1 4.2 2.3 4.2 1.5 0 1.8-4.1 2.3-5.9.5-2 1.4-3.6 1.4-5.7C21 5.9 19.2 4 17 4c-1.7 0-2.9.8-5 .8S8.7 4 7 4Z'
  );
  svg.appendChild(path);
  iconWrap.appendChild(svg);

  const textSpan = document.createElement('span');
  textSpan.className = 'clinic-pin-label';
  textSpan.textContent = label;

  wrapper.appendChild(iconWrap);
  wrapper.appendChild(textSpan);
  return wrapper;
}

function buildClinicInfoWindowNode(): HTMLElement {
  const box = document.createElement('div');
  box.style.padding = '4px 2px';
  box.style.maxWidth = '240px';
  box.style.fontFamily = 'inherit';

  const title = document.createElement('strong');
  title.style.display = 'block';
  title.style.fontSize = '14px';
  title.style.color = '#0f172a';
  title.textContent = props.venue?.displayName ?? '450 Sutter Dental Studio';

  const addr = document.createElement('div');
  addr.style.fontSize = '12px';
  addr.style.color = '#475569';
  addr.style.marginTop = '4px';
  addr.textContent =
    props.venue?.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108';

  const status = document.createElement('div');
  status.style.fontSize = '12px';
  status.style.fontWeight = '600';
  status.style.marginTop = '6px';
  status.style.color =
    props.venue?.openStatus.isOpen === false ? '#b91c1c' : '#0f766e';
  status.textContent = props.venue?.openStatus.label ?? 'San Francisco Clinic';

  box.appendChild(title);
  box.appendChild(addr);
  box.appendChild(status);
  return box;
}

function initializeMapIfNeeded() {
  if (!props.libs || !mapContainerRef.value || mapInstance) return;

  const { Map, InfoWindow, Circle } = props.libs.maps;
  const { AdvancedMarkerElement, PinElement } = props.libs.marker;

  mapInstance = new Map(mapContainerRef.value, {
    center: props.clinicLocation,
    zoom: 13,
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: GMP_ATTRIBUTION_IDS,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
  });

  clinicInfoWindow = new InfoWindow();

  clinicMarker = new AdvancedMarkerElement({
    map: mapInstance,
    position: props.clinicLocation,
    title: props.venue?.displayName ?? '450 Sutter Dental Studio',
  });
  clinicMarker.append(
    buildClinicMarkerBadge(props.venue?.displayName ?? '450 Sutter Dental')
  );
  clinicMarker.addListener('click', () => {
    if (!clinicInfoWindow || !mapInstance || !clinicMarker) return;
    clinicInfoWindow.setContent(buildClinicInfoWindowNode());
    clinicInfoWindow.open({ map: mapInstance, anchor: clinicMarker });
  });

  const originPin = new PinElement({
    background: '#0f172a',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: 'A',
    scale: 1.0,
  });

  originMarker = new AdvancedMarkerElement({
    map: mapInstance,
    position: props.origin.location,
    title: props.origin.label,
    content: originPin,
  });

  coverageCircle = new Circle({
    map: props.showCoverage ? mapInstance : null,
    center: props.clinicLocation,
    radius: HOME_VISIT_RADIUS_METERS,
    strokeColor: '#0f766e',
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: '#14b8a6',
    fillOpacity: 0.12,
    clickable: false,
  });
}

function syncClinicDetails() {
  if (!mapInstance) return;
  if (clinicMarker) {
    clinicMarker.position = props.clinicLocation;
    const label = props.venue?.displayName ?? '450 Sutter Dental';
    clinicMarker.title = label;
    clinicMarker.replaceChildren(buildClinicMarkerBadge(label));
  }
  if (coverageCircle) {
    coverageCircle.setCenter(props.clinicLocation);
  }
}

function syncOriginMarker() {
  if (!originMarker) return;
  originMarker.position = props.origin.location;
  originMarker.title = props.origin.label;
}

function syncCoverageOverlay() {
  if (!coverageCircle) return;
  coverageCircle.setMap(props.showCoverage ? mapInstance : null);
}

function clearPolylines() {
  for (const poly of activePolylines) {
    poly.setMap(null);
  }
  activePolylines = [];
}

function syncRoutePolylines() {
  clearPolylines();
  if (!mapInstance || !props.libs || !props.activeRoute) return;

  const strokeColor = TRAVEL_MODE_META[props.travelMode].strokeColor;
  const created = props.activeRoute.createPolylines({
    polylineOptions: {
      strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: props.travelMode === 'WALKING' ? 5 : 6,
    },
  });

  for (const poly of created) {
    poly.setMap(mapInstance);
  }
  activePolylines = created;

  const { LatLngBounds } = props.libs.core;
  const bounds = new LatLngBounds();
  bounds.extend(props.origin.location);
  bounds.extend(props.clinicLocation);
  if (props.activeRoute.path) {
    for (const pt of props.activeRoute.path) {
      bounds.extend({ lat: pt.lat, lng: pt.lng });
    }
  }
  mapInstance.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
}

async function syncStreetViewPanorama() {
  if (props.viewMode === 'map') return;
  if (!props.libs || !streetViewContainerRef.value) return;

  const centerKey = `${props.clinicLocation.lat.toFixed(5)},${props.clinicLocation.lng.toFixed(5)}`;
  if (panoramaInstance && lastStreetViewCenterKey === centerKey) {
    props.libs.core.event.trigger(panoramaInstance, 'resize');
    return;
  }

  streetViewUnavailable.value = false;
  const { StreetViewService, StreetViewPanorama, StreetViewPreference, StreetViewSource } =
    props.libs.streetView;
  const { LatLng } = props.libs.core;
  const { spherical } = props.libs.geometry;

  try {
    const svService = new StreetViewService();
    const { data } = await svService.getPanorama({
      location: props.clinicLocation,
      radius: 90,
      preference: StreetViewPreference.BEST,
      source: StreetViewSource.OUTDOOR,
    });

    const panoId = data.location?.pano;
    const panoLatLng = data.location?.latLng;
    const clinicLatLng = new LatLng(
      props.clinicLocation.lat,
      props.clinicLocation.lng
    );
    const heading = panoLatLng
      ? spherical.computeHeading(panoLatLng, clinicLatLng)
      : 15;

    if (!panoramaInstance) {
      panoramaInstance = new StreetViewPanorama(streetViewContainerRef.value, {
        pano: panoId,
        position: panoLatLng ?? props.clinicLocation,
        pov: { heading, pitch: 8 },
        zoom: 1,
        addressControl: true,
        linksControl: true,
        panControl: true,
        zoomControl: true,
        enableCloseButton: false,
      });
    } else {
      if (panoId) {
        panoramaInstance.setPano(panoId);
      } else {
        panoramaInstance.setPosition(props.clinicLocation);
      }
      panoramaInstance.setPov({ heading, pitch: 8 });
    }

    if (mapInstance) {
      mapInstance.setStreetView(panoramaInstance);
    }
    lastStreetViewCenterKey = centerKey;
  } catch {
    streetViewUnavailable.value = true;
  }
}

watch(
  () => props.libs,
  async (libs) => {
    if (!libs) return;
    await nextTick();
    initializeMapIfNeeded();
    syncClinicDetails();
    syncOriginMarker();
    syncRoutePolylines();
    void syncStreetViewPanorama();
  },
  { immediate: true }
);

watch(
  () => [props.clinicLocation, props.venue],
  () => {
    syncClinicDetails();
    void syncStreetViewPanorama();
  },
  { deep: true }
);

watch(
  () => props.origin,
  () => {
    syncOriginMarker();
  },
  { deep: true }
);

watch(
  () => props.showCoverage,
  () => {
    syncCoverageOverlay();
  }
);

watch(
  () => props.activeRoute,
  () => {
    syncRoutePolylines();
  }
);

watch(
  () => props.viewMode,
  async () => {
    await nextTick();
    if (props.libs && mapInstance && props.viewMode !== 'streetview') {
      props.libs.core.event.trigger(mapInstance, 'resize');
    }
    if (props.viewMode !== 'map') {
      await syncStreetViewPanorama();
    }
  }
);

onBeforeUnmount(() => {
  clearPolylines();
  if (clinicMarker) clinicMarker.map = null;
  if (originMarker) originMarker.map = null;
  if (coverageCircle) coverageCircle.setMap(null);
  mapInstance = null;
  panoramaInstance = null;
});
</script>

<template>
  <main class="map-workspace" :class="`mode-${viewMode}`">
    <div v-if="setupError" class="map-setup-fallback" data-testid="map-container">
      <div class="setup-card">
        <span class="eyebrow">Google Maps Platform Setup Required</span>
        <h2>Connect Your Maps API Key to Activate the Live Map</h2>
        <p>{{ setupError }}</p>
        <ol class="setup-steps">
          <li>
            Get a free zero-billing Maps Demo Key at
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              mapsplatform.google.com/maps-demo-key
            </a>
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and set
            <code>VITE_GOOGLE_MAPS_API_KEY</code>.
          </li>
          <li>Restart or reload the Vite dev/preview server.</li>
        </ol>
      </div>
    </div>

    <template v-else>
      <div
        v-show="viewMode !== 'streetview'"
        ref="mapContainerRef"
        class="map-canvas"
        data-testid="map-container"
        aria-label="Interactive Google Map showing 450 Sutter Dental Studio and route"
      />

      <div
        v-show="viewMode !== 'map'"
        class="street-view-panel"
        data-testid="street-view-container"
      >
        <div class="street-view-bar">
          <div>
            <span class="sv-badge">Street View Entrance Preview</span>
            <span class="sv-caption">
              {{ venue?.formattedAddress ?? '450 Sutter St, San Francisco, CA' }}
            </span>
          </div>
          <button
            type="button"
            class="sv-close-btn"
            @click="emit('set-view-mode', 'map')"
          >
            Back to Full Map
          </button>
        </div>

        <div
          v-if="streetViewUnavailable"
          class="sv-fallback"
        >
          Outdoor Street View imagery is currently unavailable at this exact coordinate.
        </div>
        <div
          ref="streetViewContainerRef"
          class="street-view-canvas"
          aria-label="Google Street View panorama of clinic entrance"
        />
      </div>
    </template>
  </main>
</template>
