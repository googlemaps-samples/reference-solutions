<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { MousePointer, Pentagon, Trash2, AlertCircle } from 'lucide-vue-next';
import { getDistrictCapacityColor } from '../data/nycSpatialData';
import type { DrawMode, HoveredSensorInfo } from '../types/gis';

defineProps<{
  drawMode: DrawMode;
  hasCustomZone: boolean;
  webgl2Supported: boolean;
  hasApiKey: boolean;
  mapNotice: string | null;
  hoveredSensor: HoveredSensorInfo | null;
}>();

const emit = defineEmits<{
  (e: 'mount:map', el: HTMLElement | null): void;
  (e: 'update:drawMode', mode: DrawMode): void;
  (e: 'clear:drawZone'): void;
}>();

const mapDivRef = ref<HTMLElement | null>(null);

onMounted(() => {
  emit('mount:map', mapDivRef.value);
});
</script>

<template>
  <main class="map-viewport">
    <div
      ref="mapDivRef"
      class="map-canvas"
      data-testid="map-canvas"
      aria-label="New York City Enterprise GIS Map"
    ></div>

    <!-- Floating Top-Left Terra Draw Study-Zone Toolbar -->
    <div
      class="terradraw-toolbar"
      role="toolbar"
      aria-label="Terra Draw study zone tools"
      data-testid="terradraw-toolbar"
    >
      <button
        type="button"
        class="draw-btn"
        :class="{ active: drawMode === 'polygon' }"
        data-testid="terradraw-polygon-btn"
        :aria-pressed="drawMode === 'polygon'"
        @click="emit('update:drawMode', 'polygon')"
      >
        <Pentagon :size="14" />
        <span>Draw Polygon</span>
      </button>
      <button
        type="button"
        class="draw-btn"
        :class="{ active: drawMode === 'select' }"
        data-testid="terradraw-select-btn"
        :aria-pressed="drawMode === 'select'"
        @click="emit('update:drawMode', 'select')"
      >
        <MousePointer :size="14" />
        <span>Select / Edit</span>
      </button>
      <button
        type="button"
        class="draw-btn danger"
        data-testid="terradraw-clear-btn"
        :disabled="!hasCustomZone && drawMode === 'static'"
        @click="emit('clear:drawZone')"
      >
        <Trash2 :size="14" />
        <span>Clear Zone</span>
      </button>
    </div>

    <!-- Non-blocking API / Headless WebGL2 Notice -->
    <div v-if="mapNotice || !webgl2Supported" class="map-status-stack">
      <div v-if="mapNotice" class="map-notice-banner">
        <AlertCircle :size="15" />
        <span>{{ mapNotice }}</span>
      </div>
      <div v-if="hasApiKey && !webgl2Supported" class="map-notice-banner muted">
        <AlertCircle :size="14" />
        <span>WebGL2 unavailable in this browser context; deck.gl overlay disabled gracefully.</span>
      </div>
    </div>

    <!-- Deck.gl Hover Tooltip -->
    <div
      v-if="hoveredSensor"
      class="sensor-tooltip"
      :style="{
        left: `${hoveredSensor.x + 12}px`,
        top: `${hoveredSensor.y + 12}px`,
      }"
    >
      <div class="tooltip-id">{{ hoveredSensor.sensor.id }}</div>
      <div class="tooltip-row">
        <span>Category</span>
        <strong>{{ hoveredSensor.sensor.category }}</strong>
      </div>
      <div class="tooltip-row">
        <span>Load</span>
        <strong :style="{ color: getDistrictCapacityColor(hoveredSensor.sensor.loadPct) }">
          {{ hoveredSensor.sensor.loadPct }}%
        </strong>
      </div>
      <div class="tooltip-row">
        <span>Output</span>
        <strong>{{ hoveredSensor.sensor.outputKw }} kW</strong>
      </div>
    </div>

    <!-- Bottom-Left Capacity & Layer Legend -->
    <div class="map-legend">
      <div class="legend-title">Infrastructure Capacity Load</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="swatch" style="background: #10b981"></span>
          <span>Nominal (&lt; 66%)</span>
        </div>
        <div class="legend-item">
          <span class="swatch" style="background: #f59e0b"></span>
          <span>Elevated (66–81%)</span>
        </div>
        <div class="legend-item">
          <span class="swatch" style="background: #f43f5e"></span>
          <span>High Load (82%+)</span>
        </div>
      </div>
    </div>
  </main>
</template>
