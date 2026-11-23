<script setup lang="ts">
import {
  Activity,
  Building2,
  MapPin,
  Mountain,
  RefreshCw,
  RotateCcw,
} from 'lucide-vue-next';
import { getDistrictCapacityColor } from '../data/nycSpatialData';
import type {
  CivicHub,
  DistrictFeature,
  ElevationStats,
  ZoneAnalytics,
} from '../types/gis';

defineProps<{
  zoneAnalytics: ZoneAnalytics;
  elevationStats: ElevationStats;
  districts: DistrictFeature[];
  selectedDistrictId: string | null;
  civicHubs: CivicHub[];
  civicHubsLoading: boolean;
  civicHubsError: string | null;
  activeHubId: string | null;
  hasApiKey: boolean;
}>();

const emit = defineEmits<{
  (e: 'select:district', districtId: string | null): void;
  (e: 'sample:elevation'): void;
  (e: 'focus:hub', hub: CivicHub): void;
}>();
</script>

<template>
  <aside class="analytics-sidebar">
    <!-- 1. Zone Analytics KPI Card -->
    <section class="panel-card" data-testid="zone-analytics-panel">
      <div class="panel-header">
        <div class="panel-title-row">
          <Activity :size="15" class="accent-icon" />
          <h2>Zone Analytics</h2>
        </div>
        <span class="scope-badge" :class="zoneAnalytics.scope.toLowerCase().replace(/\s+/g, '-')">
          {{ zoneAnalytics.scope }}
        </span>
      </div>

      <p class="panel-sublabel">{{ zoneAnalytics.label }}</p>

      <div class="kpi-grid">
        <div class="kpi-box">
          <span class="kpi-label">Active Sensors</span>
          <span class="kpi-value">{{ zoneAnalytics.sensorCount.toLocaleString() }}</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Study Area</span>
          <span class="kpi-value">{{ zoneAnalytics.areaKm2.toFixed(2) }} <small>km²</small></span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Avg Capacity</span>
          <span class="kpi-value">{{ zoneAnalytics.avgLoadPct.toFixed(1) }}<small>%</small></span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">Peak Load</span>
          <span
            class="kpi-value"
            :style="{ color: getDistrictCapacityColor(zoneAnalytics.peakLoadPct) }"
          >
            {{ zoneAnalytics.peakLoadPct }}<small>%</small>
          </span>
        </div>
      </div>
    </section>

    <!-- 2. Terrain Elevation Inspector -->
    <section class="panel-card" data-testid="elevation-inspector-card">
      <div class="panel-header">
        <div class="panel-title-row">
          <Mountain :size="15" class="accent-icon" />
          <h2>Terrain Elevation</h2>
        </div>
        <button
          type="button"
          class="action-chip-btn"
          data-testid="sample-elevation-btn"
          :disabled="elevationStats.loading || !hasApiKey"
          @click="emit('sample:elevation')"
        >
          <RefreshCw :size="12" :class="{ spin: elevationStats.loading }" />
          <span>{{ elevationStats.loading ? 'Sampling...' : 'Sample' }}</span>
        </button>
      </div>

      <p class="panel-sublabel">
        Scope: {{ elevationStats.sourceLabel }}
        <span v-if="elevationStats.sampleCount > 0">
          ({{ elevationStats.sampleCount }} pts)
        </span>
      </p>

      <div v-if="elevationStats.error" class="panel-note">
        {{ elevationStats.error }}
      </div>

      <div v-else class="elevation-grid">
        <div class="elev-stat">
          <span class="kpi-label">Min</span>
          <span class="kpi-value">
            {{ elevationStats.minMeters !== null ? `${elevationStats.minMeters} m` : '—' }}
          </span>
        </div>
        <div class="elev-stat">
          <span class="kpi-label">Mean</span>
          <span class="kpi-value accent-text">
            {{ elevationStats.meanMeters !== null ? `${elevationStats.meanMeters} m` : '—' }}
          </span>
        </div>
        <div class="elev-stat">
          <span class="kpi-label">Max</span>
          <span class="kpi-value">
            {{ elevationStats.maxMeters !== null ? `${elevationStats.maxMeters} m` : '—' }}
          </span>
        </div>
        <div class="elev-stat">
          <span class="kpi-label">Resolution</span>
          <span class="kpi-value">
            {{ elevationStats.resolutionMeters !== null ? `${elevationStats.resolutionMeters} m` : '—' }}
          </span>
        </div>
      </div>
    </section>

    <!-- 3. NYC District Capacity Directory -->
    <section class="panel-card" data-testid="district-selector-list">
      <div class="panel-header">
        <div class="panel-title-row">
          <Building2 :size="15" class="accent-icon" />
          <h2>NYC Districts ({{ districts.length }})</h2>
        </div>
        <button
          v-if="selectedDistrictId"
          type="button"
          class="action-chip-btn"
          @click="emit('select:district', null)"
        >
          <RotateCcw :size="12" />
          <span>Citywide</span>
        </button>
      </div>

      <div class="district-list">
        <button
          v-for="district in districts"
          :key="district.properties.id"
          type="button"
          class="district-item"
          :class="{ selected: selectedDistrictId === district.properties.id }"
          :data-district-id="district.properties.id"
          @click="emit('select:district', district.properties.id)"
        >
          <div class="district-item-top">
            <span class="district-name">{{ district.properties.name }}</span>
            <span
              class="capacity-pill"
              :style="{
                backgroundColor: `${getDistrictCapacityColor(district.properties.capacityPct)}22`,
                color: getDistrictCapacityColor(district.properties.capacityPct),
                borderColor: `${getDistrictCapacityColor(district.properties.capacityPct)}55`,
              }"
            >
              {{ district.properties.capacityPct }}%
            </span>
          </div>
          <div class="district-item-meta">
            <span>{{ district.properties.borough }}</span>
            <span>{{ district.properties.capacityMw }} MW · {{ district.properties.substationCount }} nodes</span>
          </div>
        </button>
      </div>
    </section>

    <!-- 4. Live NYC Civic Reference Hubs -->
    <section class="panel-card" data-testid="live-places-panel">
      <div class="panel-header">
        <div class="panel-title-row">
          <MapPin :size="15" class="accent-icon" />
          <h2>Civic Reference Hubs</h2>
        </div>
        <span class="source-tag">Places API (New)</span>
      </div>

      <div v-if="!hasApiKey" class="panel-note">
        Add <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load live NYC civic transit hubs via <code>Place.searchByText</code>.
      </div>
      <div v-else-if="civicHubsLoading" class="panel-note">
        Querying live civic transit hubs around Manhattan &amp; Brooklyn...
      </div>
      <div v-else-if="civicHubsError" class="panel-note">
        {{ civicHubsError }}
      </div>
      <div v-else-if="civicHubs.length === 0" class="panel-note">
        No live civic reference hubs returned for the active area.
      </div>
      <div v-else class="hub-list">
        <button
          v-for="(hub, idx) in civicHubs"
          :key="hub.id"
          type="button"
          class="hub-item"
          :class="{ selected: activeHubId === hub.id }"
          @click="emit('focus:hub', hub)"
        >
          <span class="hub-index">{{ idx + 1 }}</span>
          <div class="hub-body">
            <span class="hub-title">{{ hub.displayName }}</span>
            <span class="hub-address">{{ hub.formattedAddress }}</span>
          </div>
        </button>
      </div>
    </section>
  </aside>
</template>
