<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type {
  FloodZone,
  IncidentPoint,
  LatLngPoint,
  ShelterPlace,
} from '../types/hazard';
import { MIAMI_CENTER } from '../data/hazardData';
import { loadGmpLibraries } from '../services/mapsLoader';
import {
  buildIncidentInfoContent,
  buildShelterInfoContent,
  buildZoneInfoContent,
} from '../utils/domHelpers';

const props = defineProps<{
  apiKey: string;
  incidents: IncidentPoint[];
  floodZones: FloodZone[];
  shelters: ShelterPlace[];
  selectedOrigin: LatLngPoint;
  activeRoute: google.maps.routes.Route | null;
  showHeatmap: boolean;
  showPolygons: boolean;
}>();

const emit = defineEmits<{
  (e: 'map-ready', polygons: google.maps.Polygon[]): void;
  (e: 'map-click', point: LatLngPoint): void;
  (e: 'route-to-shelter', shelter: ShelterPlace): void;
}>();

const mapContainerRef = ref<HTMLElement | null>(null);
const heatmapEngineLabel = ref<string>('Initializing...');
const initError = ref<string | null>(null);

let mapInstance: google.maps.Map | null = null;
let infoWindow: google.maps.InfoWindow | null = null;
let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let deckOverlay: GoogleMapsOverlay | null = null;
let useDeckGl = false;

let floodPolygons: google.maps.Polygon[] = [];
let shelterMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let userIncidentMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
let fallbackHeatCircles: google.maps.Circle[] = [];
let routePolylines: google.maps.Polyline[] = [];

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function buildHeatmapLayer(data: IncidentPoint[], visible: boolean): HeatmapLayer<IncidentPoint> {
  return new HeatmapLayer<IncidentPoint>({
    id: 'miami-hazard-heatmap',
    data,
    visible,
    getPosition: (d) => [d.lng, d.lat],
    getWeight: (d) => d.weight,
    radiusPixels: 42,
    intensity: 1.4,
    threshold: 0.05,
    aggregation: 'SUM',
    colorRange: [
      [254, 240, 138, 160],
      [253, 224, 71, 185],
      [251, 146, 60, 205],
      [239, 68, 68, 225],
      [185, 28, 28, 245],
    ],
  });
}

function syncFallbackCircles(): void {
  if (!mapInstance) return;
  for (const circle of fallbackHeatCircles) {
    circle.setMap(null);
  }
  fallbackHeatCircles = [];

  if (useDeckGl || !props.showHeatmap) return;

  for (const inc of props.incidents) {
    const color =
      inc.weight >= 9 ? '#dc2626' : inc.weight >= 7 ? '#ea580c' : '#f59e0b';
    const circle = new google.maps.Circle({
      map: mapInstance,
      center: { lat: inc.lat, lng: inc.lng },
      radius: 130 + inc.weight * 18,
      strokeOpacity: 0,
      fillColor: color,
      fillOpacity: 0.24,
      clickable: false,
    });
    fallbackHeatCircles.push(circle);
  }
}

function syncHeatmap(): void {
  if (!mapInstance) return;
  if (useDeckGl && deckOverlay) {
    deckOverlay.setProps({
      layers: [buildHeatmapLayer(props.incidents, props.showHeatmap)],
    });
  } else {
    syncFallbackCircles();
  }
}

function syncPolygonVisibility(): void {
  for (const poly of floodPolygons) {
    poly.setMap(props.showPolygons && mapInstance ? mapInstance : null);
  }
}

async function syncShelterMarkers(): Promise<void> {
  if (!mapInstance) return;
  for (const m of shelterMarkers) {
    m.map = null;
  }
  shelterMarkers = [];

  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

  for (const shelter of props.shelters) {
    const pin = new PinElement({
      background: '#059669',
      borderColor: '#064e3b',
      glyphColor: '#ffffff',
      glyphText: 'H',
      scale: 1.05,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: shelter.location,
      title: shelter.displayName,
      content: pin,
    });

    marker.addEventListener('click', () => {
      if (!infoWindow || !mapInstance) return;
      infoWindow.setContent(
        buildShelterInfoContent(shelter, (selected) => {
          emit('route-to-shelter', selected);
        }),
      );
      infoWindow.open({ anchor: marker, map: mapInstance });
    });

    shelterMarkers.push(marker);
  }
}

async function syncUserIncidentMarkers(): Promise<void> {
  if (!mapInstance) return;
  for (const m of userIncidentMarkers) {
    m.map = null;
  }
  userIncidentMarkers = [];

  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
  const submitted = props.incidents.filter((i) => i.isUserSubmitted);

  for (const inc of submitted) {
    const pin = new PinElement({
      background: '#dc2626',
      borderColor: '#7f1d1d',
      glyphColor: '#ffffff',
      glyphText: '!',
      scale: 0.95,
    });

    const marker = new AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: inc.lat, lng: inc.lng },
      title: inc.hazardType,
      content: pin,
    });

    marker.addEventListener('click', () => {
      if (!infoWindow || !mapInstance) return;
      infoWindow.setContent(buildIncidentInfoContent(inc));
      infoWindow.open({ anchor: marker, map: mapInstance });
    });

    userIncidentMarkers.push(marker);
  }
}

function syncRoutePolylines(): void {
  for (const line of routePolylines) {
    line.setMap(null);
  }
  routePolylines = [];

  if (!mapInstance || !props.activeRoute) return;

  const lines = props.activeRoute.createPolylines({
    polylineOptions: {
      strokeColor: '#0284c7',
      strokeOpacity: 0.92,
      strokeWeight: 6,
      zIndex: 50,
    },
  });

  for (const line of lines) {
    line.setMap(mapInstance);
    routePolylines.push(line);
  }

  if (props.activeRoute.path && props.activeRoute.path.length > 1) {
    const bounds = new google.maps.LatLngBounds();
    for (const pt of props.activeRoute.path) {
      bounds.extend({ lat: pt.lat, lng: pt.lng });
    }
    mapInstance.fitBounds(bounds, { top: 48, right: 48, bottom: 80, left: 48 });
  }
}

onMounted(async () => {
  if (!props.apiKey || props.apiKey === 'your_google_maps_api_key_here') {
    heatmapEngineLabel.value = 'API Key Required';
    return;
  }
  if (!mapContainerRef.value) return;

  try {
    const { maps, marker } = await loadGmpLibraries(props.apiKey);

    mapInstance = new maps.Map(mapContainerRef.value, {
      center: MIAMI_CENTER,
      zoom: 13,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindow = new maps.InfoWindow();

    // Selected origin / incident pin
    const originPin = new marker.PinElement({
      background: '#f59e0b',
      borderColor: '#78350f',
      glyphColor: '#ffffff',
      glyphText: 'O',
      scale: 1.1,
    });

    originMarker = new marker.AdvancedMarkerElement({
      map: mapInstance,
      position: props.selectedOrigin,
      title: 'Selected Incident / Evacuation Origin',
      content: originPin,
    });

    // Click anywhere on map to geotag incident
    mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      emit('map-click', {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    });

    // Flood-hazard zone polygons
    floodPolygons = props.floodZones.map((zone) => {
      const polygon = new maps.Polygon({
        paths: zone.paths,
        strokeColor: zone.strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: zone.fillColor,
        fillOpacity: 0.28,
        map: props.showPolygons ? mapInstance : null,
        zIndex: 10,
      });

      polygon.addListener('click', (event: google.maps.PolyMouseEvent) => {
        if (event.latLng) {
          emit('map-click', {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
          if (infoWindow && mapInstance) {
            infoWindow.setPosition(event.latLng);
            infoWindow.setContent(buildZoneInfoContent(zone));
            infoWindow.open(mapInstance);
          }
        }
      });

      return polygon;
    });

    // deck.gl HeatmapLayer via GoogleMapsOverlay with graceful WebGL2 fallback
    if (detectWebGL2()) {
      try {
        deckOverlay = new GoogleMapsOverlay({
          layers: [buildHeatmapLayer(props.incidents, props.showHeatmap)],
          onError: () => {
            useDeckGl = false;
            heatmapEngineLabel.value = 'Heatmap: Canvas Fallback';
            syncFallbackCircles();
          },
        });
        deckOverlay.setMap(mapInstance);
        useDeckGl = true;
        heatmapEngineLabel.value = 'Heatmap: deck.gl WebGL2';
      } catch {
        useDeckGl = false;
        heatmapEngineLabel.value = 'Heatmap: Canvas Fallback';
        syncFallbackCircles();
      }
    } else {
      useDeckGl = false;
      heatmapEngineLabel.value = 'Heatmap: Canvas Fallback';
      syncFallbackCircles();
    }

    await syncShelterMarkers();
    await syncUserIncidentMarkers();
    syncRoutePolylines();

    emit('map-ready', floodPolygons);
  } catch (err: unknown) {
    initError.value =
      err instanceof Error ? err.message : 'Unable to initialize Google Maps JavaScript API.';
  }
});

watch(
  () => [props.incidents, props.showHeatmap] as const,
  () => {
    syncHeatmap();
    void syncUserIncidentMarkers();
  },
  { deep: true },
);

watch(
  () => props.showPolygons,
  () => {
    syncPolygonVisibility();
  },
);

watch(
  () => props.shelters,
  () => {
    void syncShelterMarkers();
  },
  { deep: true },
);

watch(
  () => props.selectedOrigin,
  (nextOrigin) => {
    if (originMarker) {
      originMarker.position = nextOrigin;
    }
  },
  { deep: true },
);

watch(
  () => props.activeRoute,
  () => {
    syncRoutePolylines();
  },
);

onBeforeUnmount(() => {
  if (deckOverlay) {
    deckOverlay.setMap(null);
    deckOverlay = null;
  }
  for (const poly of floodPolygons) poly.setMap(null);
  for (const line of routePolylines) line.setMap(null);
  for (const circle of fallbackHeatCircles) circle.setMap(null);
  for (const m of shelterMarkers) m.map = null;
  for (const m of userIncidentMarkers) m.map = null;
  if (originMarker) originMarker.map = null;
});
</script>

<template>
  <main class="map-stage">
    <div
      id="map-container"
      ref="mapContainerRef"
      data-testid="map-container"
      class="map-canvas"
      aria-label="Interactive Miami flood hazard and safe shelter map"
    ></div>

    <div class="map-legend">
      <div class="legend-title">
        <span>Hazard &amp; Evacuation Legend</span>
        <span class="legend-engine">{{ heatmapEngineLabel }}</span>
      </div>
      <div class="legend-rows">
        <div class="legend-row">
          <span class="swatch heat"></span>
          <span>Incident Density</span>
        </div>
        <div class="legend-row">
          <span class="swatch flood"></span>
          <span>Flood-Hazard Zone</span>
        </div>
        <div class="legend-row">
          <span class="swatch shelter"></span>
          <span>Safe Shelter (H)</span>
        </div>
        <div class="legend-row">
          <span class="swatch route"></span>
          <span>Bypass Route</span>
        </div>
      </div>
      <div class="legend-disclaimer">
        Civic situational awareness &amp; planning tool only. Always follow official Miami-Dade
        Emergency Management &amp; NWS evacuation orders.
      </div>
    </div>

    <div
      v-if="!apiKey || apiKey === 'your_google_maps_api_key_here' || initError"
      class="api-missing-overlay"
    >
      <div class="api-missing-card">
        <h2>{{ initError ? 'Google Maps Initialization Notice' : 'Configure Google Maps API Key' }}</h2>
        <p v-if="initError">{{ initError }}</p>
        <p v-else>
          Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load the
          interactive Miami hazard map, Places (New) shelters, Geocoding, Elevation, Weather, and
          Routes APIs.
        </p>
        <ol>
          <li>
            Get a free zero-billing
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Maps Demo Key
            </a>
            (or use your Google Cloud key).
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and add your key.
          </li>
          <li>Restart the Vite dev/preview server.</li>
        </ol>
      </div>
    </div>
  </main>
</template>
