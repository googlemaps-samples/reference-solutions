<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { LatLngPoint, PropertyType } from '../types/realEstate';
import { PROPERTY_TYPE_LABELS, SF_CENTER } from '../data/properties';

const props = defineProps<{
  placesLib: google.maps.PlacesLibrary | null;
  maxPrice: number | null;
  minBeds: number;
  propertyType: PropertyType | 'all';
  resultsCount: number;
  totalCount: number;
  hasPolygonFilter: boolean;
  searchedPlaceLabel: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:maxPrice', value: number | null): void;
  (e: 'update:minBeds', value: number): void;
  (e: 'update:propertyType', value: PropertyType | 'all'): void;
  (
    e: 'locationSelected',
    payload: {
      name: string;
      location: LatLngPoint;
      viewport?: google.maps.LatLngBounds | null;
    }
  ): void;
  (e: 'resetAll'): void;
}>();

const autocompleteElRef = ref<HTMLElement | null>(null);
const listenerAttached = ref(false);

async function configureAutocompleteElement() {
  if (!props.placesLib || !autocompleteElRef.value || listenerAttached.value) {
    return;
  }

  await customElements.whenDefined('gmp-place-autocomplete');
  const el = autocompleteElRef.value as google.maps.places.PlaceAutocompleteElement;
  el.locationBias = {
    center: SF_CENTER,
    radius: 18000,
  };
  el.includedRegionCodes = ['us'];

  el.addEventListener('gmp-select', async (rawEvent: Event) => {
    const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
    if (!event.placePrediction) return;
    const place = event.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
    });
    if (!place.location) return;
    emit('locationSelected', {
      name: place.displayName ?? place.formattedAddress ?? 'Selected location',
      location: {
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
      viewport: place.viewport ?? null,
    });
  });

  listenerAttached.value = true;
}

watch(
  () => props.placesLib,
  () => {
    void configureAutocompleteElement();
  }
);

onMounted(() => {
  void configureAutocompleteElement();
});

function onMaxPriceChange(event: Event) {
  const val = (event.target as HTMLSelectElement).value;
  emit('update:maxPrice', val === 'all' ? null : Number(val));
}

function onMinBedsChange(event: Event) {
  const val = (event.target as HTMLSelectElement).value;
  emit('update:minBeds', Number(val));
}

function onPropertyTypeChange(event: Event) {
  const val = (event.target as HTMLSelectElement).value as PropertyType | 'all';
  emit('update:propertyType', val);
}
</script>

<template>
  <header class="top-bar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M9 21V13H15V21"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="brand-text">
        <span class="brand-name">BayParcel</span>
        <span class="brand-city">San Francisco</span>
      </div>
    </div>

    <div class="search-controls">
      <div class="autocomplete-shell" title="Search San Francisco neighborhoods or addresses">
        <gmp-place-autocomplete
          ref="autocompleteElRef"
          id="location-search-input"
          data-testid="location-search-input"
          requested-language="en"
          requested-region="us"
          placeholder="Search SF neighborhood or address..."
          class="gmp-location-autocomplete"
        ></gmp-place-autocomplete>
      </div>

      <select
        id="filter-max-price"
        data-testid="filter-max-price"
        class="filter-select"
        aria-label="Maximum Price"
        :value="maxPrice === null ? 'all' : String(maxPrice)"
        @change="onMaxPriceChange"
      >
        <option value="all">Max Price: Any</option>
        <option value="1250000">Up to $1.25M</option>
        <option value="1750000">Up to $1.75M</option>
        <option value="2500000">Up to $2.5M</option>
        <option value="3500000">Up to $3.5M</option>
        <option value="4500000">Up to $4.5M</option>
      </select>

      <select
        id="filter-min-beds"
        data-testid="filter-min-beds"
        class="filter-select"
        aria-label="Minimum Bedrooms"
        :value="String(minBeds)"
        @change="onMinBedsChange"
      >
        <option value="0">Beds: Any</option>
        <option value="1">1+ Beds</option>
        <option value="2">2+ Beds</option>
        <option value="3">3+ Beds</option>
        <option value="4">4+ Beds</option>
      </select>

      <select
        id="filter-property-type"
        data-testid="filter-property-type"
        class="filter-select"
        aria-label="Property Type"
        :value="propertyType"
        @change="onPropertyTypeChange"
      >
        <option value="all">All Types</option>
        <option
          v-for="(label, key) in PROPERTY_TYPE_LABELS"
          :key="key"
          :value="key"
        >
          {{ label }}
        </option>
      </select>
    </div>

    <div class="bar-meta">
      <span
        id="results-count"
        data-testid="results-count"
        class="results-badge"
      >
        {{ resultsCount }} {{ resultsCount === 1 ? 'listing' : 'listings' }}
        <template v-if="hasPolygonFilter"> in area</template>
      </span>
      <button
        v-if="
          maxPrice !== null ||
          minBeds > 0 ||
          propertyType !== 'all' ||
          hasPolygonFilter ||
          searchedPlaceLabel
        "
        type="button"
        class="reset-filters-btn"
        @click="emit('resetAll')"
      >
        Reset
      </button>
    </div>
  </header>
</template>
