<script setup lang="ts">
import { ref } from 'vue';
import type { ActiveRouteSummary } from '../types/dispatch';

defineProps<{
  summary: ActiveRouteSummary;
}>();

const emit = defineEmits<{
  clear: [];
}>();

const stepsExpanded = ref(true);
</script>

<template>
  <section id="route-summary-panel" class="route-summary-panel" aria-live="polite">
    <div class="route-summary-header">
      <div>
        <span class="dispatch-eyebrow">Active Dispatch Route</span>
        <h2 class="route-dest-name">{{ summary.provider.name }}</h2>
      </div>
      <button
        id="clear-route-btn"
        type="button"
        class="clear-route-btn"
        @click="emit('clear')"
      >
        Clear Route
      </button>
    </div>

    <div class="route-metrics-grid">
      <div class="route-metric">
        <span class="metric-label">Driving ETA</span>
        <strong class="metric-value">{{ summary.durationText }}</strong>
      </div>
      <div class="route-metric">
        <span class="metric-label">Distance</span>
        <strong class="metric-value">{{ summary.distanceText }}</strong>
      </div>
      <div class="route-metric">
        <span class="metric-label">Service</span>
        <strong class="metric-value">
          {{ summary.provider.category === 'ev' ? 'EV Charge' : 'Repair' }}
        </strong>
      </div>
    </div>

    <p class="route-origin-line">
      From: <span>{{ summary.originAddress }}</span>
    </p>

    <div class="route-toolbar">
      <button
        type="button"
        class="toggle-steps-btn"
        :aria-expanded="stepsExpanded"
        @click="stepsExpanded = !stepsExpanded"
      >
        {{ stepsExpanded ? 'Hide' : 'Show' }} Turn-by-Turn Steps ({{
          summary.steps.length
        }})
      </button>

      <a
        v-if="summary.provider.googleMapsUri"
        :href="summary.provider.googleMapsUri"
        target="_blank"
        rel="noopener noreferrer"
        class="open-gmaps-link"
      >
        Open in Google Maps ↗
      </a>
    </div>

    <ol
      v-if="stepsExpanded && summary.steps.length > 0"
      id="turn-by-turn-steps"
      class="turn-by-turn-steps"
    >
      <li
        v-for="step in summary.steps"
        :key="`step-${step.index}`"
        class="turn-step-item"
      >
        <span class="step-index">{{ step.index }}</span>
        <div class="step-body">
          <div class="step-instruction">{{ step.instruction }}</div>
          <div class="step-meta">
            {{ step.distanceText }} · {{ step.durationText }}
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
