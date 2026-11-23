<script setup lang="ts">
import { computed } from 'vue';
import {
  DAY_COLORS,
  type ComputedRouteResult,
  type DayId,
  type ItineraryStop,
  type TravelModeKey,
} from '../types/itinerary';

const props = defineProps<{
  activeDay: DayId;
  day1Count: number;
  day2Count: number;
  stops: ItineraryStop[];
  travelMode: TravelModeKey;
  routeResult: ComputedRouteResult | null;
  routeLoading: boolean;
  selectedStopId: string | null;
}>();

const emit = defineEmits<{
  (e: 'change-day', day: DayId): void;
  (e: 'change-travel-mode', mode: TravelModeKey): void;
  (e: 'optimize-route'): void;
  (e: 'select-stop', stop: ItineraryStop): void;
  (e: 'move-stop', uid: string, direction: 'up' | 'down'): void;
  (e: 'remove-stop', uid: string): void;
}>();

const dayTheme = computed(() => DAY_COLORS[props.activeDay]);

function handleModeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('change-travel-mode', target.value as TravelModeKey);
}
</script>

<template>
  <section class="itinerary-section">
    <div class="section-header-row">
      <h2 class="section-title">Multi-Day Itinerary</h2>
      <div class="day-tabs" data-testid="itinerary-day-tabs" role="tablist" aria-label="Itinerary days">
        <button
          type="button"
          role="tab"
          :aria-selected="activeDay === 1"
          class="day-tab"
          :class="{ active: activeDay === 1 }"
          :style="activeDay === 1 ? { backgroundColor: DAY_COLORS[1].primary, borderColor: DAY_COLORS[1].primary } : {}"
          @click="emit('change-day', 1)"
        >
          <span class="day-dot" :style="{ backgroundColor: activeDay === 1 ? '#ffffff' : DAY_COLORS[1].primary }"></span>
          Day 1
          <span class="day-count">{{ day1Count }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeDay === 2"
          class="day-tab"
          :class="{ active: activeDay === 2 }"
          :style="activeDay === 2 ? { backgroundColor: DAY_COLORS[2].primary, borderColor: DAY_COLORS[2].primary } : {}"
          @click="emit('change-day', 2)"
        >
          <span class="day-dot" :style="{ backgroundColor: activeDay === 2 ? '#ffffff' : DAY_COLORS[2].primary }"></span>
          Day 2
          <span class="day-count">{{ day2Count }}</span>
        </button>
      </div>
    </div>

    <div class="route-toolbar">
      <div class="mode-wrap">
        <label for="travel-mode-select" class="toolbar-label">Mode</label>
        <select
          id="travel-mode-select"
          data-testid="travel-mode-select"
          class="mode-select"
          :value="travelMode"
          @change="handleModeChange"
        >
          <option value="DRIVE">Drive</option>
          <option value="WALK">Walk</option>
          <option value="TRANSIT">Transit</option>
        </select>
      </div>

      <button
        type="button"
        data-testid="optimize-route-btn"
        class="optimize-btn"
        :disabled="stops.length < 3 || routeLoading"
        :title="stops.length < 3 ? 'Add at least 3 stops to optimize waypoint order' : 'Optimize intermediate stop order via Routes API'"
        @click="emit('optimize-route')"
      >
        {{ routeLoading ? 'Computing...' : 'Optimize Order' }}
      </button>
    </div>

    <div class="route-summary-bar" data-testid="route-summary-bar" :style="{ borderLeftColor: dayTheme.primary }">
      <div class="summary-stats">
        <span class="stat-pill" :style="{ backgroundColor: dayTheme.light, color: dayTheme.border }">
          {{ stops.length }} {{ stops.length === 1 ? 'stop' : 'stops' }}
        </span>
        <template v-if="routeLoading">
          <span class="summary-text">Calculating route...</span>
        </template>
        <template v-else-if="routeResult && stops.length >= 2">
          <span class="summary-metric">{{ routeResult.distanceText }}</span>
          <span class="summary-sep">&bull;</span>
          <span class="summary-metric">{{ routeResult.durationText }}</span>
        </template>
        <template v-else>
          <span class="summary-text">Add 2+ stops for route polyline</span>
        </template>
      </div>
      <p v-if="routeResult?.notice" class="route-notice">{{ routeResult.notice }}</p>
    </div>

    <ol class="stops-list" data-testid="itinerary-stops-list">
      <li v-if="stops.length === 0" class="empty-stops">
        No stops scheduled for Day {{ activeDay }} yet. Add attractions, restaurants, or hotels below.
      </li>

      <li
        v-for="(stop, index) in stops"
        :key="stop.uid"
        class="stop-card"
        :class="{ selected: selectedStopId === stop.place.id }"
        @click="emit('select-stop', stop)"
      >
        <div
          class="stop-number"
          :style="{ backgroundColor: dayTheme.primary }"
        >
          {{ index + 1 }}
        </div>

        <div class="stop-body">
          <div class="stop-name">{{ stop.place.displayName }}</div>
          <div class="stop-meta">
            <span v-if="stop.place.primaryTypeDisplayName">{{ stop.place.primaryTypeDisplayName }}</span>
            <span v-if="stop.place.rating !== null"> &middot; &#9733; {{ stop.place.rating.toFixed(1) }}</span>
          </div>
          <div
            v-if="routeResult && routeResult.legs[index]"
            class="leg-chip"
          >
            Next leg: {{ routeResult.legs[index].distanceText }} &middot; {{ routeResult.legs[index].durationText }}
          </div>
        </div>

        <div class="stop-actions" @click.stop>
          <button
            type="button"
            class="icon-btn"
            title="Move up"
            :disabled="index === 0"
            @click="emit('move-stop', stop.uid, 'up')"
          >
            &uarr;
          </button>
          <button
            type="button"
            class="icon-btn"
            title="Move down"
            :disabled="index === stops.length - 1"
            @click="emit('move-stop', stop.uid, 'down')"
          >
            &darr;
          </button>
          <button
            type="button"
            class="icon-btn remove"
            title="Remove stop"
            @click="emit('remove-stop', stop.uid)"
          >
            &times;
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.itinerary-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.day-tabs {
  display: flex;
  gap: 6px;
}

.day-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-tab.active {
  color: #ffffff;
}

.day-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.day-count {
  font-size: 0.72rem;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.14);
}

.day-tab.active .day-count {
  background: rgba(255, 255, 255, 0.25);
}

.route-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mode-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.mode-select {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.8rem;
  font-weight: 500;
}

.optimize-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #0f766e;
  background: #f0fdfa;
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.optimize-btn:hover:not(:disabled) {
  background: #0f766e;
  color: #ffffff;
}

.optimize-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.route-summary-bar {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
}

.summary-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.summary-metric {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
}

.summary-sep {
  color: #94a3b8;
}

.summary-text {
  font-size: 0.78rem;
  color: #64748b;
}

.route-notice {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: #475569;
}

.stops-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.empty-stops {
  padding: 12px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.stop-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.stop-card:hover {
  border-color: #94a3b8;
}

.stop-card.selected {
  border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.12);
}

.stop-number {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.stop-body {
  flex: 1;
  min-width: 0;
}

.stop-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.25;
}

.stop-meta {
  font-size: 0.74rem;
  color: #64748b;
  margin-top: 2px;
}

.leg-chip {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.7rem;
  font-weight: 500;
}

.stop-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 0.82rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.icon-btn.remove:hover:not(:disabled) {
  background: #fee2e2;
  color: #b91c1c;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
