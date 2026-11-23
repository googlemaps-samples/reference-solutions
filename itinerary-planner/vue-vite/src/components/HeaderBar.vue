<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CityPreset, TimeZoneInfo } from '../types/itinerary';
import { formatDestinationLocalTime } from '../services/timezoneService';

const props = defineProps<{
  cityName: string;
  selectedPresetId: string;
  presets: CityPreset[];
  timeZoneInfo: TimeZoneInfo;
  mapsReady: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-preset', presetId: string): void;
  (e: 'select-autocomplete-place', place: google.maps.places.Place): void;
}>();

const nowMs = ref<number>(Date.now());
let timerId: number | null = null;

onMounted(() => {
  timerId = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerId !== null) {
    window.clearInterval(timerId);
  }
});

const localClock = computed(() =>
  formatDestinationLocalTime(props.timeZoneInfo.totalOffsetMinutes, nowMs.value)
);

function handlePresetChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('select-preset', target.value);
}

async function handleGmpSelect(event: Event) {
  const selectEvent = event as unknown as google.maps.places.PlacePredictionSelectEvent;
  const prediction = selectEvent.placePrediction;
  if (!prediction) return;
  const place = prediction.toPlace();
  emit('select-autocomplete-place', place);
}
</script>

<template>
  <header class="top-header">
    <div class="brand-group">
      <div class="brand-mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      </div>
      <div>
        <h1 class="brand-title">Multi-Day Trip Itinerary Planner</h1>
        <p class="brand-subtitle">Hotels, Attractions &amp; Time Zone Hub &middot; {{ cityName }}</p>
      </div>
    </div>

    <div class="header-controls">
      <div class="search-box-wrap">
        <gmp-place-autocomplete
          data-testid="destination-search-input"
          class="destination-autocomplete"
          placeholder="Search city or landmark..."
          internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
          @gmp-select="handleGmpSelect"
        ></gmp-place-autocomplete>
      </div>

      <div class="preset-select-wrap">
        <label class="sr-only" for="destination-quick-select">Quick destination</label>
        <select
          id="destination-quick-select"
          data-testid="destination-quick-select"
          class="preset-select"
          :value="selectedPresetId"
          @change="handlePresetChange"
        >
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}, {{ preset.country }}
          </option>
          <option v-if="selectedPresetId === 'custom'" value="custom">
            {{ cityName }} (Custom)
          </option>
        </select>
      </div>

      <div class="timezone-hub" data-testid="timezone-hub" :title="`Time Zone ID: ${timeZoneInfo.timeZoneId}`">
        <div class="tz-dot" aria-hidden="true"></div>
        <div class="tz-details">
          <div class="tz-time-row">
            <span class="tz-clock">{{ localClock.timeString }}</span>
            <span class="tz-offset">{{ timeZoneInfo.utcOffsetLabel }}</span>
          </div>
          <div class="tz-meta">
            {{ localClock.dateString }} &middot; {{ timeZoneInfo.timeZoneName }}
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.16);
  z-index: 20;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #ffffff;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  white-space: nowrap;
}

.brand-subtitle {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box-wrap {
  width: 280px;
  max-width: 100%;
}

.destination-autocomplete {
  display: block;
  width: 100%;
  background-color: #ffffff;
  color: #0f172a;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  min-height: 38px;
  color-scheme: light;
}

.preset-select {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.preset-select option {
  background: #0f172a;
  color: #f8fafc;
}

.timezone-hub {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.22);
  border: 1px solid rgba(45, 212, 191, 0.4);
  flex-shrink: 0;
}

.tz-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2dd4bf;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.25);
}

.tz-details {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.tz-time-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.tz-clock {
  font-variant-numeric: tabular-nums;
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
}

.tz-offset {
  font-size: 0.72rem;
  font-weight: 700;
  color: #5eead4;
  background: rgba(15, 23, 42, 0.45);
  padding: 1px 6px;
  border-radius: 4px;
}

.tz-meta {
  font-size: 0.7rem;
  color: #cbd5e1;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 1080px) {
  .top-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-controls {
    justify-content: space-between;
  }
  .search-box-wrap {
    flex: 1 1 220px;
  }
}
</style>
