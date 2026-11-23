<script setup lang="ts">
import { computed, ref } from 'vue';
import ComparisonPanel from './components/ComparisonPanel.vue';
import DetailsDrawer from './components/DetailsDrawer.vue';
import DirectorySidebar from './components/DirectorySidebar.vue';
import HeaderBar from './components/HeaderBar.vue';
import MapCanvas from './components/MapCanvas.vue';
import {
  CENTRAL_LONDON_CENTER,
  LONDON_PRESETS,
  SEARCH_RADIUS_METERS,
} from './constants/london';
import {
  fetchNearbyPlaces,
  fetchPlaceDetails,
  fetchPlaceDetailsFromInstance,
  forwardGeocodeAddress,
  reverseGeocodeLocation,
  searchPlacesByText,
} from './services/googleMaps';
import type {
  CommunitySpot,
  DiscoveredPlace,
  LatLngLiteral,
  PlaceCategory,
  ReverseGeocodeResult,
} from './types/neighborhood';

const placesReady = ref(false);
const activeCenter = ref<LatLngLiteral>({ ...CENTRAL_LONDON_CENTER });
const activePresetId = ref<string>(LONDON_PRESETS[0].id);
const activeAreaLabel = ref<string>(LONDON_PRESETS[0].label);
const selectedCategory = ref<PlaceCategory>('all');
const showRadiusCircle = ref(true);

const places = ref<DiscoveredPlace[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const selectedPlace = ref<DiscoveredPlace | null>(null);
const detailsLoading = ref(false);

const comparedPlaces = ref<DiscoveredPlace[]>([]);
const isComparisonOpen = ref(false);

const reverseGeocodeResult = ref<ReverseGeocodeResult | null>(null);
const reverseGeocodeLoading = ref(false);
const communitySpots = ref<CommunitySpot[]>([]);

const compareIds = computed(() => comparedPlaces.value.map((p) => p.id));

async function loadNearbyPlaces() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const results = await fetchNearbyPlaces(
      activeCenter.value,
      selectedCategory.value,
      SEARCH_RADIUS_METERS
    );
    places.value = results;
  } catch (err) {
    errorMessage.value =
      err instanceof Error
        ? err.message
        : 'Failed to load nearby places from Places API (New).';
  } finally {
    isLoading.value = false;
  }
}

function handleMapsReady() {
  placesReady.value = true;
  void loadNearbyPlaces();
}

function handleMapsError(message: string) {
  errorMessage.value = message;
}

function handleChangeCategory(category: PlaceCategory) {
  selectedCategory.value = category;
  void loadNearbyPlaces();
}

function handleSelectPreset(presetId: string) {
  const preset = LONDON_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  activePresetId.value = preset.id;
  activeAreaLabel.value = preset.label;
  activeCenter.value = { ...preset.center };
  reverseGeocodeResult.value = null;
  selectedPlace.value = null;
  void loadNearbyPlaces();
}

async function handleAutocompletePlaceSelected(place: google.maps.places.Place) {
  isLoading.value = true;
  errorMessage.value = null;
  reverseGeocodeResult.value = null;
  try {
    const detailed = await fetchPlaceDetailsFromInstance(place);
    if (!detailed) {
      errorMessage.value = 'Selected place did not return geographic coordinates.';
      return;
    }
    activePresetId.value = 'custom';
    activeAreaLabel.value = detailed.displayName;
    activeCenter.value = { ...detailed.location };
    selectedPlace.value = detailed;
    await loadNearbyPlaces();
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Unable to load selected place details.';
  } finally {
    isLoading.value = false;
  }
}

async function handleGeocodeAddress(address: string) {
  const trimmed = address.trim();
  if (!trimmed) {
    errorMessage.value = 'Enter an address, postcode, or neighborhood to geocode.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;
  selectedPlace.value = null;

  try {
    const geocoded = await forwardGeocodeAddress(trimmed);
    if (geocoded) {
      activePresetId.value = 'custom';
      activeAreaLabel.value = geocoded.neighborhoodName;
      activeCenter.value = { lat: geocoded.lat, lng: geocoded.lng };
      reverseGeocodeResult.value = geocoded;
      await loadNearbyPlaces();
      return;
    }

    const textMatches = await searchPlacesByText(
      trimmed,
      activeCenter.value,
      SEARCH_RADIUS_METERS
    );
    if (textMatches.length > 0) {
      places.value = textMatches;
      activePresetId.value = 'custom';
      activeAreaLabel.value = trimmed;
      activeCenter.value = { ...textMatches[0].location };
    } else {
      errorMessage.value = `No geocoding or place matches found for "${trimmed}".`;
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Geocoding request failed.';
  } finally {
    isLoading.value = false;
  }
}

async function handleSelectPlace(place: DiscoveredPlace) {
  reverseGeocodeResult.value = null;
  selectedPlace.value = place;

  if (place.detailsLoaded) return;

  detailsLoading.value = true;
  try {
    const enriched = await fetchPlaceDetails(place.id);
    if (!enriched) return;

    const merged: DiscoveredPlace = {
      ...enriched,
      category: place.category,
    };

    places.value = places.value.map((p) => (p.id === merged.id ? merged : p));
    comparedPlaces.value = comparedPlaces.value.map((p) =>
      p.id === merged.id ? merged : p
    );
    if (selectedPlace.value?.id === merged.id) {
      selectedPlace.value = merged;
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Unable to fetch full place details.';
  } finally {
    detailsLoading.value = false;
  }
}

async function handleToggleCompare(place: DiscoveredPlace) {
  const existingIdx = comparedPlaces.value.findIndex((p) => p.id === place.id);
  if (existingIdx >= 0) {
    comparedPlaces.value = comparedPlaces.value.filter((p) => p.id !== place.id);
    return;
  }

  if (comparedPlaces.value.length >= 3) return;

  comparedPlaces.value = [...comparedPlaces.value, place];
  isComparisonOpen.value = true;

  if (!place.detailsLoaded) {
    try {
      const enriched = await fetchPlaceDetails(place.id);
      if (enriched) {
        const merged = { ...enriched, category: place.category };
        comparedPlaces.value = comparedPlaces.value.map((p) =>
          p.id === merged.id ? merged : p
        );
        places.value = places.value.map((p) => (p.id === merged.id ? merged : p));
      }
    } catch {
      // Keep basic search fields already displayed in comparison card
    }
  }
}

function handleRemoveCompared(placeId: string) {
  comparedPlaces.value = comparedPlaces.value.filter((p) => p.id !== placeId);
}

async function handleMapClicked(coords: LatLngLiteral) {
  selectedPlace.value = null;
  reverseGeocodeLoading.value = true;
  errorMessage.value = null;

  try {
    reverseGeocodeResult.value = await reverseGeocodeLocation(coords);
  } catch (err) {
    reverseGeocodeResult.value = {
      lat: coords.lat,
      lng: coords.lng,
      formattedAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      placeId: null,
      neighborhoodName: 'Pinned Coordinates',
      plusCode: null,
    };
    errorMessage.value =
      err instanceof Error
        ? err.message
        : 'Reverse geocoding failed for clicked location.';
  } finally {
    reverseGeocodeLoading.value = false;
  }
}

function handleOpenPinSpot() {
  void handleMapClicked(activeCenter.value);
}

function handleSaveCommunitySpot(
  spotInput: Omit<CommunitySpot, 'id' | 'createdAt'>
) {
  const newSpot: CommunitySpot = {
    ...spotInput,
    id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  communitySpots.value = [newSpot, ...communitySpots.value];
  reverseGeocodeResult.value = null;
}

function handleFocusCommunitySpot(spot: CommunitySpot) {
  activeCenter.value = { lat: spot.lat, lng: spot.lng };
}

function handleRemoveCommunitySpot(spotId: string) {
  communitySpots.value = communitySpots.value.filter((s) => s.id !== spotId);
}
</script>

<template>
  <div class="app-shell">
    <HeaderBar
      :places-ready="placesReady"
      :active-center="activeCenter"
      :active-preset-id="activePresetId"
      :show-radius-circle="showRadiusCircle"
      :compare-count="comparedPlaces.length"
      :is-comparison-open="isComparisonOpen"
      :is-loading="isLoading"
      @place-selected="handleAutocompletePlaceSelected"
      @geocode-address="handleGeocodeAddress"
      @select-preset="handleSelectPreset"
      @toggle-radius-circle="showRadiusCircle = !showRadiusCircle"
      @toggle-comparison="isComparisonOpen = !isComparisonOpen"
      @autocomplete-error="(msg) => (errorMessage = msg)"
    />

    <main class="workspace">
      <DirectorySidebar
        :places="places"
        :selected-category="selectedCategory"
        :selected-place-id="selectedPlace?.id ?? null"
        :compare-ids="compareIds"
        :active-area-label="activeAreaLabel"
        :is-loading="isLoading"
        :error-message="errorMessage"
        :community-spots="communitySpots"
        @change-category="handleChangeCategory"
        @select-place="handleSelectPlace"
        @toggle-compare="handleToggleCompare"
        @open-pin-spot="handleOpenPinSpot"
        @focus-community-spot="handleFocusCommunitySpot"
        @remove-community-spot="handleRemoveCommunitySpot"
      />

      <MapCanvas
        :active-center="activeCenter"
        :places="places"
        :selected-place-id="selectedPlace?.id ?? null"
        :show-radius-circle="showRadiusCircle"
        :community-spots="communitySpots"
        :reverse-geocode-result="reverseGeocodeResult"
        @maps-ready="handleMapsReady"
        @maps-error="handleMapsError"
        @select-place="handleSelectPlace"
        @map-clicked="handleMapClicked"
        @select-community-spot="handleFocusCommunitySpot"
      />
    </main>

    <DetailsDrawer
      :selected-place="selectedPlace"
      :details-loading="detailsLoading"
      :is-compared="selectedPlace ? compareIds.includes(selectedPlace.id) : false"
      :compare-disabled="compareIds.length >= 3"
      :reverse-geocode-result="reverseGeocodeResult"
      :reverse-geocode-loading="reverseGeocodeLoading"
      @close-place="selectedPlace = null"
      @close-reverse-geocode="reverseGeocodeResult = null"
      @toggle-compare="handleToggleCompare"
      @save-community-spot="handleSaveCommunitySpot"
    />

    <ComparisonPanel
      :places="comparedPlaces"
      :is-open="isComparisonOpen"
      @close="isComparisonOpen = false"
      @remove-place="handleRemoveCompared"
      @inspect-place="handleSelectPlace"
    />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.workspace {
  flex: 1;
  display: flex;
  min-height: calc(100vh - 64px);
  position: relative;
}

@media (max-width: 900px) {
  .workspace {
    flex-direction: column;
  }
}
</style>
