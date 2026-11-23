<script setup lang="ts">
import { computed } from 'vue'
import { formatRgbColor } from '../services/environmentalApi'
import type { PollenForecastResponse, SectionState } from '../types/environment'

const props = defineProps<{
  state: SectionState<PollenForecastResponse>
  hasApiKey: boolean
}>()

const todayInfo = computed(() => props.state.data?.dailyInfo?.[0] ?? null)

const pollenTypes = computed(() => todayInfo.value?.pollenTypeInfo ?? [])

const activePlants = computed(() => {
  const plants = todayInfo.value?.plantInfo ?? []
  return plants.filter((p) => p.inSeason || (p.indexInfo?.value ?? 0) > 0).slice(0, 4)
})

const guidanceNotes = computed(() => {
  const notes = new Set<string>()
  for (const t of pollenTypes.value) {
    for (const rec of t.healthRecommendations ?? []) {
      notes.add(rec)
    }
  }
  return Array.from(notes).slice(0, 2)
})

function barWidthPercent(val?: number): string {
  const numeric = Math.max(0, Math.min(5, val ?? 0))
  return `${Math.max(8, (numeric / 5) * 100)}%`
}
</script>

<template>
  <section data-testid="pollen-card" class="env-card">
    <div class="card-header">
      <div>
        <span class="card-eyebrow">Pollen API</span>
        <h2 class="card-title">Tree, Grass &amp; Weed Allergens</h2>
      </div>
      <span v-if="state.data?.regionCode" class="pill pill--neutral">
        Region: {{ state.data.regionCode }}
      </span>
    </div>

    <div v-if="!hasApiKey" class="empty-state">
      Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> to load daily Tree,
      Grass, and Weed Universal Pollen Index (UPI) forecasts.
    </div>

    <div v-else-if="state.loading" class="loading-skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>

    <div v-else-if="state.error" class="error-banner">
      Pollen data unavailable: {{ state.error }}
    </div>

    <template v-else-if="todayInfo">
      <div class="pollen-types">
        <div v-for="ptype in pollenTypes" :key="ptype.code" class="pollen-row">
          <div class="pollen-row-top">
            <div class="pollen-name-group">
              <span class="pollen-name">{{ ptype.displayName ?? ptype.code }}</span>
              <span
                class="season-badge"
                :class="ptype.inSeason ? 'season-badge--active' : 'season-badge--off'"
              >
                {{ ptype.inSeason ? 'In Season' : 'Off Season' }}
              </span>
            </div>
            <span class="pollen-category">
              {{ ptype.indexInfo?.category ?? 'None' }}
              <strong v-if="ptype.indexInfo?.value !== undefined">
                ({{ ptype.indexInfo.value }}/5)
              </strong>
            </span>
          </div>

          <div class="pollen-bar-track">
            <div
              class="pollen-bar-fill"
              :style="{
                width: barWidthPercent(ptype.indexInfo?.value),
                backgroundColor: formatRgbColor(ptype.indexInfo?.color, '#22c55e'),
              }"
            ></div>
          </div>
        </div>
      </div>

      <div v-if="activePlants.length" class="plants-block">
        <h3 class="subsection-title">Active Allergen Plants</h3>
        <div class="plant-pills">
          <div v-for="plant in activePlants" :key="plant.code" class="plant-pill">
            <strong>{{ plant.displayName ?? plant.code }}</strong>
            <span v-if="plant.indexInfo?.category"> · {{ plant.indexInfo.category }}</span>
            <span v-if="plant.plantDescription?.family" class="plant-family">
              {{ plant.plantDescription.family }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="guidanceNotes.length" class="guidance-block">
        <p v-for="(note, idx) in guidanceNotes" :key="idx" class="advice-copy">
          {{ note }}
        </p>
      </div>
    </template>
  </section>
</template>
