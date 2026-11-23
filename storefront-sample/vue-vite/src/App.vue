<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import BookingFormCard from './components/BookingFormCard.vue';
import ClinicHeader from './components/ClinicHeader.vue';
import DirectionsPlannerCard from './components/DirectionsPlannerCard.vue';
import StorefrontMapPane from './components/StorefrontMapPane.vue';
import VenueDetailsCard from './components/VenueDetailsCard.vue';
import {
  getConfiguredApiKey,
  loadGoogleMapsLibraries,
  type LoadedMapsLibraries,
} from './services/mapsLoader';
import {
  computeClinicRoute,
  fetchClinicVenueDetails,
} from './services/placesAndRoutes';
import type {
  ClinicVenueData,
  ComputedRouteSummary,
  LatLngPoint,
  MapViewMode,
  OriginSelection,
  TravelModeKey,
} from './types/storefront';
import { DEFAULT_ORIGIN, INITIAL_CLINIC_CENTER } from './utils/formatters';

const libs = shallowRef<LoadedMapsLibraries | null>(null);
const setupError = ref<string | null>(null);

const venue = ref<ClinicVenueData | null>(null);
const venueLoading = ref(false);
const venueError = ref<string | null>(null);

const origin = ref<OriginSelection>({ ...DEFAULT_ORIGIN });
const travelMode = ref<TravelModeKey>('DRIVING');
const showCoverage = ref(true);
const viewMode = ref<MapViewMode>('map');

const activeRoute = shallowRef<google.maps.routes.Route | null>(null);
const routeSummary = ref<ComputedRouteSummary | null>(null);
const routeLoading = ref(false);
const routeError = ref<string | null>(null);

let routeRequestCounter = 0;

const clinicLocation = computed<LatLngPoint>(
  () => venue.value?.location ?? INITIAL_CLINIC_CENTER
);

function toggleCoverage() {
  showCoverage.value = !showCoverage.value;
}

function toggleStreetView() {
  viewMode.value = viewMode.value === 'map' ? 'split' : 'map';
}

function setViewMode(mode: MapViewMode) {
  viewMode.value = mode;
}

function handleUpdateOrigin(nextOrigin: OriginSelection) {
  origin.value = nextOrigin;
}

function handleUpdateTravelMode(nextMode: TravelModeKey) {
  travelMode.value = nextMode;
}

async function refreshRoute() {
  if (!libs.value) return;
  const requestId = ++routeRequestCounter;
  routeLoading.value = true;
  routeError.value = null;

  try {
    const result = await computeClinicRoute(
      libs.value.routes,
      origin.value.location,
      origin.value.label,
      clinicLocation.value,
      venue.value?.displayName ?? '450 Sutter Dental Studio',
      travelMode.value
    );

    if (requestId !== routeRequestCounter) return;

    if (!result) {
      activeRoute.value = null;
      routeSummary.value = null;
      routeError.value =
        'No route returned for this travel mode and origin. Try another mode or starting point.';
      return;
    }

    activeRoute.value = result.route;
    routeSummary.value = result.summary;
  } catch (err) {
    if (requestId !== routeRequestCounter) return;
    activeRoute.value = null;
    routeSummary.value = null;
    routeError.value =
      err instanceof Error
        ? `Unable to compute route: ${err.message}`
        : 'Unable to compute route for the selected origin.';
  } finally {
    if (requestId === routeRequestCounter) {
      routeLoading.value = false;
    }
  }
}

onMounted(async () => {
  if (!getConfiguredApiKey()) {
    setupError.value =
      'VITE_GOOGLE_MAPS_API_KEY is not configured yet. Add your Google Maps Platform API key or Maps Demo Key to .env.local.';
    return;
  }

  venueLoading.value = true;
  try {
    const loaded = await loadGoogleMapsLibraries();
    libs.value = loaded;

    try {
      const details = await fetchClinicVenueDetails(loaded.places);
      if (details) {
        venue.value = details;
      } else {
        venueError.value =
          'No matching Google Places record was returned for 450 Sutter Dental San Francisco.';
      }
    } catch (placeErr) {
      venueError.value =
        placeErr instanceof Error
          ? placeErr.message
          : 'Unable to fetch Google Places clinic details.';
    } finally {
      venueLoading.value = false;
    }

    await refreshRoute();
  } catch (err) {
    venueLoading.value = false;
    setupError.value =
      err instanceof Error
        ? err.message
        : 'Failed to initialize Google Maps Platform libraries.';
  }
});

watch(
  [origin, travelMode, clinicLocation],
  () => {
    if (libs.value) {
      void refreshRoute();
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="app-shell">
    <ClinicHeader
      :venue="venue"
      :show-coverage="showCoverage"
      :view-mode="viewMode"
      @toggle-coverage="toggleCoverage"
      @toggle-street-view="toggleStreetView"
      @set-view-mode="setViewMode"
    />

    <div class="workspace-grid">
      <aside class="sidebar-column" aria-label="Clinic details, directions, and booking">
        <VenueDetailsCard
          :venue="venue"
          :loading="venueLoading"
          :error-message="venueError ?? setupError"
        />

        <DirectionsPlannerCard
          :places-lib="libs?.places ?? null"
          :origin="origin"
          :clinic-location="clinicLocation"
          :travel-mode="travelMode"
          :route-summary="routeSummary"
          :route-loading="routeLoading"
          :route-error="routeError"
          @update-origin="handleUpdateOrigin"
          @update-travel-mode="handleUpdateTravelMode"
        />

        <BookingFormCard :venue="venue" :route-summary="routeSummary" />
      </aside>

      <StorefrontMapPane
        :libs="libs"
        :clinic-location="clinicLocation"
        :venue="venue"
        :origin="origin"
        :show-coverage="showCoverage"
        :view-mode="viewMode"
        :active-route="activeRoute"
        :travel-mode="travelMode"
        :setup-error="setupError"
        @set-view-mode="setViewMode"
      />
    </div>
  </div>
</template>
