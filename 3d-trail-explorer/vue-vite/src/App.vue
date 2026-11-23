<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import ChapterTourPanel from './components/ChapterTourPanel.vue';
import ElevationProfileChart from './components/ElevationProfileChart.vue';
import SelectedViewpointCard from './components/SelectedViewpointCard.vue';
import {
  INITIAL_MAP_CENTER,
  LAKE_TAHOE_BOUNDS,
  SEED_SEARCH_QUERY,
  TOUR_CHAPTERS,
  TRAIL_WAYPOINTS,
  buildElevationSamplesAndMetrics,
  metersToFeet,
} from './data/trailData';
import type {
  CameraPreset,
  CameraTelemetry,
  ElevationSamplePoint,
  SelectedPlaceDetails,
  TourChapter,
  TrailMetrics,
} from './types/explorer';

const map3dRef = ref<google.maps.maps3d.Map3DElement | null>(null);
const autocompleteHostRef = ref<HTMLDivElement | null>(null);

const searchQuery = ref('');
const activeChapterId = ref<string>(TOUR_CHAPTERS[0].id);
const isAutoPlaying = ref(false);
const mobileDrawerOpen = ref(true);

const telemetry = ref<CameraTelemetry>({
  heading: TOUR_CHAPTERS[0].camera.heading,
  tilt: TOUR_CHAPTERS[0].camera.tilt,
  range: TOUR_CHAPTERS[0].camera.range,
  lat: INITIAL_MAP_CENTER.lat,
  lng: INITIAL_MAP_CENTER.lng,
});

const elevationSamples = ref<ElevationSamplePoint[]>([]);
const trailMetrics = ref<TrailMetrics | null>(null);
const elevationLoading = ref(false);
const elevationError = ref<string | null>(null);
const activeSampleIndex = ref<number | null>(null);

const selectedPlace = ref<SelectedPlaceDetails | null>(null);
const placeLoading = ref(false);
const placeError = ref<string | null>(null);

const apiKeyMissing = ref(false);
const mapRuntimeNotice = ref<string | null>(null);

const activeChapter = computed(
  () => TOUR_CHAPTERS.find((c) => c.id === activeChapterId.value) ?? TOUR_CHAPTERS[0]
);

let maps3dLibrary: google.maps.Maps3DLibrary | null = null;
let markerLibrary: google.maps.MarkerLibrary | null = null;
let placesLibrary: google.maps.PlacesLibrary | null = null;
let elevationService: google.maps.ElevationService | null = null;

let probeMarker: google.maps.maps3d.Marker3DElement | null = null;
let searchMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
let searchPopover: google.maps.maps3d.PopoverElement | null = null;
let autoPlayTimer: number | null = null;

function syncTelemetryFromMap(): void {
  const mapEl = map3dRef.value;
  if (!mapEl) return;

  const currentHeading = typeof mapEl.heading === 'number' ? mapEl.heading : telemetry.value.heading;
  const currentTilt = typeof mapEl.tilt === 'number' ? mapEl.tilt : telemetry.value.tilt;
  const currentRange = typeof mapEl.range === 'number' ? mapEl.range : telemetry.value.range;
  const currentCenter = mapEl.center;

  telemetry.value = {
    heading: ((currentHeading % 360) + 360) % 360,
    tilt: currentTilt,
    range: currentRange,
    lat: currentCenter?.lat ?? telemetry.value.lat,
    lng: currentCenter?.lng ?? telemetry.value.lng,
  };
}

function flyToCameraPreset(preset: CameraPreset, durationMillis = 1800): void {
  telemetry.value = {
    heading: ((preset.heading % 360) + 360) % 360,
    tilt: preset.tilt,
    range: preset.range,
    lat: preset.center.lat,
    lng: preset.center.lng,
  };

  const mapEl = map3dRef.value;
  if (!mapEl || typeof mapEl.flyCameraTo !== 'function') return;

  try {
    mapEl.flyCameraTo({
      endCamera: {
        center: preset.center,
        heading: preset.heading,
        tilt: preset.tilt,
        range: preset.range,
      },
      durationMillis,
    });
  } catch (err) {
    console.warn('3D camera flyCameraTo deferred or unavailable in this environment:', err);
  }
}

async function queryPointElevation(lat: number, lng: number): Promise<number | null> {
  if (!elevationService) return null;
  try {
    const response = await elevationService.getElevationForLocations({
      locations: [{ lat, lng }],
    });
    const result = response.results?.[0];
    return typeof result?.elevation === 'number' ? result.elevation : null;
  } catch {
    return null;
  }
}

function upsertSearchedLandmarkMarker(place: SelectedPlaceDetails): void {
  const mapEl = map3dRef.value;
  if (!mapEl || !maps3dLibrary || !markerLibrary) return;

  if (searchMarker) {
    searchMarker.remove();
    searchMarker = null;
  }
  if (searchPopover) {
    searchPopover.remove();
    searchPopover = null;
  }

  const pin = new markerLibrary.PinElement({
    glyphText: '★',
    scale: 1.3,
    background: '#38bdf8',
    borderColor: '#ffffff',
    glyphColor: '#0f172a',
  });

  const popover = new maps3dLibrary.PopoverElement();
  const header = document.createElement('span');
  header.slot = 'header';
  header.textContent = place.displayName;
  const body = document.createElement('span');
  body.textContent = place.formattedAddress || 'Lake Tahoe Landmark';
  popover.append(header, body);

  const marker = new maps3dLibrary.Marker3DInteractiveElement({
    title: place.displayName,
    position: { lat: place.lat, lng: place.lng, altitude: 30 },
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    gmpPopoverTargetElement: popover,
  });
  marker.append(pin);

  mapEl.append(marker);
  mapEl.append(popover);
  searchMarker = marker;
  searchPopover = popover;
}

async function handleSelectedPlaceInstance(
  place: google.maps.places.Place,
  sourceLabel: string,
  options: { flyCamera?: boolean; addMarker?: boolean } = {}
): Promise<void> {
  const { flyCamera = true, addMarker = true } = options;
  placeLoading.value = true;
  placeError.value = null;

  try {
    await place.fetchFields({
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
    });

    const loc = place.location;
    if (!loc) {
      placeError.value = 'Selected place does not include coordinates.';
      return;
    }

    const lat = loc.lat();
    const lng = loc.lng();
    const elevationMeters = await queryPointElevation(lat, lng);

    const details: SelectedPlaceDetails = {
      id: place.id ?? `${lat},${lng}`,
      displayName: place.displayName ?? 'Lake Tahoe Landmark',
      formattedAddress: place.formattedAddress ?? 'Lake Tahoe, CA/NV',
      lat,
      lng,
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      googleMapsURI: place.googleMapsURI ?? null,
      elevationMeters,
      elevationFeet: elevationMeters !== null ? metersToFeet(elevationMeters) : null,
      sourceLabel,
    };

    selectedPlace.value = details;

    if (addMarker) {
      upsertSearchedLandmarkMarker(details);
    }

    if (flyCamera) {
      flyToCameraPreset(
        {
          center: {
            lat,
            lng,
            altitude: elevationMeters !== null ? Math.max(1890, elevationMeters + 35) : 1930,
          },
          heading: 25,
          tilt: 70,
          range: 1400,
        },
        2000
      );
    }
  } catch (err) {
    placeError.value = err instanceof Error ? err.message : 'Unable to fetch place details.';
  } finally {
    placeLoading.value = false;
  }
}

async function searchLandmark(
  queryText: string,
  options: { flyCamera?: boolean; addMarker?: boolean; sourceLabel?: string } = {}
): Promise<void> {
  const trimmed = queryText.trim();
  if (!trimmed || !placesLibrary) return;

  const {
    flyCamera = true,
    addMarker = true,
    sourceLabel = 'Places API (New) · Text Search',
  } = options;

  placeLoading.value = true;
  placeError.value = null;

  try {
    const { places } = await placesLibrary.Place.searchByText({
      textQuery: trimmed,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
      locationBias: LAKE_TAHOE_BOUNDS,
      maxResultCount: 1,
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    const first = places?.[0];
    if (!first || !first.location) {
      placeError.value = `No landmark found for "${trimmed}".`;
      return;
    }

    const lat = first.location.lat();
    const lng = first.location.lng();
    const elevationMeters = await queryPointElevation(lat, lng);

    const details: SelectedPlaceDetails = {
      id: first.id ?? trimmed,
      displayName: first.displayName ?? trimmed,
      formattedAddress: first.formattedAddress ?? 'Lake Tahoe Basin',
      lat,
      lng,
      rating: typeof first.rating === 'number' ? first.rating : null,
      userRatingCount: typeof first.userRatingCount === 'number' ? first.userRatingCount : null,
      googleMapsURI: first.googleMapsURI ?? null,
      elevationMeters,
      elevationFeet: elevationMeters !== null ? metersToFeet(elevationMeters) : null,
      sourceLabel,
    };

    selectedPlace.value = details;

    if (addMarker) {
      upsertSearchedLandmarkMarker(details);
    }

    if (flyCamera) {
      flyToCameraPreset(
        {
          center: {
            lat,
            lng,
            altitude: elevationMeters !== null ? Math.max(1890, elevationMeters + 35) : 1930,
          },
          heading: 25,
          tilt: 70,
          range: 1400,
        },
        2000
      );
    }
  } catch (err) {
    placeError.value = err instanceof Error ? err.message : 'Places search failed.';
  } finally {
    placeLoading.value = false;
  }
}

function stopAutoPlay(): void {
  if (autoPlayTimer !== null) {
    window.clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  isAutoPlaying.value = false;
}

async function selectChapter(chapter: TourChapter, fromAutoPlay = false): Promise<void> {
  if (!fromAutoPlay) {
    stopAutoPlay();
  }
  activeChapterId.value = chapter.id;
  flyToCameraPreset(chapter.camera, 1800);

  if (placesLibrary) {
    await searchLandmark(chapter.searchQuery, {
      flyCamera: false,
      addMarker: false,
      sourceLabel: `Chapter ${chapter.stepNumber} · Places API (New)`,
    });
  }
}

function toggleAutoPlay(): void {
  if (isAutoPlaying.value) {
    stopAutoPlay();
    return;
  }

  isAutoPlaying.value = true;
  autoPlayTimer = window.setInterval(() => {
    const idx = TOUR_CHAPTERS.findIndex((c) => c.id === activeChapterId.value);
    const nextChapter = TOUR_CHAPTERS[(idx + 1) % TOUR_CHAPTERS.length];
    void selectChapter(nextChapter, true);
  }, 5500);
}

function handleSearchSubmit(): void {
  stopAutoPlay();
  void searchLandmark(searchQuery.value, {
    flyCamera: true,
    addMarker: true,
    sourceLabel: 'Places API (New) · Landmark Search',
  });
}

function handleElevationHover(index: number | null): void {
  activeSampleIndex.value = index;
  const mapEl = map3dRef.value;
  if (!mapEl || !maps3dLibrary || !markerLibrary) return;

  if (index === null || !elevationSamples.value[index]) {
    if (probeMarker) {
      probeMarker.remove();
      probeMarker = null;
    }
    return;
  }

  const sample = elevationSamples.value[index];
  if (!probeMarker) {
    const pin = new markerLibrary.PinElement({
      glyphText: '▲',
      scale: 1.0,
      background: '#ffffff',
      borderColor: 'rgb(255, 0, 0)',
      glyphColor: 'rgb(255, 0, 0)',
    });
    const marker = new maps3dLibrary.Marker3DElement({
      position: { lat: sample.lat, lng: sample.lng, altitude: 28 },
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      label: `${Math.round(sample.elevationMeters)}m`,
    });
    marker.append(pin);
    mapEl.append(marker);
    probeMarker = marker;
  } else {
    probeMarker.position = { lat: sample.lat, lng: sample.lng, altitude: 28 };
    probeMarker.label = `${Math.round(sample.elevationMeters)}m`;
  }
}

function handleElevationSelect(sample: ElevationSamplePoint): void {
  stopAutoPlay();
  flyToCameraPreset(
    {
      center: {
        lat: sample.lat,
        lng: sample.lng,
        altitude: sample.elevationMeters + 20,
      },
      heading: telemetry.value.heading,
      tilt: 72,
      range: 750,
    },
    1400
  );
}

async function fetchTrailElevationProfile(): Promise<void> {
  if (!elevationService) return;
  elevationLoading.value = true;
  elevationError.value = null;

  try {
    const response = await elevationService.getElevationAlongPath({
      path: [...TRAIL_WAYPOINTS],
      samples: 48,
    });
    const { samples, metrics } = buildElevationSamplesAndMetrics(response.results ?? []);
    elevationSamples.value = samples;
    trailMetrics.value = metrics;
  } catch (err) {
    elevationError.value =
      err instanceof Error ? err.message : 'Unable to fetch trail elevation profile.';
  } finally {
    elevationLoading.value = false;
  }
}

function render3DTrailAndMarkers(
  mapEl: google.maps.maps3d.Map3DElement,
  maps3d: google.maps.Maps3DLibrary,
  marker: google.maps.MarkerLibrary
): void {
  // Extruded bright-red RGB(255, 0, 0) 3D hiking trail route
  const trailPolyline = new maps3d.Polyline3DElement({
    strokeColor: 'rgb(255, 0, 0)',
    strokeWidth: 8,
    outerColor: 'rgba(255, 255, 255, 0.85)',
    outerWidth: 0.25,
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    drawsOccludedSegments: true,
    path: TRAIL_WAYPOINTS.map((wp) => ({
      lat: wp.lat,
      lng: wp.lng,
      altitude: 18,
    })),
  });
  mapEl.append(trailPolyline);

  // Interactive 3D trailhead & viewpoint markers
  for (const chapter of TOUR_CHAPTERS) {
    const pin = new marker.PinElement({
      glyphText: String(chapter.stepNumber),
      scale: 1.25,
      background: chapter.markerColor,
      borderColor: '#ffffff',
      glyphColor: '#0f172a',
    });

    const popover = new maps3d.PopoverElement();
    const header = document.createElement('span');
    header.slot = 'header';
    header.textContent = chapter.title;
    const body = document.createElement('span');
    body.textContent = chapter.subtitle;
    popover.append(header, body);

    const interactiveMarker = new maps3d.Marker3DInteractiveElement({
      title: chapter.title,
      position: chapter.markerPosition,
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      gmpPopoverTargetElement: popover,
    });
    interactiveMarker.append(pin);

    interactiveMarker.addEventListener('gmp-click', () => {
      void selectChapter(chapter);
    });

    mapEl.append(interactiveMarker);
    mapEl.append(popover);
  }
}

function mountPlaceAutocomplete(places: google.maps.PlacesLibrary): void {
  if (!autocompleteHostRef.value) return;

  const autocompleteEl = new places.PlaceAutocompleteElement({
    locationBias: LAKE_TAHOE_BOUNDS,
  });
  autocompleteEl.setAttribute('aria-label', 'Autocomplete Lake Tahoe landmarks');

  autocompleteEl.addEventListener('gmp-select', (event) => {
    stopAutoPlay();
    const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
    const place = selectEvent.placePrediction.toPlace();
    void handleSelectedPlaceInstance(place, 'Places Autocomplete');
  });

  autocompleteHostRef.value.replaceChildren(autocompleteEl);
}

onMounted(async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!apiKey) {
    apiKeyMissing.value = true;
    mapRuntimeNotice.value =
      'VITE_GOOGLE_MAPS_API_KEY is not set. Copy .env.example to .env.local and add a Maps Demo Key or Google Cloud API key.';
    elevationError.value = 'API key required for live Elevation API sampling.';
    placeError.value = 'API key required for live Places API (New) lookup.';
    return;
  }

  try {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });

    const [maps3d, marker, places, elevation] = await Promise.all([
      importLibrary('maps3d'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('elevation'),
    ]);

    maps3dLibrary = maps3d;
    markerLibrary = marker;
    placesLibrary = places;
    elevationService = new elevation.ElevationService();

    await customElements.whenDefined('gmp-map-3d');

    const mapEl = map3dRef.value;
    if (mapEl) {
      mapEl.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
      mapEl.addEventListener('gmp-headingchange', syncTelemetryFromMap);
      mapEl.addEventListener('gmp-tiltchange', syncTelemetryFromMap);
      mapEl.addEventListener('gmp-rangechange', syncTelemetryFromMap);
      mapEl.addEventListener('gmp-centerchange', syncTelemetryFromMap);
      mapEl.addEventListener('gmp-error', () => {
        mapRuntimeNotice.value =
          '3D Terrain rendering requires WebGL2 and an authorized Maps JavaScript API key.';
      });

      render3DTrailAndMarkers(mapEl, maps3d, marker);
      syncTelemetryFromMap();
    }

    mountPlaceAutocomplete(places);

    await Promise.all([
      fetchTrailElevationProfile(),
      searchLandmark(SEED_SEARCH_QUERY, {
        flyCamera: false,
        addMarker: false,
        sourceLabel: 'Emerald Bay · Places API (New)',
      }),
    ]);
  } catch (err) {
    mapRuntimeNotice.value =
      err instanceof Error
        ? err.message
        : 'Unable to initialize Google Maps 3D libraries in this browser context.';
  }
});

onBeforeUnmount(() => {
  stopAutoPlay();
});
</script>

<template>
  <div class="explorer-shell" data-testid="trail-explorer-app">
    <!-- Top Floating Glassmorphic Header -->
    <header class="top-header">
      <div class="brand-block">
        <span class="brand-badge">3D</span>
        <div>
          <h1 class="brand-title">Lake Tahoe 3D Trail Explorer</h1>
          <p class="brand-subtitle">Emerald Bay · Photorealistic 3D Terrain &amp; Elevation Tour</p>
        </div>
      </div>

      <div class="search-cluster">
        <form class="search-form" @submit.prevent="handleSearchSubmit">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            data-testid="landmark-search-input"
            placeholder="Search Lake Tahoe landmark (e.g. Vikingsholm)..."
            aria-label="Search Lake Tahoe landmarks"
          />
          <button
            type="submit"
            class="search-submit"
            data-testid="landmark-search-submit"
          >
            Fly To
          </button>
        </form>
        <div ref="autocompleteHostRef" class="autocomplete-host" aria-label="Places Autocomplete"></div>
      </div>

      <div class="telemetry-pill" data-testid="camera-telemetry-badge" aria-label="3D Camera Telemetry">
        <span class="tele-item">
          <span class="tele-label">HDG</span>
          <span class="tele-val">{{ Math.round(telemetry.heading) }}°</span>
        </span>
        <span class="tele-sep" aria-hidden="true"></span>
        <span class="tele-item">
          <span class="tele-label">TILT</span>
          <span class="tele-val">{{ Math.round(telemetry.tilt) }}°</span>
        </span>
        <span class="tele-sep" aria-hidden="true"></span>
        <span class="tele-item">
          <span class="tele-label">RNG</span>
          <span class="tele-val">
            {{ telemetry.range >= 1000 ? `${(telemetry.range / 1000).toFixed(2)}km` : `${Math.round(telemetry.range)}m` }}
          </span>
        </span>
      </div>
    </header>

    <!-- Main Full-Bleed 3D Map Canvas -->
    <main class="map-stage" data-testid="map-3d-container">
      <gmp-map-3d
        ref="map3dRef"
        data-testid="gmp-map-3d"
        class="map-3d-element"
        mode="hybrid"
        center="38.9542,-120.1103,1900"
        range="3800"
        tilt="66"
        heading="35"
        gesture-handling="greedy"
        internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
      ></gmp-map-3d>

      <div v-if="apiKeyMissing || mapRuntimeNotice" class="runtime-banner" role="status">
        {{ mapRuntimeNotice }}
      </div>
    </main>

    <!-- Left Floating Sidebar / Collapsible Mobile Drawer -->
    <aside class="sidebar-drawer" :class="{ collapsed: !mobileDrawerOpen }" aria-label="Trail Controls & Analytics">
      <button
        type="button"
        class="mobile-drawer-toggle"
        @click="mobileDrawerOpen = !mobileDrawerOpen"
      >
        {{ mobileDrawerOpen ? 'Hide Trail Controls ▼' : 'Show Trail Controls ▲' }}
      </button>

      <div class="sidebar-scroll">
        <ChapterTourPanel
          :chapters="TOUR_CHAPTERS"
          :active-chapter-id="activeChapterId"
          :is-auto-playing="isAutoPlaying"
          @select-chapter="(c) => void selectChapter(c)"
          @toggle-autoplay="toggleAutoPlay"
        />

        <SelectedViewpointCard
          :place="selectedPlace"
          :loading="placeLoading"
          :error="placeError"
          :fallback-title="activeChapter.title"
          :fallback-subtitle="activeChapter.subtitle"
        />

        <ElevationProfileChart
          :samples="elevationSamples"
          :metrics="trailMetrics"
          :loading="elevationLoading"
          :error="elevationError"
          :active-sample-index="activeSampleIndex"
          @hover-sample="handleElevationHover"
          @select-sample="handleElevationSelect"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.explorer-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 600px;
  overflow: hidden;
  background: #020617;
  color: #f8fafc;
}

.map-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 540px;
  min-width: 300px;
  background: radial-gradient(circle at 50% 40%, #0f172a 0%, #020617 100%);
}

.map-3d-element {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 540px;
  min-width: 300px;
}

.top-header {
  position: absolute;
  top: 14px;
  left: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.24);
  backdrop-filter: blur(16px);
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.5);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand-badge {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45);
}

.brand-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #f8fafc;
}

.brand-subtitle {
  margin: 1px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.search-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 560px;
  min-width: 220px;
}

.search-form {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 6px;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(2, 6, 23, 0.72);
  color: #f8fafc;
  font-size: 12.5px;
}

.search-input::placeholder {
  color: #64748b;
}

.search-input:focus {
  outline: none;
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
}

.search-submit {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.7);
  background: #dc2626;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.search-submit:hover {
  background: #ef4444;
}

.autocomplete-host {
  width: 190px;
  flex-shrink: 0;
}

.autocomplete-host :deep(gmp-place-autocomplete) {
  width: 100%;
  --gmpx-color-surface: #0f172a;
  --gmpx-color-on-surface: #f8fafc;
  color-scheme: dark;
}

.telemetry-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  flex-shrink: 0;
}

.tele-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.tele-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.06em;
}

.tele-val {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.tele-sep {
  width: 1px;
  height: 16px;
  background: rgba(148, 163, 184, 0.22);
}

.sidebar-drawer {
  position: absolute;
  top: 84px;
  bottom: 16px;
  left: 16px;
  width: 360px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.sidebar-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
  pointer-events: auto;
}

.mobile-drawer-toggle {
  display: none;
}

.runtime-banner {
  position: absolute;
  bottom: 18px;
  right: 18px;
  z-index: 25;
  max-width: 420px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.45);
  color: #fde68a;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.55);
}

@media (max-width: 1080px) {
  .autocomplete-host {
    display: none;
  }
}

@media (max-width: 900px) {
  .explorer-shell {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .top-header {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    margin: 10px;
    flex-wrap: wrap;
  }

  .search-cluster {
    order: 3;
    max-width: 100%;
    flex-basis: 100%;
  }

  .map-stage {
    height: 540px;
    min-height: 540px;
  }

  .sidebar-drawer {
    position: relative;
    top: auto;
    bottom: auto;
    left: auto;
    width: 100%;
    padding: 0 10px 14px;
    pointer-events: auto;
  }

  .mobile-drawer-toggle {
    display: block;
    width: 100%;
    margin: 10px 0 8px;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(15, 23, 42, 0.9);
    color: #f8fafc;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .sidebar-drawer.collapsed .sidebar-scroll {
    display: none;
  }
}
</style>
