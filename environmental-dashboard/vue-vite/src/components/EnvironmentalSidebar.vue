<script setup lang="ts">
import AirQualityPanel from './AirQualityPanel.vue'
import PollenPanel from './PollenPanel.vue'
import SolarPanel from './SolarPanel.vue'
import WeatherPanel from './WeatherPanel.vue'
import type {
  AirQualityResponse,
  CurrentWeatherResponse,
  DailyForecastResponse,
  PollenForecastResponse,
  SectionState,
  SelectedLocation,
  SolarFetchResult,
  UnitsSystem,
} from '../types/environment'

defineProps<{
  location: SelectedLocation
  unitsSystem: UnitsSystem
  hasApiKey: boolean
  weatherCurrent: SectionState<CurrentWeatherResponse>
  weatherForecast: SectionState<DailyForecastResponse>
  airQuality: SectionState<AirQualityResponse>
  pollen: SectionState<PollenForecastResponse>
  solarLoading: boolean
  solarResult: SolarFetchResult | null
}>()
</script>

<template>
  <aside data-testid="environmental-sidebar" class="sidebar">
    <section data-testid="selected-location-card" class="env-card env-card--location">
      <div class="card-header">
        <div>
          <span class="card-eyebrow">Inspected Coordinates</span>
          <h2 class="card-title">{{ location.name }}</h2>
        </div>
        <span class="pill pill--neutral">
          {{
            location.source === 'autocomplete'
              ? 'Places Search'
              : location.source === 'map-click'
                ? 'Map Click'
                : 'Phoenix Seed'
          }}
        </span>
      </div>

      <p class="location-address">{{ location.formattedAddress }}</p>

      <div class="location-meta-row">
        <span class="coord-chip">Lat {{ location.lat.toFixed(5) }}</span>
        <span class="coord-chip">Lng {{ location.lng.toFixed(5) }}</span>
      </div>

      <p class="location-hint">
        Search any address above or click any building on the map to inspect real-time weather,
        AQI, pollen, and rooftop solar capacity.
      </p>
    </section>

    <WeatherPanel
      :current="weatherCurrent"
      :forecast="weatherForecast"
      :units-system="unitsSystem"
      :has-api-key="hasApiKey"
    />

    <AirQualityPanel :state="airQuality" :has-api-key="hasApiKey" />

    <PollenPanel :state="pollen" :has-api-key="hasApiKey" />

    <SolarPanel
      :loading="solarLoading"
      :result="solarResult"
      :units-system="unitsSystem"
      :has-api-key="hasApiKey"
    />
  </aside>
</template>
