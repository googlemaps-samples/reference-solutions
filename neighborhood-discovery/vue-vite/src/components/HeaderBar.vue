<script setup lang="ts">
import { ref, watch } from 'vue';
import { LONDON_PRESETS } from '../constants/london';
import type { LatLngLiteral } from '../types/neighborhood';

const props = defineProps<{
  placesReady: boolean;
  activeCenter: LatLngLiteral;
  activePresetId: string;
  showRadiusCircle: boolean;
  compareCount: number;
  isComparisonOpen: boolean;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'place-selected', place: google.maps.places.Place): void;
  (e: 'geocode-address', address: string): void;
  (e: 'select-preset', presetId: string): void;
  (e: 'toggle-radius-circle'): void;
  (e: 'toggle-comparison'): void;
  (e: 'autocomplete-error', message: string): void;
}>();

const autocompleteRef = ref<google.maps.places.PlaceAutocompleteElement | null>(null);
const fallbackQuery = ref('');

watch(
  [autocompleteRef, () => props.placesReady, () => props.activeCenter],
  ([el, ready, center]) => {
    if (!el || !ready) return;
    el.includedRegionCodes = ['gb'];
    el.locationBias = {
      center,
      radius: 10000,
    };
  },
  { immediate: true }
);

function handleGmpSelect(event: Event) {
  const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
  if (selectEvent.placePrediction) {
    const place = selectEvent.placePrediction.toPlace();
    emit('place-selected', place);
  }
}

function handleGmpError() {
  emit(
    'autocomplete-error',
    'Places Autocomplete could not reach Google Maps Platform. Verify your API key enables Places API (New).'
  );
}

function handleGeocodeClick() {
  const el = autocompleteRef.value;
  const rawValue = (el?.value ?? fallbackQuery.value).trim();
  emit('geocode-address', rawValue);
}

function handlePresetChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('select-preset', target.value);
}
</script>

<template>
  <header class="header-bar">
    <div class="brand-group">
      <div class="brand-icon" aria-hidden="true">LDN</div>
      <div class="brand-text">
        <h1 class="brand-title">Hyperlocal Neighborhood Directory</h1>
        <p class="brand-subtitle">Central London · Places API (New) &amp; Spot Mapper</p>
      </div>
    </div>

    <div class="search-controls">
      <div class="autocomplete-shell" @keydown.enter.prevent="handleGeocodeClick">
        <gmp-place-autocomplete
          v-if="placesReady"
          id="neighborhood-autocomplete-input"
          ref="autocompleteRef"
          data-testid="neighborhood-autocomplete-input"
          class="gmp-autocomplete"
          placeholder="Search London address or neighborhood..."
          requested-language="en"
          requested-region="gb"
          @gmp-select="handleGmpSelect"
          @gmp-error="handleGmpError"
        />
        <input
          v-else
          id="neighborhood-autocomplete-input"
          v-model="fallbackQuery"
          data-testid="neighborhood-autocomplete-input"
          type="text"
          class="fallback-search-input"
          placeholder="Search London address or neighborhood..."
          aria-label="Search London address or neighborhood"
        />
      </div>

      <button
        id="address-geocode-button"
        data-testid="address-geocode-button"
        type="button"
        class="btn btn-primary"
        :disabled="isLoading"
        @click="handleGeocodeClick"
      >
        Geocode
      </button>

      <select
        id="neighborhood-preset-select"
        data-testid="neighborhood-preset-select"
        class="preset-select"
        aria-label="Select Central London neighborhood preset"
        :value="activePresetId"
        @change="handlePresetChange"
      >
        <option
          v-for="preset in LONDON_PRESETS"
          :key="preset.id"
          :value="preset.id"
        >
          {{ preset.label }}
        </option>
        <option v-if="activePresetId === 'custom'" value="custom">
          Custom Location
        </option>
      </select>
    </div>

    <div class="header-actions">
      <button
        id="radius-toggle-circle"
        data-testid="radius-toggle-circle"
        type="button"
        class="btn btn-chip"
        :class="{ active: showRadiusCircle }"
        :aria-pressed="showRadiusCircle"
        @click="emit('toggle-radius-circle')"
      >
        <span class="radius-dot" aria-hidden="true"></span>
        5km Ring: {{ showRadiusCircle ? 'ON' : 'OFF' }}
      </button>

      <button
        id="toggle-comparison-button"
        data-testid="toggle-comparison-button"
        type="button"
        class="btn btn-compare"
        :class="{ active: isComparisonOpen }"
        :aria-expanded="isComparisonOpen"
        @click="emit('toggle-comparison')"
      >
        Compare ({{ compareCount }}/3)
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-bar {
  height: 64px;
  min-height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 30;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1d4ed8, #0f766e);
  color: #ffffff;
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.brand-subtitle {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.2;
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 680px;
  min-width: 0;
}

.autocomplete-shell {
  flex: 1;
  min-width: 200px;
}

.gmp-autocomplete {
  display: block;
  width: 100%;
  background-color: #f8fafc;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color-scheme: light;
  font-family: inherit;
  font-size: 13px;
}

.fallback-search-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
}

.preset-select {
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: #f8fafc;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #1e40af;
}

.btn-chip.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.radius-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #94a3b8;
}

.btn-chip.active .radius-dot {
  background: #2563eb;
}

.btn-compare.active {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
}

@media (max-width: 1024px) {
  .brand-subtitle {
    display: none;
  }

  .header-bar {
    height: auto;
    min-height: 64px;
    padding: 8px 12px;
    flex-wrap: wrap;
  }

  .search-controls {
    order: 3;
    flex-basis: 100%;
    max-width: 100%;
  }
}
</style>
