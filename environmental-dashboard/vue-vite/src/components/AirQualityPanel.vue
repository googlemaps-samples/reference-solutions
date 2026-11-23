<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatRgbColor } from '../services/environmentalApi'
import type { AirQualityResponse, SectionState } from '../types/environment'

const props = defineProps<{
  state: SectionState<AirQualityResponse>
  hasApiKey: boolean
}>()

type AdviceGroup = 'generalPopulation' | 'athletes' | 'children' | 'lungDiseasePopulation'

const activeGroup = ref<AdviceGroup>('generalPopulation')

const primaryIndex = computed(() => {
  const indexes = props.state.data?.indexes ?? []
  return indexes.find((idx) => idx.code === 'usa_epa') ?? indexes[0] ?? null
})

const secondaryIndex = computed(() => {
  const indexes = props.state.data?.indexes ?? []
  if (indexes.length < 2) return null
  return indexes.find((idx) => idx.code !== primaryIndex.value?.code) ?? null
})

const badgeColor = computed(() => formatRgbColor(primaryIndex.value?.color, '#16a34a'))

const adviceText = computed(() => {
  const recs = props.state.data?.healthRecommendations
  if (!recs) return null
  return recs[activeGroup.value] ?? recs.generalPopulation ?? null
})

function formatUnits(units?: string): string {
  if (units === 'MICROGRAMS_PER_CUBIC_METER') return 'µg/m³'
  if (units === 'PARTS_PER_BILLION') return 'ppb'
  return units ?? ''
}
</script>

<template>
  <section data-testid="air-quality-card" class="env-card">
    <div class="card-header">
      <div>
        <span class="card-eyebrow">Air Quality API</span>
        <h2 class="card-title">AQI &amp; Pollutant Telemetry</h2>
      </div>
      <span v-if="primaryIndex?.dominantPollutant" class="pill pill--neutral">
        Dominant: {{ primaryIndex.dominantPollutant.toUpperCase() }}
      </span>
    </div>

    <div v-if="!hasApiKey" class="empty-state">
      Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> to load live AQI,
      pollutant concentrations, and health guidance.
    </div>

    <div v-else-if="state.loading" class="loading-skeleton">
      <div class="skeleton-line skeleton-line--lg"></div>
      <div class="skeleton-box"></div>
    </div>

    <div v-else-if="state.error" class="error-banner">
      Air Quality unavailable: {{ state.error }}
    </div>

    <template v-else-if="state.data && primaryIndex">
      <div class="aqi-hero">
        <div class="aqi-score-badge" :style="{ borderColor: badgeColor, backgroundColor: `${badgeColor}18` }">
          <span class="aqi-score-value" :style="{ color: badgeColor }">
            {{ primaryIndex.aqiDisplay ?? primaryIndex.aqi ?? '—' }}
          </span>
          <span class="aqi-score-label">{{ primaryIndex.displayName ?? 'AQI' }}</span>
        </div>

        <div class="aqi-summary">
          <div class="aqi-category">{{ primaryIndex.category ?? 'Air Quality Index' }}</div>
          <div v-if="secondaryIndex" class="aqi-secondary">
            {{ secondaryIndex.displayName }}:
            <strong>{{ secondaryIndex.aqiDisplay ?? secondaryIndex.aqi }}</strong>
            ({{ secondaryIndex.category }})
          </div>
        </div>
      </div>

      <div v-if="state.data.pollutants?.length" class="pollutants-block">
        <h3 class="subsection-title">Measured Pollutants</h3>
        <div class="pollutant-grid">
          <div
            v-for="pollutant in state.data.pollutants.slice(0, 6)"
            :key="pollutant.code"
            class="pollutant-chip"
            :title="pollutant.additionalInfo?.sources ?? pollutant.fullName"
          >
            <span class="pollutant-name">{{ pollutant.displayName ?? pollutant.code }}</span>
            <strong class="pollutant-val">
              {{
                pollutant.concentration?.value !== undefined
                  ? pollutant.concentration.value.toFixed(1)
                  : '—'
              }}
              <small>{{ formatUnits(pollutant.concentration?.units) }}</small>
            </strong>
          </div>
        </div>
      </div>

      <div v-if="state.data.healthRecommendations" class="advice-block">
        <div class="advice-header">
          <h3 class="subsection-title">Health Recommendations</h3>
          <div class="advice-tabs" role="tablist">
            <button
              type="button"
              class="advice-tab"
              :class="{ 'advice-tab--active': activeGroup === 'generalPopulation' }"
              @click="activeGroup = 'generalPopulation'"
            >
              General
            </button>
            <button
              type="button"
              class="advice-tab"
              :class="{ 'advice-tab--active': activeGroup === 'athletes' }"
              @click="activeGroup = 'athletes'"
            >
              Active
            </button>
            <button
              type="button"
              class="advice-tab"
              :class="{ 'advice-tab--active': activeGroup === 'lungDiseasePopulation' }"
              @click="activeGroup = 'lungDiseasePopulation'"
            >
              Sensitive
            </button>
            <button
              type="button"
              class="advice-tab"
              :class="{ 'advice-tab--active': activeGroup === 'children' }"
              @click="activeGroup = 'children'"
            >
              Children
            </button>
          </div>
        </div>
        <p v-if="adviceText" class="advice-copy">{{ adviceText }}</p>
      </div>
    </template>
  </section>
</template>
