<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadPlacesLibrary } from '../services/mapsLoader'
import type { BaseMapType, SelectedLocation, UnitsSystem } from '../types/environment'

const props = defineProps<{
  apiKey: string
  location: SelectedLocation
  unitsSystem: UnitsSystem
  aqiOverlayEnabled: boolean
  mapType: BaseMapType
}>()

const emit = defineEmits<{
  (e: 'select-place', payload: SelectedLocation): void
  (e: 'reset-phoenix'): void
  (e: 'toggle-units'): void
  (e: 'toggle-aqi-layer'): void
  (e: 'toggle-map-type'): void
  (e: 'maps-error', message: string): void
}>()

const autocompleteMountRef = ref<HTMLDivElement | null>(null)
const autocompleteReady = ref(false)

onMounted(async () => {
  if (!props.apiKey || !autocompleteMountRef.value) return

  try {
    const { PlaceAutocompleteElement } = await loadPlacesLibrary(props.apiKey)
    const autocompleteEl = new PlaceAutocompleteElement({
      requestedLanguage: 'en',
    })
    autocompleteEl.className = 'gmp-autocomplete-widget'
    autocompleteEl.setAttribute('aria-label', 'Search any address or city')

    autocompleteEl.addEventListener('gmp-select', async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent
      const prediction = selectEvent.placePrediction
      if (!prediction) return

      try {
        const place = prediction.toPlace()
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        })

        if (!place.location) return

        emit('select-place', {
          name: place.displayName ?? place.formattedAddress ?? 'Selected Location',
          formattedAddress:
            place.formattedAddress ??
            `${place.location.lat().toFixed(5)}, ${place.location.lng().toFixed(5)}`,
          lat: place.location.lat(),
          lng: place.location.lng(),
          placeId: place.id,
          source: 'autocomplete',
        })
      } catch (err) {
        emit(
          'maps-error',
          err instanceof Error ? err.message : 'Unable to fetch selected place details.',
        )
      }
    })

    autocompleteEl.addEventListener('gmp-error', () => {
      emit('maps-error', 'Places Autocomplete encountered an API authorization or quota error.')
    })

    autocompleteMountRef.value.replaceChildren(autocompleteEl)
    autocompleteReady.value = true
  } catch (err) {
    emit(
      'maps-error',
      err instanceof Error ? err.message : 'Failed to initialize Places Autocomplete.',
    )
  }
})
</script>

<template>
  <header class="top-header">
    <div class="brand-block">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
      </div>
      <div class="brand-copy">
        <h1 class="brand-title">AeroSolar Insights</h1>
        <span class="brand-subtitle">Weather · AQI · Pollen · Solar</span>
      </div>
    </div>

    <div class="search-cluster">
      <div data-testid="places-autocomplete-container" class="autocomplete-container">
        <div ref="autocompleteMountRef" class="autocomplete-mount"></div>
        <input
          v-if="!autocompleteReady"
          type="text"
          class="autocomplete-fallback"
          :disabled="!apiKey"
          :placeholder="
            apiKey
              ? 'Loading Places Autocomplete…'
              : 'Configure VITE_GOOGLE_MAPS_API_KEY to enable Places search'
          "
          aria-label="Search any address or city"
        />
      </div>

      <div data-testid="active-location-badge" class="location-badge" :title="location.formattedAddress">
        <span class="location-dot" aria-hidden="true"></span>
        <span class="location-name">{{ location.name }}</span>
        <span class="location-coords">
          {{ location.lat.toFixed(4) }}, {{ location.lng.toFixed(4) }}
        </span>
      </div>
    </div>

    <div class="controls-cluster">
      <button
        type="button"
        data-testid="reset-phoenix-btn"
        class="ctrl-btn"
        title="Reset inspection target to Phoenix City Hall"
        @click="$emit('reset-phoenix')"
      >
        Phoenix Preset
      </button>

      <button
        type="button"
        data-testid="units-toggle-btn"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--active': unitsSystem === 'METRIC' }"
        title="Toggle Imperial vs Metric units"
        @click="$emit('toggle-units')"
      >
        {{ unitsSystem === 'IMPERIAL' ? '°F · mi' : '°C · km' }}
      </button>

      <button
        type="button"
        data-testid="aqi-layer-toggle"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--accent': aqiOverlayEnabled }"
        :aria-pressed="aqiOverlayEnabled"
        title="Toggle US AQI Heatmap Tile Overlay"
        @click="$emit('toggle-aqi-layer')"
      >
        AQI Layer {{ aqiOverlayEnabled ? 'On' : 'Off' }}
      </button>

      <button
        type="button"
        data-testid="map-type-toggle"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--active': mapType === 'hybrid' }"
        :aria-pressed="mapType === 'hybrid'"
        title="Switch between Roadmap and Satellite Hybrid view"
        @click="$emit('toggle-map-type')"
      >
        {{ mapType === 'hybrid' ? 'Hybrid Satellite' : 'Roadmap' }}
      </button>
    </div>
  </header>
</template>
