<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import TopFilterBar from './components/TopFilterBar.vue';
import ListingDetailPanel from './components/ListingDetailPanel.vue';
import PropertyCard from './components/PropertyCard.vue';
import PropertyMap from './components/PropertyMap.vue';
import { SF_CENTER, SF_PROPERTIES } from './data/properties';
import { loadGoogleMapsLibraries, type LoadedMapsLibraries } from './services/mapsLoader';
import type {
  CommuteSummary,
  LatLngPoint,
  NearbyAmenity,
  PropertyListing,
  PropertyType,
} from './types/realEstate';

const libs = ref<LoadedMapsLibraries | null>(null);
const mapsError = ref<string | null>(null);

const maxPrice = ref<number | null>(null);
const minBeds = ref<number>(0);
const propertyType = ref<PropertyType | 'all'>('all');
const drawnPolygon = ref<LatLngPoint[] | null>(null);
const searchedPlaceLabel = ref<string | null>(null);

const selectedPropertyId = ref<string | null>(SF_PROPERTIES[0]?.id ?? null);
const hoveredPropertyId = ref<string | null>(null);
const nearbyAmenities = ref<NearbyAmenity[]>([]);
const focusedAmenity = ref<NearbyAmenity | null>(null);
const commuteSummary = ref<CommuteSummary | null>(null);

const leftPaneRef = ref<HTMLElement | null>(null);
const propertyMapRef = ref<InstanceType<typeof PropertyMap> | null>(null);

const filteredProperties = computed<PropertyListing[]>(() => {
  const polygonCoords = drawnPolygon.value;
  let searchPoly: google.maps.Polygon | null = null;

  if (polygonCoords && polygonCoords.length >= 3 && typeof google !== 'undefined' && google.maps?.Polygon) {
    searchPoly = new google.maps.Polygon({ paths: polygonCoords });
  }

  return SF_PROPERTIES.filter((prop) => {
    if (maxPrice.value !== null && prop.price > maxPrice.value) {
      return false;
    }
    if (minBeds.value > 0 && prop.beds < minBeds.value) {
      return false;
    }
    if (propertyType.value !== 'all' && prop.propertyType !== propertyType.value) {
      return false;
    }
    if (searchPoly && libs.value?.geometryLib) {
      const point = new google.maps.LatLng(prop.position.lat, prop.position.lng);
      if (!libs.value.geometryLib.poly.containsLocation(point, searchPoly)) {
        return false;
      }
    }
    return true;
  });
});

const selectedProperty = computed<PropertyListing | null>(() => {
  if (!selectedPropertyId.value) return null;
  return (
    filteredProperties.value.find((p) => p.id === selectedPropertyId.value) ??
    SF_PROPERTIES.find((p) => p.id === selectedPropertyId.value) ??
    null
  );
});

function handleSelectProperty(id: string) {
  selectedPropertyId.value = id;
  focusedAmenity.value = null;
  leftPaneRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHoverProperty(id: string | null) {
  hoveredPropertyId.value = id;
}

function handleLocationSelected(payload: {
  name: string;
  location: LatLngPoint;
  viewport?: google.maps.LatLngBounds | null;
}) {
  searchedPlaceLabel.value = payload.name;
  propertyMapRef.value?.panToLocation(payload.location, payload.viewport ?? null, true);
}

function handlePolygonChanged(coords: LatLngPoint[] | null) {
  drawnPolygon.value = coords;
  if (coords && coords.length >= 3) {
    const firstMatch = filteredProperties.value[0];
    if (
      firstMatch &&
      (!selectedPropertyId.value ||
        !filteredProperties.value.some((p) => p.id === selectedPropertyId.value))
    ) {
      selectedPropertyId.value = firstMatch.id;
    }
  }
}

function handleResetAll() {
  maxPrice.value = null;
  minBeds.value = 0;
  propertyType.value = 'all';
  searchedPlaceLabel.value = null;
  commuteSummary.value = null;
  focusedAmenity.value = null;
  propertyMapRef.value?.clearDrawnArea();
  propertyMapRef.value?.panToLocation(SF_CENTER, null, false);
  if (!selectedPropertyId.value && SF_PROPERTIES[0]) {
    selectedPropertyId.value = SF_PROPERTIES[0].id;
  }
}

onMounted(async () => {
  try {
    libs.value = await loadGoogleMapsLibraries();
    mapsError.value = null;
  } catch (err) {
    mapsError.value =
      err instanceof Error ? err.message : 'Unable to initialize Google Maps Platform.';
  }
});
</script>

<template>
  <div class="app-shell">
    <TopFilterBar
      :places-lib="libs?.placesLib ?? null"
      :max-price="maxPrice"
      :min-beds="minBeds"
      :property-type="propertyType"
      :results-count="filteredProperties.length"
      :total-count="SF_PROPERTIES.length"
      :has-polygon-filter="Boolean(drawnPolygon && drawnPolygon.length >= 3)"
      :searched-place-label="searchedPlaceLabel"
      @update:max-price="maxPrice = $event"
      @update:min-beds="minBeds = $event"
      @update:property-type="propertyType = $event"
      @location-selected="handleLocationSelected"
      @reset-all="handleResetAll"
    />

    <main class="split-workspace">
      <section class="right-map-section">
        <PropertyMap
          ref="propertyMapRef"
          :libs="libs"
          :maps-error="mapsError"
          :all-properties="SF_PROPERTIES"
          :filtered-properties="filteredProperties"
          :selected-property="selectedProperty"
          :hovered-property-id="hoveredPropertyId"
          :has-polygon-filter="Boolean(drawnPolygon && drawnPolygon.length >= 3)"
          :nearby-amenities="nearbyAmenities"
          :focused-amenity="focusedAmenity"
          :commute-summary="commuteSummary"
          @select-property="handleSelectProperty"
          @hover-property="handleHoverProperty"
          @polygon-changed="handlePolygonChanged"
        />
      </section>

      <aside ref="leftPaneRef" class="left-sidebar">
        <ListingDetailPanel
          v-if="selectedProperty"
          :property="selectedProperty"
          :places-lib="libs?.placesLib ?? null"
          :routes-lib="libs?.routesLib ?? null"
          :street-view-lib="libs?.streetViewLib ?? null"
          :geometry-lib="libs?.geometryLib ?? null"
          :maps-error="mapsError"
          @close="selectedPropertyId = null"
          @amenities-loaded="nearbyAmenities = $event"
          @focus-amenity="focusedAmenity = $event"
          @commute-computed="commuteSummary = $event"
        />

        <section class="listings-section">
          <div class="listings-section-header">
            <h2 class="listings-heading">
              San Francisco Homes
              <span class="listings-subcount">({{ filteredProperties.length }})</span>
            </h2>
            <span v-if="searchedPlaceLabel" class="searched-pill">
              Near {{ searchedPlaceLabel }}
            </span>
          </div>

          <div
            v-if="filteredProperties.length === 0"
            class="empty-listings-state"
          >
            <p>No properties match your current filters or drawn search area.</p>
            <button type="button" class="reset-inline-btn" @click="handleResetAll">
              Reset Filters & Search Area
            </button>
          </div>

          <div
            id="property-list"
            data-testid="property-list"
            class="property-list-grid"
          >
            <PropertyCard
              v-for="property in filteredProperties"
              :key="property.id"
              :property="property"
              :selected="selectedProperty?.id === property.id"
              :hovered="hoveredPropertyId === property.id"
              @select="handleSelectProperty"
              @hover="handleHoverProperty"
            />
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>
