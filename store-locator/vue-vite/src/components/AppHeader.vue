<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type {
  AutocompletePredictionItem,
  Branch,
  OriginLocation,
  OriginPreset,
  TravelModeOption,
} from '../types/locator';
import { NYC_ORIGIN_PRESETS } from '../utils/branchClassifier';

const props = defineProps<{
  searchQuery: string;
  origin: OriginLocation;
  predictions: AutocompletePredictionItem[];
  isAutocompleteOpen: boolean;
  travelMode: TravelModeOption;
  fastestBranch: Branch | null;
  isCalculatingMatrix: boolean;
  isComputingRoute: boolean;
}>();

const emit = defineEmits<{
  (e: 'search-input', value: string): void;
  (e: 'select-prediction', item: AutocompletePredictionItem): void;
  (e: 'submit-search'): void;
  (e: 'apply-preset', preset: OriginPreset): void;
  (e: 'change-travel-mode', mode: TravelModeOption): void;
  (e: 'route-fastest'): void;
  (e: 'close-autocomplete'): void;
}>();

const searchContainerRef = ref<HTMLElement | null>(null);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('search-input', target.value);
}

function onModeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('change-travel-mode', target.value as TravelModeOption);
}

function onPresetChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const preset = NYC_ORIGIN_PRESETS.find((p) => p.id === target.value);
  if (preset) {
    emit('apply-preset', preset);
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!searchContainerRef.value) return;
  if (!searchContainerRef.value.contains(event.target as Node)) {
    emit('close-autocomplete');
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <header class="app-header" data-testid="app-header">
    <div class="brand-block">
      <div class="brand-mark" aria-hidden="true">MG</div>
      <div class="brand-copy">
        <span class="brand-title">MetroGrid NYC</span>
        <span class="brand-subtitle">Store, ATM &amp; Inventory Locator</span>
      </div>
    </div>

    <div class="header-controls">
      <div ref="searchContainerRef" class="origin-search-wrap">
        <form class="origin-search-form" @submit.prevent="emit('submit-search')">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            class="origin-search-input"
            data-testid="origin-search-input"
            :value="props.searchQuery"
            placeholder="Search NYC starting address, landmark, or ZIP..."
            aria-label="Search starting location in New York City"
            autocomplete="off"
            @input="onInput"
            @focus="emit('search-input', props.searchQuery)"
          />
          <button type="submit" class="origin-go-btn" title="Set starting location">
            Set
          </button>
        </form>

        <div
          v-if="props.isAutocompleteOpen && props.predictions.length > 0"
          class="autocomplete-dropdown"
          data-testid="autocomplete-dropdown"
          role="listbox"
        >
          <button
            v-for="item in props.predictions"
            :key="item.placeId"
            type="button"
            class="autocomplete-item"
            role="option"
            @click="emit('select-prediction', item)"
          >
            <span class="autocomplete-main">{{ item.mainText }}</span>
            <span v-if="item.secondaryText" class="autocomplete-secondary">
              {{ item.secondaryText }}
            </span>
          </button>
        </div>
      </div>

      <select
        class="preset-select"
        aria-label="Quick NYC origin preset"
        :value="
          NYC_ORIGIN_PRESETS.find((p) => p.label === props.origin.label)?.id ?? ''
        "
        @change="onPresetChange"
      >
        <option value="" disabled>NYC Hubs…</option>
        <option v-for="preset in NYC_ORIGIN_PRESETS" :key="preset.id" :value="preset.id">
          {{ preset.label }}
        </option>
      </select>

      <select
        class="travel-mode-select"
        data-testid="travel-mode-select"
        aria-label="Travel mode"
        :value="props.travelMode"
        @change="onModeChange"
      >
        <option value="DRIVE">Drive</option>
        <option value="WALK">Walk</option>
        <option value="TRANSIT">Transit</option>
      </select>

      <button
        type="button"
        class="route-fastest-btn"
        data-testid="route-fastest-button"
        :disabled="!props.fastestBranch || props.isComputingRoute"
        @click="emit('route-fastest')"
      >
        <span>
          {{ props.isComputingRoute ? 'Routing…' : 'Route to Fastest' }}
        </span>
        <span v-if="props.fastestBranch?.etaText && !props.isCalculatingMatrix" class="fastest-pill">
          {{ props.fastestBranch.etaText }}
        </span>
      </button>
    </div>
  </header>
</template>
