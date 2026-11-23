<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { importLibrary } from '@googlemaps/js-api-loader';
import { DALLAS_CENTER } from '../data/dallasFleet';
import type { LogisticsHub, StatusFilter } from '../types/logistics';

const props = defineProps<{
  mapsReady: boolean;
  activeFilter: StatusFilter;
  counts: {
    all: number;
    enRoute: number;
    delayed: number;
    idle: number;
  };
  trafficEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeFilter', value: StatusFilter): void;
  (e: 'toggle-traffic'): void;
  (e: 'place-selected', hub: LogisticsHub): void;
}>();

const autocompleteContainer = ref<HTMLElement | null>(null);
let mountedAutocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
let selectListener: ((event: Event) => void) | null = null;

async function mountAutocompleteElement() {
  if (!props.mapsReady || !autocompleteContainer.value || mountedAutocomplete) {
    return;
  }

  try {
    const { PlaceAutocompleteElement } = await importLibrary('places');
    const element = new PlaceAutocompleteElement({
      locationBias: { center: DALLAS_CENTER, radius: 30000 },
      includedRegionCodes: ['us'],
    });
    element.placeholder = 'Search Dallas hub or stop...';
    element.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
    element.className = 'gmp-autocomplete-widget';

    selectListener = async (event: Event) => {
      const selectEvent = event as unknown as {
        placePrediction?: google.maps.places.PlacePrediction;
      };
      if (!selectEvent.placePrediction) {
        return;
      }

      const place = selectEvent.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });

      if (!place.location || !place.id) {
        return;
      }

      emit('place-selected', {
        id: `hub-search-${place.id.slice(-8)}`,
        placeId: place.id,
        name: place.displayName ?? 'Selected Hub',
        address: place.formattedAddress ?? 'Dallas, TX',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
        role: 'stop',
      });
    };

    element.addEventListener('gmp-select', selectListener);
    autocompleteContainer.value.replaceChildren(element);
    mountedAutocomplete = element;
  } catch {
    // Maps Places library unavailable
  }
}

watch(
  () => props.mapsReady,
  (ready) => {
    if (ready) {
      void mountAutocompleteElement();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (mountedAutocomplete && selectListener) {
    mountedAutocomplete.removeEventListener('gmp-select', selectListener);
  }
});
</script>

<template>
  <header class="command-bar">
    <div class="brand-cluster">
      <div class="brand-mark" aria-hidden="true">DFW</div>
      <div class="brand-copy">
        <h1>Dallas Fleet Telematics &amp; Dispatch</h1>
        <span class="brand-subtitle">Corridor Ops Console</span>
      </div>
    </div>

    <div class="filter-group" role="group" aria-label="Filter fleet by status">
      <button
        type="button"
        data-testid="status-filter-all"
        class="filter-pill"
        :class="{ active: activeFilter === 'All' }"
        @click="emit('update:activeFilter', 'All')"
      >
        <span>All</span>
        <span class="pill-count">{{ counts.all }}</span>
      </button>
      <button
        type="button"
        data-testid="status-filter-en-route"
        class="filter-pill status-en-route"
        :class="{ active: activeFilter === 'En Route' }"
        @click="emit('update:activeFilter', 'En Route')"
      >
        <span class="dot dot-en-route"></span>
        <span>En Route</span>
        <span class="pill-count">{{ counts.enRoute }}</span>
      </button>
      <button
        type="button"
        data-testid="status-filter-delayed"
        class="filter-pill status-delayed"
        :class="{ active: activeFilter === 'Delayed' }"
        @click="emit('update:activeFilter', 'Delayed')"
      >
        <span class="dot dot-delayed"></span>
        <span>Delayed</span>
        <span class="pill-count">{{ counts.delayed }}</span>
      </button>
      <button
        type="button"
        data-testid="status-filter-idle"
        class="filter-pill status-idle"
        :class="{ active: activeFilter === 'Idle' }"
        @click="emit('update:activeFilter', 'Idle')"
      >
        <span class="dot dot-idle"></span>
        <span>Idle</span>
        <span class="pill-count">{{ counts.idle }}</span>
      </button>
    </div>

    <div class="command-actions">
      <button
        type="button"
        data-testid="traffic-layer-toggle"
        class="action-toggle"
        :class="{ active: trafficEnabled }"
        :aria-pressed="trafficEnabled"
        @click="emit('toggle-traffic')"
      >
        <span class="traffic-indicator" :class="{ on: trafficEnabled }"></span>
        <span>Live Traffic</span>
      </button>

      <div
        ref="autocompleteContainer"
        data-testid="place-autocomplete-container"
        class="autocomplete-slot"
        aria-label="Search Dallas logistics hub"
      ></div>
    </div>
  </header>
</template>
