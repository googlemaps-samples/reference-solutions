<script setup lang="ts">
import { computed } from 'vue'
import type {
  CurrentWeatherResponse,
  DailyForecastResponse,
  ForecastDay,
  SectionState,
  UnitsSystem,
} from '../types/environment'

const props = defineProps<{
  current: SectionState<CurrentWeatherResponse>
  forecast: SectionState<DailyForecastResponse>
  unitsSystem: UnitsSystem
  hasApiKey: boolean
}>()

const tempUnitLabel = computed(() => (props.unitsSystem === 'IMPERIAL' ? '°F' : '°C'))

function formatTemp(degrees?: number): string {
  if (degrees === undefined || degrees === null || Number.isNaN(degrees)) return '—'
  return `${Math.round(degrees)}${tempUnitLabel.value}`
}

function formatWind(speed?: { value?: number; unit?: string }, cardinal?: string): string {
  if (speed?.value === undefined) return '—'
  const unit = speed.unit === 'MILES_PER_HOUR' ? 'mph' : 'km/h'
  const dir = cardinal ? ` ${cardinal}` : ''
  return `${Math.round(speed.value)} ${unit}${dir}`
}

function formatDayLabel(day: ForecastDay, index: number): string {
  if (!day.displayDate) return `Day ${index + 1}`
  const { year, month, day: dateNum } = day.displayDate
  const dateObj = new Date(Date.UTC(year, month - 1, dateNum))
  if (index === 0) return 'Today'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateObj)
}

function weatherIconUrl(iconBaseUri?: string): string | null {
  if (!iconBaseUri) return null
  return `${iconBaseUri}.svg`
}
</script>

<template>
  <section data-testid="weather-card" class="env-card">
    <div class="card-header">
      <div>
        <span class="card-eyebrow">Weather API</span>
        <h2 class="card-title">Current Conditions &amp; 5-Day Outlook</h2>
      </div>
      <span v-if="current.data?.timeZone?.id" class="pill pill--neutral">
        {{ current.data.timeZone.id }}
      </span>
    </div>

    <div v-if="!hasApiKey" class="empty-state">
      Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> to load live Weather API
      observations.
    </div>

    <div v-else-if="current.loading" class="loading-skeleton">
      <div class="skeleton-line skeleton-line--lg"></div>
      <div class="skeleton-grid">
        <div class="skeleton-box"></div>
        <div class="skeleton-box"></div>
        <div class="skeleton-box"></div>
      </div>
    </div>

    <div v-else-if="current.error" class="error-banner">
      Weather data unavailable: {{ current.error }}
    </div>

    <template v-else-if="current.data">
      <div class="weather-hero">
        <div class="weather-hero-main">
          <img
            v-if="weatherIconUrl(current.data.weatherCondition?.iconBaseUri)"
            :src="weatherIconUrl(current.data.weatherCondition?.iconBaseUri)!"
            :alt="current.data.weatherCondition?.description?.text ?? 'Weather condition'"
            class="weather-hero-icon"
            width="44"
            height="44"
          />
          <div>
            <div class="weather-temp">{{ formatTemp(current.data.temperature?.degrees) }}</div>
            <div class="weather-condition-text">
              {{ current.data.weatherCondition?.description?.text ?? 'Clear' }}
            </div>
          </div>
        </div>
        <div class="weather-feels">
          <span>Feels like</span>
          <strong>{{ formatTemp(current.data.feelsLikeTemperature?.degrees) }}</strong>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-tile">
          <span class="metric-label">Humidity</span>
          <strong class="metric-value">
            {{
              current.data.relativeHumidity !== undefined
                ? `${current.data.relativeHumidity}%`
                : '—'
            }}
          </strong>
        </div>
        <div class="metric-tile">
          <span class="metric-label">UV Index</span>
          <strong class="metric-value">{{ current.data.uvIndex ?? '—' }}</strong>
        </div>
        <div class="metric-tile">
          <span class="metric-label">Wind</span>
          <strong class="metric-value">
            {{
              formatWind(current.data.wind?.speed, current.data.wind?.direction?.cardinal)
            }}
          </strong>
        </div>
        <div class="metric-tile">
          <span class="metric-label">Precip Chance</span>
          <strong class="metric-value">
            {{
              current.data.precipitation?.probability?.percent !== undefined
                ? `${current.data.precipitation.probability.percent}%`
                : '0%'
            }}
          </strong>
        </div>
      </div>
    </template>

    <div data-testid="weather-forecast-list" class="forecast-section">
      <h3 class="subsection-title">5-Day Daily Forecast</h3>
      <div v-if="!hasApiKey" class="muted-note">Forecast activates once an API key is configured.</div>
      <div v-else-if="forecast.loading" class="forecast-loading">Loading 5-day forecast…</div>
      <div v-else-if="forecast.error" class="error-banner">{{ forecast.error }}</div>
      <div v-else-if="forecast.data?.forecastDays?.length" class="forecast-list">
        <div
          v-for="(day, idx) in forecast.data.forecastDays.slice(0, 5)"
          :key="idx"
          class="forecast-row"
        >
          <span class="forecast-day">{{ formatDayLabel(day, idx) }}</span>
          <span class="forecast-cond">
            <img
              v-if="weatherIconUrl(day.daytimeForecast?.weatherCondition?.iconBaseUri)"
              :src="weatherIconUrl(day.daytimeForecast?.weatherCondition?.iconBaseUri)!"
              :alt="day.daytimeForecast?.weatherCondition?.description?.text ?? 'Forecast'"
              class="forecast-icon"
              width="20"
              height="20"
            />
            <span class="forecast-cond-label">
              {{ day.daytimeForecast?.weatherCondition?.description?.text ?? 'Clear' }}
            </span>
          </span>
          <span class="forecast-precip">
            {{ day.daytimeForecast?.precipitation?.probability?.percent ?? 0 }}%
          </span>
          <span class="forecast-temps">
            <strong>{{ formatTemp(day.maxTemperature?.degrees) }}</strong>
            <span class="temp-low">{{ formatTemp(day.minTemperature?.degrees) }}</span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
