<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import BranchSidebar from './components/BranchSidebar.vue';
import LocatorMap from './components/LocatorMap.vue';
import { useStoreLocator } from './composables/useStoreLocator';

const locatorMapRef = ref<InstanceType<typeof LocatorMap> | null>(null);
const gmpMapElementRef = computed<google.maps.MapElement | null>(
  () => locatorMapRef.value?.gmpMapEl ?? null
);

const {
  apiKeyMissing,
  isInitializing,
  isSearchingBranches,
  isCalculatingMatrix,
  isComputingRoute,
  errorMessage,
  currentZoom,
  origin,
  searchQuery,
  predictions,
  isAutocompleteOpen,
  travelMode,
  activeTypeFilter,
  activeServices,
  filteredBranches,
  fastestBranch,
  selectedBranchId,
  activeRouteSummary,
  typeCounts,
  initMapAndData,
  handleSearchInput,
  selectPrediction,
  submitSearchFallback,
  applyOriginPreset,
  setTravelMode,
  setTypeFilter,
  toggleService,
  resetFilters,
  selectBranch,
  routeToFastest,
  closeAutocomplete,
} = useStoreLocator(gmpMapElementRef);

onMounted(() => {
  void initMapAndData();
});
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :search-query="searchQuery"
      :origin="origin"
      :predictions="predictions"
      :is-autocomplete-open="isAutocompleteOpen"
      :travel-mode="travelMode"
      :fastest-branch="fastestBranch"
      :is-calculating-matrix="isCalculatingMatrix"
      :is-computing-route="isComputingRoute"
      @search-input="handleSearchInput"
      @select-prediction="selectPrediction"
      @submit-search="submitSearchFallback"
      @apply-preset="applyOriginPreset"
      @change-travel-mode="setTravelMode"
      @route-fastest="routeToFastest"
      @close-autocomplete="closeAutocomplete"
    />

    <main class="split-layout">
      <BranchSidebar
        :origin="origin"
        :active-type-filter="activeTypeFilter"
        :active-services="activeServices"
        :type-counts="typeCounts"
        :branches="filteredBranches"
        :selected-branch-id="selectedBranchId"
        :active-route-summary="activeRouteSummary"
        :is-searching-branches="isSearchingBranches"
        :is-calculating-matrix="isCalculatingMatrix"
        @set-type-filter="setTypeFilter"
        @toggle-service="toggleService"
        @reset-filters="resetFilters"
        @select-branch="selectBranch"
      />

      <LocatorMap
        ref="locatorMapRef"
        :api-key-missing="apiKeyMissing"
        :is-initializing="isInitializing"
        :error-message="errorMessage"
        :current-zoom="currentZoom"
      />
    </main>
  </div>
</template>
