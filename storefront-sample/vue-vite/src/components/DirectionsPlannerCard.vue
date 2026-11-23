<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
  ComputedRouteSummary,
  LatLngPoint,
  OriginSelection,
  TravelModeKey,
} from '../types/storefront';
import {
  computeHaversineMeters,
  DEFAULT_ORIGIN,
  GMP_ATTRIBUTION_IDS,
  HOME_VISIT_RADIUS_METERS,
  INITIAL_CLINIC_CENTER,
  TRAVEL_MODE_META,
} from '../utils/formatters';

const props = defineProps<{
  placesLib: google.maps.PlacesLibrary | null;
  origin: OriginSelection;
  clinicLocation: LatLngPoint;
  travelMode: TravelModeKey;
  routeSummary: ComputedRouteSummary | null;
  routeLoading: boolean;
  routeError: string | null;
}>();

const emit = defineEmits<{
  (e: 'update-origin', origin: OriginSelection): void;
  (e: 'update-travel-mode', mode: TravelModeKey): void;
}>();

const autocompleteRef = ref<HTMLElement | null>(null);
let listenerAttached = false;

const distanceFromClinicMeters = computed(() =>
  computeHaversineMeters(props.origin.location, props.clinicLocation)
);

const withinHomeVisitZone = computed(
  () => distanceFromClinicMeters.value <= HOME_VISIT_RADIUS_METERS
);

const handleGmpSelect = async (event: Event) => {
  const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
  if (!selectEvent?.placePrediction) return;

  try {
    const place = selectEvent.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });
    if (!place.location) return;

    emit('update-origin', {
      label: place.displayName || place.formattedAddress || 'Selected Origin',
      address: place.formattedAddress || place.displayName || '',
      location: {
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
      isDefaultSeed: false,
    });
  } catch (err) {
    console.warn('Unable to resolve selected autocomplete place:', err);
  }
};

async function configureAutocompleteElement() {
  const el = autocompleteRef.value as
    | (google.maps.places.PlaceAutocompleteElement & HTMLElement)
    | null;
  if (!el || !props.placesLib) return;

  try {
    await customElements.whenDefined('gmp-place-autocomplete');
    el.locationBias = {
      center: INITIAL_CLINIC_CENTER,
      radius: 25000,
    };
    el.includedRegionCodes = ['us'];
    el.internalUsageAttributionIds = GMP_ATTRIBUTION_IDS;
    el.placeholder = 'Enter starting address in San Francisco...';
    el.value = props.origin.label;

    if (!listenerAttached) {
      el.addEventListener('gmp-select', handleGmpSelect);
      listenerAttached = true;
    }
  } catch (err) {
    console.warn('PlaceAutocompleteElement setup warning:', err);
  }
}

function resetToDefaultOrigin() {
  emit('update-origin', DEFAULT_ORIGIN);
  const el = autocompleteRef.value as
    | (google.maps.places.PlaceAutocompleteElement & HTMLElement)
    | null;
  if (el) {
    el.value = DEFAULT_ORIGIN.label;
  }
}

onMounted(() => {
  void configureAutocompleteElement();
});

watch(
  () => props.placesLib,
  (lib) => {
    if (lib) {
      void configureAutocompleteElement();
    }
  }
);

onBeforeUnmount(() => {
  const el = autocompleteRef.value;
  if (el && listenerAttached) {
    el.removeEventListener('gmp-select', handleGmpSelect);
    listenerAttached = false;
  }
});
</script>

<template>
  <section class="panel-card">
    <div class="panel-header-row">
      <div>
        <span class="eyebrow">Get Directions Planner</span>
        <h2 class="panel-title">Plan Your Visit</h2>
      </div>
      <span
        class="zone-badge"
        :class="withinHomeVisitZone ? 'zone-inside' : 'zone-outside'"
      >
        {{
          withinHomeVisitZone
            ? 'Inside 3.5 km Home-Visit Zone'
            : 'In-Clinic Recommended'
        }}
      </span>
    </div>

    <div class="origin-field-group">
      <div class="field-label-row">
        <label class="field-label" for="origin-autocomplete-element">
          Starting Location (San Francisco)
        </label>
        <button
          v-if="!origin.isDefaultSeed"
          type="button"
          class="text-reset-btn"
          @click="resetToDefaultOrigin"
        >
          Reset to Ferry Building
        </button>
      </div>

      <div
        class="autocomplete-shell"
        data-testid="origin-autocomplete-container"
      >
        <gmp-place-autocomplete
          id="origin-autocomplete-element"
          ref="autocompleteRef"
          class="gmp-autocomplete-widget"
          aria-label="Visitor starting origin address"
        />
      </div>

      <p class="origin-active-caption">
        Active origin: <strong>{{ origin.label }}</strong>
        <span v-if="origin.address && origin.address !== origin.label">
          — {{ origin.address }}
        </span>
      </p>
    </div>

    <div class="travel-modes-row" role="group" aria-label="Travel mode">
      <button
        type="button"
        class="mode-pill"
        :class="{ active: travelMode === 'DRIVING' }"
        data-testid="travel-mode-driving"
        :aria-pressed="travelMode === 'DRIVING'"
        @click="emit('update-travel-mode', 'DRIVING')"
      >
        <span aria-hidden="true">🚗</span>
        <span>Driving</span>
      </button>

      <button
        type="button"
        class="mode-pill"
        :class="{ active: travelMode === 'TRANSIT' }"
        data-testid="travel-mode-transit"
        :aria-pressed="travelMode === 'TRANSIT'"
        @click="emit('update-travel-mode', 'TRANSIT')"
      >
        <span aria-hidden="true">🚊</span>
        <span>Transit</span>
      </button>

      <button
        type="button"
        class="mode-pill"
        :class="{ active: travelMode === 'WALKING' }"
        data-testid="travel-mode-walking"
        :aria-pressed="travelMode === 'WALKING'"
        @click="emit('update-travel-mode', 'WALKING')"
      >
        <span aria-hidden="true">🚶</span>
        <span>Walking</span>
      </button>
    </div>

    <div class="route-summary-card" data-testid="route-summary-card">
      <div v-if="routeLoading" class="route-loading">
        Calculating {{ TRAVEL_MODE_META[travelMode].label.toLowerCase() }} route...
      </div>

      <div v-else-if="routeError" class="route-error-msg">
        {{ routeError }}
      </div>

      <template v-else-if="routeSummary">
        <div class="route-metrics">
          <div class="route-metric">
            <span class="metric-label">Estimated Time</span>
            <span class="metric-value">{{ routeSummary.durationText }}</span>
          </div>
          <div class="route-divider" aria-hidden="true" />
          <div class="route-metric">
            <span class="metric-label">Distance</span>
            <span class="metric-value">{{ routeSummary.distanceText }}</span>
          </div>
          <div class="route-mode-chip">
            {{ TRAVEL_MODE_META[routeSummary.travelMode].label }}
          </div>
        </div>
        <p class="route-endpoints">
          From <strong>{{ routeSummary.originLabel }}</strong> to
          <strong>{{ routeSummary.destinationLabel }}</strong>
        </p>
      </template>

      <div v-else class="route-placeholder">
        Configure your Google Maps API key to compute live driving, transit, and walking directions.
      </div>
    </div>
  </section>
</template>
