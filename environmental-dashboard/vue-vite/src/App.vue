<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import EnvironmentalSidebar from './components/EnvironmentalSidebar.vue'
import MapCanvas from './components/MapCanvas.vue'
import TopHeaderBar from './components/TopHeaderBar.vue'
import {
  fetchAirQuality,
  fetchCurrentWeather,
  fetchDailyForecast,
  fetchPollenForecast,
  fetchSolarBuildingInsights,
  PHOENIX_SEED,
} from './services/environmentalApi'
import { getGoogleMapsApiKey } from './services/mapsLoader'
import type {
  AirQualityResponse,
  BaseMapType,
  CurrentWeatherResponse,
  DailyForecastResponse,
  PollenForecastResponse,
  SectionState,
  SelectedLocation,
  SolarFetchResult,
  UnitsSystem,
} from './types/environment'

const apiKey = getGoogleMapsApiKey()
const hasApiKey = computed(() => apiKey.length > 0)

const location = ref<SelectedLocation>({
  name: PHOENIX_SEED.query,
  formattedAddress: `${PHOENIX_SEED.lat.toFixed(4)}, ${PHOENIX_SEED.lng.toFixed(4)}`,
  lat: PHOENIX_SEED.lat,
  lng: PHOENIX_SEED.lng,
  source: 'seed',
})

const unitsSystem = ref<UnitsSystem>('IMPERIAL')
const aqiOverlayEnabled = ref(false)
const mapType = ref<BaseMapType>('roadmap')
const resetCounter = ref(0)
const mapsError = ref<string | null>(null)

const weatherCurrent = reactive<SectionState<CurrentWeatherResponse>>({
  loading: false,
  error: null,
  data: null,
})

const weatherForecast = reactive<SectionState<DailyForecastResponse>>({
  loading: false,
  error: null,
  data: null,
})

const airQuality = reactive<SectionState<AirQualityResponse>>({
  loading: false,
  error: null,
  data: null,
})

const pollen = reactive<SectionState<PollenForecastResponse>>({
  loading: false,
  error: null,
  data: null,
})

const solarLoading = ref(false)
const solarResult = ref<SolarFetchResult | null>(null)

const solarBoundingBox = computed(() =>
  solarResult.value?.status === 'ok' ? (solarResult.value.data?.boundingBox ?? null) : null,
)

let environmentAbortController: AbortController | null = null
let weatherAbortController: AbortController | null = null

async function loadWeatherOnly(lat: number, lng: number, units: UnitsSystem) {
  if (!apiKey) return
  weatherAbortController?.abort()
  const controller = new AbortController()
  weatherAbortController = controller

  weatherCurrent.loading = true
  weatherCurrent.error = null
  weatherForecast.loading = true
  weatherForecast.error = null

  const [currRes, forecastRes] = await Promise.allSettled([
    fetchCurrentWeather(apiKey, lat, lng, units, controller.signal),
    fetchDailyForecast(apiKey, lat, lng, units, controller.signal),
  ])

  if (controller.signal.aborted) return

  if (currRes.status === 'fulfilled') {
    weatherCurrent.data = currRes.value
  } else {
    weatherCurrent.error =
      currRes.reason instanceof Error ? currRes.reason.message : 'Unable to load current weather'
  }
  weatherCurrent.loading = false

  if (forecastRes.status === 'fulfilled') {
    weatherForecast.data = forecastRes.value
  } else {
    weatherForecast.error =
      forecastRes.reason instanceof Error
        ? forecastRes.reason.message
        : 'Unable to load weather forecast'
  }
  weatherForecast.loading = false
}

async function loadAllEnvironmentalData(lat: number, lng: number, units: UnitsSystem) {
  if (!apiKey) return

  environmentAbortController?.abort()
  const controller = new AbortController()
  environmentAbortController = controller

  weatherCurrent.loading = true
  weatherCurrent.error = null
  weatherForecast.loading = true
  weatherForecast.error = null
  airQuality.loading = true
  airQuality.error = null
  pollen.loading = true
  pollen.error = null
  solarLoading.value = true

  const [currRes, forecastRes, aqiRes, pollenRes, solarRes] = await Promise.allSettled([
    fetchCurrentWeather(apiKey, lat, lng, units, controller.signal),
    fetchDailyForecast(apiKey, lat, lng, units, controller.signal),
    fetchAirQuality(apiKey, lat, lng, controller.signal),
    fetchPollenForecast(apiKey, lat, lng, controller.signal),
    fetchSolarBuildingInsights(apiKey, lat, lng, controller.signal),
  ])

  if (controller.signal.aborted) return

  if (currRes.status === 'fulfilled') {
    weatherCurrent.data = currRes.value
  } else {
    weatherCurrent.error =
      currRes.reason instanceof Error ? currRes.reason.message : 'Weather request failed'
  }
  weatherCurrent.loading = false

  if (forecastRes.status === 'fulfilled') {
    weatherForecast.data = forecastRes.value
  } else {
    weatherForecast.error =
      forecastRes.reason instanceof Error ? forecastRes.reason.message : 'Forecast request failed'
  }
  weatherForecast.loading = false

  if (aqiRes.status === 'fulfilled') {
    airQuality.data = aqiRes.value
  } else {
    airQuality.error =
      aqiRes.reason instanceof Error ? aqiRes.reason.message : 'Air Quality request failed'
  }
  airQuality.loading = false

  if (pollenRes.status === 'fulfilled') {
    pollen.data = pollenRes.value
  } else {
    pollen.error =
      pollenRes.reason instanceof Error ? pollenRes.reason.message : 'Pollen request failed'
  }
  pollen.loading = false

  if (solarRes.status === 'fulfilled') {
    solarResult.value = solarRes.value
  } else {
    solarResult.value = {
      status: 'error',
      data: null,
      message: solarRes.reason instanceof Error ? solarRes.reason.message : 'Solar request failed',
    }
  }
  solarLoading.value = false
}

let initialFetchStarted = false
let initialFallbackTimer: ReturnType<typeof setTimeout> | null = null

function handleLocationSelected(next: SelectedLocation) {
  mapsError.value = null
  const coordsChanged =
    Math.abs(next.lat - location.value.lat) > 0.00001 ||
    Math.abs(next.lng - location.value.lng) > 0.00001

  location.value = next

  if (!initialFetchStarted || coordsChanged || !weatherCurrent.data) {
    initialFetchStarted = true
    if (initialFallbackTimer) {
      clearTimeout(initialFallbackTimer)
      initialFallbackTimer = null
    }
    void loadAllEnvironmentalData(next.lat, next.lng, unitsSystem.value)
  }
}

function handleResetPhoenix() {
  mapsError.value = null
  resetCounter.value += 1
  initialFetchStarted = true
  const next: SelectedLocation = {
    name: PHOENIX_SEED.query,
    formattedAddress: `${PHOENIX_SEED.lat.toFixed(4)}, ${PHOENIX_SEED.lng.toFixed(4)}`,
    lat: PHOENIX_SEED.lat,
    lng: PHOENIX_SEED.lng,
    source: 'seed',
  }
  location.value = next
  void loadAllEnvironmentalData(next.lat, next.lng, unitsSystem.value)
}

function handleToggleUnits() {
  unitsSystem.value = unitsSystem.value === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL'
  void loadWeatherOnly(location.value.lat, location.value.lng, unitsSystem.value)
}

function handleToggleAqiLayer() {
  aqiOverlayEnabled.value = !aqiOverlayEnabled.value
}

function handleToggleMapType() {
  mapType.value = mapType.value === 'roadmap' ? 'hybrid' : 'roadmap'
}

onMounted(() => {
  if (hasApiKey.value) {
    initialFallbackTimer = setTimeout(() => {
      if (!initialFetchStarted) {
        initialFetchStarted = true
        void loadAllEnvironmentalData(location.value.lat, location.value.lng, unitsSystem.value)
      }
    }, 2500)
  }
})

onBeforeUnmount(() => {
  if (initialFallbackTimer) {
    clearTimeout(initialFallbackTimer)
  }
  environmentAbortController?.abort()
  weatherAbortController?.abort()
})
</script>

<template>
  <div class="dashboard-shell">
    <TopHeaderBar
      :api-key="apiKey"
      :location="location"
      :units-system="unitsSystem"
      :aqi-overlay-enabled="aqiOverlayEnabled"
      :map-type="mapType"
      @select-place="handleLocationSelected"
      @reset-phoenix="handleResetPhoenix"
      @toggle-units="handleToggleUnits"
      @toggle-aqi-layer="handleToggleAqiLayer"
      @toggle-map-type="handleToggleMapType"
      @maps-error="(msg) => (mapsError = msg)"
    />

    <div v-if="mapsError" class="global-alert" role="alert">
      {{ mapsError }}
    </div>

    <main class="workspace-grid">
      <EnvironmentalSidebar
        :location="location"
        :units-system="unitsSystem"
        :has-api-key="hasApiKey"
        :weather-current="weatherCurrent"
        :weather-forecast="weatherForecast"
        :air-quality="airQuality"
        :pollen="pollen"
        :solar-loading="solarLoading"
        :solar-result="solarResult"
      />

      <MapCanvas
        :api-key="apiKey"
        :location="location"
        :map-type="mapType"
        :aqi-overlay-enabled="aqiOverlayEnabled"
        :solar-bounding-box="solarBoundingBox"
        :reset-counter="resetCounter"
        @location-picked="handleLocationSelected"
        @maps-error="(msg) => (mapsError = msg)"
      />
    </main>
  </div>
</template>
