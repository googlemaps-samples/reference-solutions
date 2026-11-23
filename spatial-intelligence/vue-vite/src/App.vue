<script setup lang="ts">
import { onMounted, ref } from 'vue';
import WorkbenchHeader from './components/WorkbenchHeader.vue';
import AnalyticsSidebar from './components/AnalyticsSidebar.vue';
import MapViewport from './components/MapViewport.vue';
import { useGisWorkbench } from './composables/useGisWorkbench';

const mapContainerRef = ref<HTMLElement | null>(null);
const autocompleteContainerRef = ref<HTMLElement | null>(null);

const {
  hasApiKey,
  mapNotice,
  activeBasemap,
  deckMode,
  showGeoJson,
  drawMode,
  webgl2Supported,
  districts,
  selectedDistrictId,
  customPolygonRing,
  hoveredSensor,
  zoneAnalytics,
  elevationStats,
  civicHubs,
  civicHubsLoading,
  civicHubsError,
  activeHubId,
  initWorkbench,
  setBasemap,
  setDeckMode,
  toggleGeoJson,
  setDrawMode,
  clearDrawZone,
  selectDistrict,
  focusCivicHub,
  sampleElevationForActiveScope,
} = useGisWorkbench(mapContainerRef, autocompleteContainerRef);

function handleMountMap(el: HTMLElement | null): void {
  mapContainerRef.value = el;
}

function handleMountAutocomplete(el: HTMLElement | null): void {
  autocompleteContainerRef.value = el;
}

onMounted(() => {
  void initWorkbench();
});
</script>

<template>
  <div class="workbench-shell">
    <WorkbenchHeader
      :active-basemap="activeBasemap"
      :deck-mode="deckMode"
      :show-geo-json="showGeoJson"
      @update:basemap="setBasemap"
      @update:deck-mode="setDeckMode"
      @toggle:geojson="toggleGeoJson"
      @mount:autocomplete="handleMountAutocomplete"
    />

    <div class="workbench-body">
      <AnalyticsSidebar
        :zone-analytics="zoneAnalytics"
        :elevation-stats="elevationStats"
        :districts="districts"
        :selected-district-id="selectedDistrictId"
        :civic-hubs="civicHubs"
        :civic-hubs-loading="civicHubsLoading"
        :civic-hubs-error="civicHubsError"
        :active-hub-id="activeHubId"
        :has-api-key="hasApiKey"
        @select:district="selectDistrict"
        @sample:elevation="sampleElevationForActiveScope"
        @focus:hub="focusCivicHub"
      />

      <MapViewport
        :draw-mode="drawMode"
        :has-custom-zone="Boolean(customPolygonRing)"
        :webgl2-supported="webgl2Supported"
        :has-api-key="hasApiKey"
        :map-notice="mapNotice"
        :hovered-sensor="hoveredSensor"
        @mount:map="handleMountMap"
        @update:draw-mode="setDrawMode"
        @clear:draw-zone="clearDrawZone"
      />
    </div>
  </div>
</template>
