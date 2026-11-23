<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PlaceEndpoint } from '../types/routing';
import { DENVER_BOULDER_CENTER } from '../services/mapsClient';
import { toLatLngLiteral } from '../utils/formatters';

const props = defineProps<{
  inputId: string;
  label: string;
  badgeText: string;
  badgeTone: 'origin' | 'destination';
  placeholder: string;
  selectedPlace: PlaceEndpoint | null;
  mapsReady: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', place: PlaceEndpoint): void;
}>();

const autocompleteRef = ref<google.maps.places.PlaceAutocompleteElement | null>(
  null,
);
const localError = ref<string | null>(null);

watch(
  [autocompleteRef, () => props.mapsReady],
  ([el, ready]) => {
    if (!el || !ready) return;
    el.locationBias = {
      center: DENVER_BOULDER_CENTER,
      radius: 55000,
    };
    el.includedRegionCodes = ['us'];
    el.requestedLanguage = 'en-US';
  },
  { immediate: true },
);

async function handleGmpSelect(event: Event): Promise<void> {
  localError.value = null;
  const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
  const prediction = selectEvent.placePrediction;
  if (!prediction) return;

  try {
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });
    if (!place.location) {
      localError.value = 'Selected place did not include coordinates.';
      return;
    }
    emit('select', {
      id: place.id ?? prediction.placeId ?? String(Date.now()),
      displayName: place.displayName ?? place.formattedAddress ?? 'Selected location',
      formattedAddress: place.formattedAddress ?? '',
      location: toLatLngLiteral(place.location),
    });
  } catch (err) {
    localError.value =
      err instanceof Error ? err.message : 'Unable to fetch selected place details.';
  }
}

function handleGmpError(): void {
  localError.value = 'Autocomplete service reported an API key or network error.';
}
</script>

<template>
  <div class="place-picker">
    <div class="place-picker-header">
      <span class="place-badge" :class="badgeTone">{{ badgeText }}</span>
      <label class="place-label" :for="inputId">{{ label }}</label>
    </div>

    <div class="autocomplete-shell">
      <gmp-place-autocomplete
        :id="inputId"
        ref="autocompleteRef"
        class="gmp-autocomplete-el"
        :placeholder="placeholder"
        @gmp-select="handleGmpSelect"
        @gmp-error="handleGmpError"
      ></gmp-place-autocomplete>
    </div>

    <div v-if="selectedPlace" class="selected-place-chip">
      <div class="selected-place-name">{{ selectedPlace.displayName }}</div>
      <div v-if="selectedPlace.formattedAddress" class="selected-place-addr">
        {{ selectedPlace.formattedAddress }}
      </div>
    </div>
    <p v-if="localError" class="picker-error">{{ localError }}</p>
  </div>
</template>

<style scoped>
.place-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.place-picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.place-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.place-badge.origin {
  background: #0f766e;
}

.place-badge.destination {
  background: #e11d48;
}

.place-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.autocomplete-shell {
  position: relative;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.autocomplete-shell:focus-within {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.gmp-autocomplete-el {
  display: block;
  width: 100%;
  color-scheme: light;
  --gmpx-color-surface: #ffffff;
  background-color: #ffffff;
  color: #0f172a;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
}

.selected-place-chip {
  padding: 6px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.selected-place-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-place-addr {
  font-size: 11.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker-error {
  margin: 0;
  font-size: 11.5px;
  color: #dc2626;
}
</style>
