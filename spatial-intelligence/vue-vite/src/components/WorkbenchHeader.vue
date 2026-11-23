<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Layers, Map as MapIcon, Radar, Hexagon } from 'lucide-vue-next';
import type { BasemapId, DeckMode } from '../types/gis';

defineProps<{
  activeBasemap: BasemapId;
  deckMode: DeckMode;
  showGeoJson: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:basemap', value: BasemapId): void;
  (e: 'update:deckMode', value: DeckMode): void;
  (e: 'toggle:geojson'): void;
  (e: 'mount:autocomplete', el: HTMLElement | null): void;
}>();

const autocompleteMountRef = ref<HTMLElement | null>(null);

const basemaps: Array<{ id: BasemapId; label: string }> = [
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'terrain', label: 'Terrain' },
];

onMounted(() => {
  emit('mount:autocomplete', autocompleteMountRef.value);
});
</script>

<template>
  <header class="workbench-header" data-testid="workbench-header">
    <div class="header-brand">
      <div class="brand-icon" aria-hidden="true">
        <MapIcon :size="17" />
      </div>
      <div class="brand-text">
        <span class="brand-title">NYC Spatial Intelligence</span>
        <span class="brand-subtitle">Enterprise GIS Workbench</span>
      </div>
    </div>

    <div class="header-search" ref="autocompleteMountRef">
      <span class="search-placeholder">Search NYC places &amp; hubs</span>
    </div>

    <div class="header-controls">
      <div
        class="segmented-group"
        role="group"
        aria-label="Basemap switcher"
        data-testid="basemap-switcher"
      >
        <button
          v-for="bm in basemaps"
          :key="bm.id"
          type="button"
          class="seg-btn"
          :class="{ active: activeBasemap === bm.id }"
          :data-testid="`basemap-btn-${bm.id}`"
          :aria-pressed="activeBasemap === bm.id"
          @click="emit('update:basemap', bm.id)"
        >
          {{ bm.label }}
        </button>
      </div>

      <div
        class="segmented-group"
        role="group"
        aria-label="Deck.gl and GeoJSON layer controls"
        data-testid="deckgl-layer-controls"
      >
        <button
          type="button"
          class="seg-btn icon-btn"
          :class="{ active: deckMode === 'scatterplot' }"
          data-testid="deckgl-mode-scatterplot"
          :aria-pressed="deckMode === 'scatterplot'"
          @click="emit('update:deckMode', 'scatterplot')"
        >
          <Radar :size="14" />
          <span>Scatterplot</span>
        </button>
        <button
          type="button"
          class="seg-btn icon-btn"
          :class="{ active: deckMode === 'hexagon' }"
          data-testid="deckgl-mode-hexagon"
          :aria-pressed="deckMode === 'hexagon'"
          @click="emit('update:deckMode', 'hexagon')"
        >
          <Hexagon :size="14" />
          <span>Hexagon</span>
        </button>
        <button
          type="button"
          class="seg-btn icon-btn"
          :class="{ active: showGeoJson }"
          data-testid="toggle-geojson-btn"
          :aria-pressed="showGeoJson"
          @click="emit('toggle:geojson')"
        >
          <Layers :size="14" />
          <span>GeoJSON</span>
        </button>
      </div>
    </div>
  </header>
</template>
