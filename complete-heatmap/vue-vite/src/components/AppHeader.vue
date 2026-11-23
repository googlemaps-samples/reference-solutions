<script setup lang="ts">
import type { WeatherSummary } from '../types/hazard';

defineProps<{
  weather: WeatherSummary | null;
  showHeatmap: boolean;
  showPolygons: boolean;
  searchingShelters: boolean;
  mobileSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-heatmap'): void;
  (e: 'toggle-polygons'): void;
  (e: 'find-shelter'): void;
  (e: 'toggle-mobile-sidebar'): void;
}>();
</script>

<template>
  <header class="app-header">
    <div class="header-brand">
      <div class="brand-icon" aria-hidden="true">M</div>
      <div class="brand-titles">
        <div class="brand-title">Miami Civic Flood &amp; Storm Hazard Portal</div>
        <div class="brand-subtitle">Incident Telemetry • Active Surge Zones • Safe Shelter Router</div>
      </div>
    </div>

    <div class="header-actions">
      <div class="weather-pill" title="Live Miami meteorological conditions via Google Weather API">
        <span
          class="weather-dot"
          :class="{ storm: (weather?.precipProbabilityPct ?? 0) >= 40 }"
        ></span>
        <span v-if="weather && weather.status === 'live'">
          Miami: {{ weather.conditionText }}
          <template v-if="weather.temperatureC !== null">
            • {{ Math.round(weather.temperatureC) }}°C
          </template>
          <template v-if="weather.windSpeedKmh !== null">
            • Wind {{ Math.round(weather.windSpeedKmh) }} km/h
          </template>
        </span>
        <span v-else>Miami Civic Watch • Flood Advisory Active</span>
      </div>

      <button
        id="layer-toggle-heatmap"
        data-testid="layer-toggle-heatmap"
        type="button"
        class="toggle-chip"
        :class="{ active: showHeatmap }"
        @click="emit('toggle-heatmap')"
      >
        <span>{{ showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF' }}</span>
      </button>

      <button
        id="layer-toggle-polygons"
        data-testid="layer-toggle-polygons"
        type="button"
        class="toggle-chip"
        :class="{ active: showPolygons }"
        @click="emit('toggle-polygons')"
      >
        <span>{{ showPolygons ? 'Flood Zones: ON' : 'Flood Zones: OFF' }}</span>
      </button>

      <button
        id="find-shelter-btn"
        data-testid="find-shelter-btn"
        type="button"
        class="primary-cta"
        :disabled="searchingShelters"
        @click="emit('find-shelter')"
      >
        {{ searchingShelters ? 'Searching...' : 'Find Safe Shelter' }}
      </button>

      <button
        type="button"
        class="mobile-drawer-btn"
        @click="emit('toggle-mobile-sidebar')"
      >
        {{ mobileSidebarOpen ? 'Hide Panel' : 'Controls' }}
      </button>
    </div>
  </header>
</template>
