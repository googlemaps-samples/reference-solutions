<script setup lang="ts">
import { computed } from 'vue'
import type { SolarFetchResult, UnitsSystem } from '../types/environment'

const props = defineProps<{
  loading: boolean
  result: SolarFetchResult | null
  unitsSystem: UnitsSystem
  hasApiKey: boolean
}>()

const potential = computed(() => props.result?.data?.solarPotential ?? null)

const maxArrayKw = computed(() => {
  const panels = potential.value?.maxArrayPanelsCount
  const watts = potential.value?.panelCapacityWatts
  if (!panels || !watts) return null
  return ((panels * watts) / 1000).toFixed(1)
})

const maxAnnualKwh = computed(() => {
  const configs = potential.value?.solarPanelConfigs ?? []
  if (!configs.length) return null
  const best = configs[configs.length - 1]
  if (!best?.yearlyEnergyDcKwh) return null
  return Math.round(best.yearlyEnergyDcKwh).toLocaleString()
})

const formattedRoofArea = computed(() => {
  const m2 = potential.value?.wholeRoofStats?.areaMeters2
  if (!m2) return '—'
  if (props.unitsSystem === 'IMPERIAL') {
    return `${Math.round(m2 * 10.7639).toLocaleString()} sq ft`
  }
  return `${Math.round(m2).toLocaleString()} m²`
})

const formattedImageryDate = computed(() => {
  const d = props.result?.data?.imageryDate
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
})
</script>

<template>
  <section data-testid="solar-card" class="env-card env-card--solar">
    <div class="card-header">
      <div>
        <span class="card-eyebrow">Solar API</span>
        <h2 class="card-title">Rooftop Solar Potential</h2>
      </div>
      <span v-if="result?.data?.imageryQuality" class="pill pill--solar">
        {{ result.data.imageryQuality }} Imagery
      </span>
    </div>

    <div v-if="!hasApiKey" class="empty-state">
      Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> to inspect rooftop panel
      capacity, annual sunshine hours, and carbon offset potential.
    </div>

    <div v-else-if="loading" class="loading-skeleton">
      <div class="skeleton-line skeleton-line--lg"></div>
      <div class="skeleton-grid">
        <div class="skeleton-box"></div>
        <div class="skeleton-box"></div>
      </div>
    </div>

    <div v-else-if="result?.status === 'non-coverage'" data-testid="solar-non-coverage" class="non-coverage-box">
      <strong>No Building Solar Coverage Here</strong>
      <p>
        {{ result.message ?? 'No building footprint was found within 50m of these coordinates.' }}
        Click directly on a nearby building rooftop on the map to inspect its solar array capacity.
      </p>
    </div>

    <div v-else-if="result?.status === 'error'" class="error-banner">
      Solar Insights unavailable: {{ result.message }}
    </div>

    <template v-else-if="potential">
      <div class="solar-metrics-grid">
        <div class="metric-tile metric-tile--highlight">
          <span class="metric-label">Max Solar Panels</span>
          <strong class="metric-value">
            {{ potential.maxArrayPanelsCount?.toLocaleString() ?? '—' }} panels
          </strong>
          <span v-if="maxArrayKw" class="metric-sub">{{ maxArrayKw }} kW DC array</span>
        </div>

        <div class="metric-tile metric-tile--highlight">
          <span class="metric-label">Annual Sunshine</span>
          <strong class="metric-value">
            {{
              potential.maxSunshineHoursPerYear
                ? `${Math.round(potential.maxSunshineHoursPerYear).toLocaleString()} hrs/yr`
                : '—'
            }}
          </strong>
          <span v-if="maxAnnualKwh" class="metric-sub">Est. {{ maxAnnualKwh }} kWh/yr</span>
        </div>

        <div class="metric-tile">
          <span class="metric-label">Roof Area</span>
          <strong class="metric-value">{{ formattedRoofArea }}</strong>
        </div>

        <div class="metric-tile">
          <span class="metric-label">Carbon Offset</span>
          <strong class="metric-value">
            {{
              potential.carbonOffsetFactorKgPerMwh
                ? `${Math.round(potential.carbonOffsetFactorKgPerMwh)} kg CO₂/MWh`
                : '—'
            }}
          </strong>
        </div>
      </div>

      <div v-if="formattedImageryDate" class="solar-footnote">
        Aerial imagery date: {{ formattedImageryDate }} · Panel spec:
        {{ potential.panelCapacityWatts ?? 400 }}W
      </div>
    </template>
  </section>
</template>
