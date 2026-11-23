<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
  AmenityCategory,
  CommuteSummary,
  NearbyAmenity,
  PropertyListing,
  WorkplaceSuggestion,
} from '../types/realEstate';
import {
  PROPERTY_TYPE_LABELS,
  WORKPLACE_PRESETS,
  formatPrice,
} from '../data/properties';
import {
  fetchNearbyAmenities,
  fetchWorkplaceSuggestions,
  formatDistance,
  resolvePlaceFromTextQuery,
} from '../services/placesService';
import { computeWorkplaceCommute } from '../services/routesService';

const props = defineProps<{
  property: PropertyListing;
  placesLib: google.maps.PlacesLibrary | null;
  routesLib: google.maps.RoutesLibrary | null;
  streetViewLib: google.maps.StreetViewLibrary | null;
  geometryLib: google.maps.GeometryLibrary | null;
  mapsError: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'amenitiesLoaded', amenities: NearbyAmenity[]): void;
  (e: 'focusAmenity', amenity: NearbyAmenity): void;
  (e: 'commuteComputed', summary: CommuteSummary | null): void;
}>();

// Street View state
const streetViewContainerRef = ref<HTMLDivElement | null>(null);
const streetViewStatus = ref<'loading' | 'ready' | 'unavailable'>('loading');
const streetViewMessage = ref<string>('Loading Street View preview...');
let panoramaInstance: google.maps.StreetViewPanorama | null = null;
let streetViewService: google.maps.StreetViewService | null = null;

// Nearby amenities state
const activeAmenityTab = ref<AmenityCategory>('all');
const amenities = ref<NearbyAmenity[]>([]);
const amenitiesLoading = ref(false);
const amenitiesError = ref<string | null>(null);

// Commute calculator state
const workplaceQuery = ref<string>('Salesforce Tower, San Francisco, CA');
const workplaceSuggestions = ref<WorkplaceSuggestion[]>([]);
const selectedWorkplacePlace = ref<google.maps.places.Place | null>(null);
const showSuggestionsDropdown = ref(false);
const commuteLoading = ref(false);
const commuteError = ref<string | null>(null);
const commuteResult = ref<CommuteSummary | null>(null);

let sessionToken: google.maps.places.AutocompleteSessionToken | undefined;
let suggestionDebounceTimer: number | undefined;
let activeAmenityRequestId = 0;
let activeStreetViewRequestId = 0;

async function updateStreetView() {
  const requestId = ++activeStreetViewRequestId;

  if (!props.streetViewLib || !streetViewContainerRef.value) {
    streetViewStatus.value = 'unavailable';
    streetViewMessage.value = props.mapsError
      ? 'Add VITE_GOOGLE_MAPS_API_KEY to preview Street View.'
      : 'Waiting for Street View library...';
    return;
  }

  streetViewStatus.value = 'loading';
  streetViewMessage.value = 'Loading Street View preview...';

  try {
    const { StreetViewPanorama, StreetViewService, StreetViewPreference, StreetViewSource } =
      props.streetViewLib;

    if (!streetViewService) {
      streetViewService = new StreetViewService();
    }

    if (!panoramaInstance) {
      panoramaInstance = new StreetViewPanorama(streetViewContainerRef.value, {
        addressControl: false,
        fullscreenControl: true,
        linksControl: true,
        panControl: false,
        enableCloseButton: false,
        zoomControl: false,
        motionTracking: false,
      });
    }

    const propLatLng = new google.maps.LatLng(
      props.property.position.lat,
      props.property.position.lng
    );

    const response = await streetViewService.getPanorama({
      location: propLatLng,
      radius: 85,
      preference: StreetViewPreference.NEAREST,
      source: StreetViewSource.OUTDOOR,
    });

    if (requestId !== activeStreetViewRequestId) return;

    const panoLocation = response.data.location;
    if (!panoLocation?.pano) {
      streetViewStatus.value = 'unavailable';
      streetViewMessage.value = 'No outdoor Street View imagery found within 85m.';
      return;
    }

    const heading =
      panoLocation.latLng && props.geometryLib
        ? props.geometryLib.spherical.computeHeading(panoLocation.latLng, propLatLng)
        : 0;

    panoramaInstance.setPano(panoLocation.pano);
    panoramaInstance.setPov({
      heading,
      pitch: 4,
    });
    panoramaInstance.setVisible(true);
    streetViewStatus.value = 'ready';
  } catch {
    if (requestId !== activeStreetViewRequestId) return;
    streetViewStatus.value = 'unavailable';
    streetViewMessage.value = 'Street View preview unavailable for this parcel.';
  }
}

async function loadAmenities() {
  const requestId = ++activeAmenityRequestId;

  if (!props.placesLib || !props.geometryLib) {
    amenities.value = [];
    emit('amenitiesLoaded', []);
    return;
  }

  amenitiesLoading.value = true;
  amenitiesError.value = null;

  try {
    const results = await fetchNearbyAmenities(
      props.property.position,
      activeAmenityTab.value,
      props.placesLib,
      props.geometryLib
    );

    if (requestId !== activeAmenityRequestId) return;
    amenities.value = results;
    emit('amenitiesLoaded', results);
  } catch (err) {
    if (requestId !== activeAmenityRequestId) return;
    amenitiesError.value =
      err instanceof Error ? err.message : 'Unable to fetch nearby places.';
    amenities.value = [];
    emit('amenitiesLoaded', []);
  } finally {
    if (requestId === activeAmenityRequestId) {
      amenitiesLoading.value = false;
    }
  }
}

function selectAmenityTab(tab: AmenityCategory) {
  activeAmenityTab.value = tab;
  void loadAmenities();
}

function onWorkplaceInput() {
  selectedWorkplacePlace.value = null;
  if (!props.placesLib) return;

  if (!sessionToken) {
    sessionToken = new props.placesLib.AutocompleteSessionToken();
  }

  if (suggestionDebounceTimer !== undefined) {
    window.clearTimeout(suggestionDebounceTimer);
  }

  const query = workplaceQuery.value;
  if (query.trim().length < 2) {
    workplaceSuggestions.value = [];
    showSuggestionsDropdown.value = false;
    return;
  }

  suggestionDebounceTimer = window.setTimeout(async () => {
    if (!props.placesLib) return;
    try {
      const results = await fetchWorkplaceSuggestions(
        query,
        props.placesLib,
        sessionToken
      );
      workplaceSuggestions.value = results;
      showSuggestionsDropdown.value = results.length > 0;
    } catch {
      workplaceSuggestions.value = [];
      showSuggestionsDropdown.value = false;
    }
  }, 220);
}

async function chooseWorkplaceSuggestion(suggestion: WorkplaceSuggestion) {
  workplaceQuery.value = suggestion.fullText;
  showSuggestionsDropdown.value = false;
  workplaceSuggestions.value = [];

  try {
    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    });
    sessionToken = undefined;
    selectedWorkplacePlace.value = place;
    await calculateCommute();
  } catch {
    await calculateCommute();
  }
}

function applyPresetWorkplace(preset: string) {
  workplaceQuery.value = preset;
  selectedWorkplacePlace.value = null;
  showSuggestionsDropdown.value = false;
  void calculateCommute();
}

async function calculateCommute() {
  const query = workplaceQuery.value.trim();
  if (!query) {
    commuteError.value = 'Enter a workplace address or landmark.';
    return;
  }

  if (!props.placesLib || !props.routesLib) {
    commuteError.value = 'Google Maps Places & Routes libraries are still loading.';
    return;
  }

  commuteLoading.value = true;
  commuteError.value = null;
  showSuggestionsDropdown.value = false;

  try {
    let destination: {
      name: string;
      address: string;
      location: { lat: number; lng: number };
    } | null = null;

    if (selectedWorkplacePlace.value?.location) {
      destination = {
        name: selectedWorkplacePlace.value.displayName ?? query,
        address: selectedWorkplacePlace.value.formattedAddress ?? query,
        location: {
          lat: selectedWorkplacePlace.value.location.lat(),
          lng: selectedWorkplacePlace.value.location.lng(),
        },
      };
    } else {
      const resolved = await resolvePlaceFromTextQuery(query, props.placesLib);
      if (resolved) {
        destination = {
          name: resolved.name,
          address: resolved.address,
          location: resolved.location,
        };
      }
    }

    if (!destination) {
      commuteError.value = 'Could not locate that workplace. Try a more specific address.';
      commuteResult.value = null;
      emit('commuteComputed', null);
      return;
    }

    const summary = await computeWorkplaceCommute(
      props.property.position,
      destination,
      props.routesLib
    );
    commuteResult.value = summary;
    emit('commuteComputed', summary);
  } catch (err) {
    commuteError.value =
      err instanceof Error ? err.message : 'Unable to compute commute matrix.';
    commuteResult.value = null;
    emit('commuteComputed', null);
  } finally {
    commuteLoading.value = false;
  }
}

function closeSuggestionsLater() {
  window.setTimeout(() => {
    showSuggestionsDropdown.value = false;
  }, 180);
}

watch(
  () => props.property.id,
  () => {
    void updateStreetView();
    void loadAmenities();
    if (commuteResult.value && props.placesLib && props.routesLib) {
      void calculateCommute();
    }
  }
);

watch(
  () => [props.streetViewLib, props.placesLib, props.geometryLib],
  () => {
    void updateStreetView();
    void loadAmenities();
  }
);

onMounted(() => {
  void updateStreetView();
  void loadAmenities();
});

onBeforeUnmount(() => {
  if (suggestionDebounceTimer !== undefined) {
    window.clearTimeout(suggestionDebounceTimer);
  }
  panoramaInstance = null;
});
</script>

<template>
  <section
    id="listing-detail-panel"
    data-testid="listing-detail-panel"
    class="detail-panel"
  >
    <div class="detail-top-header">
      <div>
        <div class="detail-kicker-row">
          <span class="detail-neighborhood">{{ property.neighborhood }}</span>
          <span class="detail-type">{{ PROPERTY_TYPE_LABELS[property.propertyType] }}</span>
        </div>
        <div class="detail-price-line">
          <h2 class="detail-price">{{ formatPrice(property.price) }}</h2>
          <span class="detail-apn">APN {{ property.apn }}</span>
        </div>
        <p class="detail-address">{{ property.address }}</p>
      </div>
      <button
        type="button"
        class="detail-close-btn"
        aria-label="Collapse listing details"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <div class="parcel-metrics-grid">
      <div class="metric-cell">
        <span class="metric-label">Beds / Baths</span>
        <strong class="metric-value">{{ property.beds }} bd · {{ property.baths }} ba</strong>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Interior</span>
        <strong class="metric-value">{{ property.sqft.toLocaleString() }} sq ft</strong>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Parcel Lot</span>
        <strong class="metric-value">{{ property.lotSqFt.toLocaleString() }} sq ft</strong>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Zoning</span>
        <strong class="metric-value">{{ property.zoning.split(' ')[0] }}</strong>
      </div>
    </div>

    <p class="detail-description">{{ property.description }}</p>

    <!-- Embedded Street View Neighborhood Preview -->
    <div class="detail-section">
      <div class="section-heading-row">
        <h3 class="section-title">Street View Neighborhood Preview</h3>
        <span class="section-badge">Interactive 360°</span>
      </div>
      <div class="street-view-wrapper">
        <div
          ref="streetViewContainerRef"
          id="street-view-container"
          data-testid="street-view-container"
          class="street-view-box"
        ></div>
        <div v-if="streetViewStatus !== 'ready'" class="street-view-overlay">
          <span>{{ streetViewMessage }}</span>
        </div>
      </div>
    </div>

    <!-- Workplace Commute Time Calculator -->
    <div
      id="commute-calculator-panel"
      data-testid="commute-calculator-panel"
      class="detail-section"
    >
      <div class="section-heading-row">
        <h3 class="section-title">Commute Time Calculator</h3>
        <span class="section-badge">Routes Matrix API</span>
      </div>

      <div class="workplace-form-row">
        <div class="workplace-input-wrap">
          <input
            id="workplace-input"
            data-testid="workplace-input"
            v-model="workplaceQuery"
            type="text"
            class="workplace-input"
            placeholder="Enter workplace address or landmark..."
            autocomplete="off"
            @input="onWorkplaceInput"
            @keydown.enter.prevent="calculateCommute"
            @blur="closeSuggestionsLater"
          />
          <ul
            v-if="showSuggestionsDropdown && workplaceSuggestions.length > 0"
            class="workplace-suggestions"
          >
            <li
              v-for="suggestion in workplaceSuggestions"
              :key="suggestion.id"
              class="workplace-suggestion-item"
              @mousedown.prevent="chooseWorkplaceSuggestion(suggestion)"
            >
              <strong>{{ suggestion.mainText }}</strong>
              <span v-if="suggestion.secondaryText">{{ suggestion.secondaryText }}</span>
            </li>
          </ul>
        </div>
        <button
          id="calculate-commute-btn"
          data-testid="calculate-commute-btn"
          type="button"
          class="commute-btn"
          :disabled="commuteLoading"
          @click="calculateCommute"
        >
          {{ commuteLoading ? 'Calculating...' : 'Calculate' }}
        </button>
      </div>

      <div class="preset-chips">
        <button
          v-for="preset in WORKPLACE_PRESETS"
          :key="preset"
          type="button"
          class="preset-chip"
          @click="applyPresetWorkplace(preset)"
        >
          {{ preset.split(',')[0] }}
        </button>
      </div>

      <p v-if="commuteError" class="inline-error">{{ commuteError }}</p>

      <div class="commute-eta-grid">
        <div
          id="commute-drive-eta"
          data-testid="commute-drive-eta"
          class="commute-card"
        >
          <span class="commute-mode">Driving (Traffic-Aware)</span>
          <strong class="commute-duration">
            {{ commuteResult ? commuteResult.driving.durationText : '—' }}
          </strong>
          <span class="commute-distance">
            {{
              commuteResult?.driving.distanceText
                ? `${commuteResult.driving.distanceText} via street route`
                : 'Click Calculate for live ETA'
            }}
          </span>
        </div>

        <div
          id="commute-transit-eta"
          data-testid="commute-transit-eta"
          class="commute-card"
        >
          <span class="commute-mode">Public Transit</span>
          <strong class="commute-duration">
            {{ commuteResult ? commuteResult.transit.durationText : '—' }}
          </strong>
          <span class="commute-distance">
            {{
              commuteResult?.transit.distanceText
                ? `${commuteResult.transit.distanceText} BART / Muni`
                : 'Click Calculate for transit ETA'
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Nearby Places within 5km -->
    <div
      id="nearby-amenities-panel"
      data-testid="nearby-amenities-panel"
      class="detail-section"
    >
      <div class="section-heading-row">
        <h3 class="section-title">Nearby Neighborhood Places (5 km)</h3>
        <span class="section-badge">Places API (New)</span>
      </div>

      <div class="amenity-tabs" role="tablist">
        <button
          id="amenity-tab-all"
          data-testid="amenity-tab-all"
          type="button"
          role="tab"
          class="amenity-tab"
          :class="{ 'is-active': activeAmenityTab === 'all' }"
          @click="selectAmenityTab('all')"
        >
          All
        </button>
        <button
          id="amenity-tab-schools"
          data-testid="amenity-tab-schools"
          type="button"
          role="tab"
          class="amenity-tab"
          :class="{ 'is-active': activeAmenityTab === 'schools' }"
          @click="selectAmenityTab('schools')"
        >
          Schools
        </button>
        <button
          id="amenity-tab-groceries"
          data-testid="amenity-tab-groceries"
          type="button"
          role="tab"
          class="amenity-tab"
          :class="{ 'is-active': activeAmenityTab === 'groceries' }"
          @click="selectAmenityTab('groceries')"
        >
          Groceries
        </button>
        <button
          id="amenity-tab-transit"
          data-testid="amenity-tab-transit"
          type="button"
          role="tab"
          class="amenity-tab"
          :class="{ 'is-active': activeAmenityTab === 'transit' }"
          @click="selectAmenityTab('transit')"
        >
          Transit
        </button>
      </div>

      <p v-if="amenitiesError" class="inline-error">{{ amenitiesError }}</p>

      <div
        v-if="amenitiesLoading"
        class="amenities-loading"
      >
        Searching within 5 km via Google Places...
      </div>

      <ul
        v-else
        id="nearby-amenities-list"
        data-testid="nearby-amenities-list"
        class="amenities-list"
      >
        <li
          v-if="amenities.length === 0"
          class="amenity-empty"
        >
          {{
            placesLib
              ? 'No places returned in this category within 5 km.'
              : 'Configure VITE_GOOGLE_MAPS_API_KEY to load live nearby schools, groceries, and transit.'
          }}
        </li>
        <li
          v-for="item in amenities"
          :key="item.id"
          class="amenity-item"
          @click="emit('focusAmenity', item)"
        >
          <div class="amenity-main">
            <strong class="amenity-name">{{ item.name }}</strong>
            <span class="amenity-meta">
              <span class="amenity-cat-badge" :data-cat="item.category">
                {{ item.primaryType }}
              </span>
              <span v-if="item.rating !== null" class="amenity-rating">
                ★ {{ item.rating.toFixed(1) }}
                <template v-if="item.userRatingCount !== null">
                  ({{ item.userRatingCount.toLocaleString() }})
                </template>
              </span>
            </span>
          </div>
          <span class="amenity-distance">{{ formatDistance(item.distanceMeters) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
