<script setup lang="ts">
import { ref } from 'vue';
import type {
  EvacuationRouteSummary,
  HazardType,
  IncidentDraft,
  ShelterPlace,
} from '../types/hazard';
import { formatCardinalDirection } from '../services/weatherService';

const props = defineProps<{
  incidentDraft: IncidentDraft;
  hazardTypes: HazardType[];
  selectedHazardType: HazardType;
  reportConfirmation: string | null;
  totalIncidentCount: number;
  routeSummary: EvacuationRouteSummary | null;
  routeLoading: boolean;
  routeError: string | null;
  avoidFloodZones: boolean;
  shelters: ShelterPlace[];
  selectedShelterId: string | null;
  shelterQuery: string;
  searchingShelters: boolean;
  shelterError: string | null;
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedHazardType', value: HazardType): void;
  (e: 'submit-incident'): void;
  (e: 'update:avoidFloodZones', value: boolean): void;
  (e: 'update:shelterQuery', value: string): void;
  (e: 'search-shelters'): void;
  (e: 'route-to-shelter', shelter: ShelterPlace): void;
}>();

const localQuery = ref(props.shelterQuery);

function onSearchSubmit(): void {
  emit('update:shelterQuery', localQuery.value);
  emit('search-shelters');
}

function onHazardChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit('update:selectedHazardType', target.value as HazardType);
}

function onAvoidToggle(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:avoidFloodZones', target.checked);
}
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed-mobile': !mobileOpen }">
    <!-- [A] Civic Incident Reporter -->
    <section
      id="incident-report-panel"
      data-testid="incident-report-panel"
      class="panel-card"
    >
      <div class="panel-header">
        <h2 class="panel-title">Civic Incident Reporter</h2>
        <span class="step-badge">{{ totalIncidentCount }} Active Reports</span>
      </div>

      <p class="hint-text">
        Click anywhere on the Miami map to geotag an incident. Address, terrain elevation, and
        live storm conditions populate automatically.
      </p>

      <div class="telemetry-grid">
        <div class="telemetry-box full">
          <div class="telemetry-label">Reverse-Geocoded Location</div>
          <div class="telemetry-value">
            <template v-if="incidentDraft.loading">Resolving street address...</template>
            <template v-else>{{ incidentDraft.address }}</template>
          </div>
        </div>

        <div class="telemetry-box">
          <div class="telemetry-label">Coordinates</div>
          <div class="telemetry-value">
            {{ incidentDraft.lat.toFixed(4) }}, {{ incidentDraft.lng.toFixed(4) }}
          </div>
        </div>

        <div class="telemetry-box">
          <div class="telemetry-label">Terrain Elevation</div>
          <div class="telemetry-value">
            <template v-if="incidentDraft.loading">Sampling...</template>
            <template v-else-if="incidentDraft.elevationMeters !== null">
              {{ incidentDraft.elevationMeters.toFixed(2) }} m
              <span v-if="incidentDraft.elevationMeters < 2.2" style="color: #b91c1c">
                (Low)
              </span>
            </template>
            <template v-else>Unavailable</template>
          </div>
        </div>

        <div class="telemetry-box full">
          <div class="telemetry-label">Live Wind &amp; Precipitation (Weather API)</div>
          <div class="telemetry-value">
            <template v-if="incidentDraft.loading">Fetching local conditions...</template>
            <template v-else-if="incidentDraft.weather && incidentDraft.weather.status === 'live'">
              {{ incidentDraft.weather.conditionText }} • Wind
              {{
                incidentDraft.weather.windSpeedKmh !== null
                  ? `${Math.round(incidentDraft.weather.windSpeedKmh)} km/h`
                  : 'N/A'
              }}
              {{ formatCardinalDirection(incidentDraft.weather.windCardinal) }}
              <template v-if="incidentDraft.weather.windGustKmh !== null">
                (Gust {{ Math.round(incidentDraft.weather.windGustKmh) }} km/h)
              </template>
              • Precip
              {{
                incidentDraft.weather.precipProbabilityPct !== null
                  ? `${incidentDraft.weather.precipProbabilityPct}%`
                  : 'N/A'
              }}
              <template v-if="incidentDraft.weather.precipQpfMm !== null">
                ({{ incidentDraft.weather.precipQpfMm.toFixed(1) }} mm/h)
              </template>
            </template>
            <template v-else>
              {{ incidentDraft.weather?.note || 'Weather telemetry unavailable' }}
            </template>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label" for="incident-type-select">Observed Hazard Category</label>
        <select
          id="incident-type-select"
          data-testid="incident-type-select"
          class="select-input"
          :value="selectedHazardType"
          @change="onHazardChange"
        >
          <option v-for="hazard in hazardTypes" :key="hazard" :value="hazard">
            {{ hazard }}
          </option>
        </select>
      </div>

      <button
        id="incident-submit-btn"
        data-testid="incident-submit-btn"
        type="button"
        class="btn-danger"
        :disabled="incidentDraft.loading"
        @click="emit('submit-incident')"
      >
        Log Hazard Report
      </button>

      <div v-if="reportConfirmation" class="feedback-banner">
        {{ reportConfirmation }}
      </div>
      <div v-if="incidentDraft.error" class="error-banner">
        {{ incidentDraft.error }}
      </div>
    </section>

    <!-- [B] Safe Shelter Evacuation Route Summary -->
    <section
      id="route-summary-card"
      data-testid="route-summary-card"
      class="panel-card"
    >
      <div class="panel-header">
        <h2 class="panel-title">Safe Shelter Evacuation Route</h2>
        <span
          class="step-badge"
          :class="routeSummary?.avoidedFloodZones ? 'success' : 'warning'"
        >
          {{ routeSummary ? (routeSummary.detourApplied ? 'Detour Active' : 'Active') : 'Standby' }}
        </span>
      </div>

      <label class="toggle-row" for="avoid-flood-toggle">
        <span>Avoid Active Flood-Hazard Zones</span>
        <input
          id="avoid-flood-toggle"
          data-testid="avoid-flood-toggle"
          type="checkbox"
          :checked="avoidFloodZones"
          @change="onAvoidToggle"
        />
      </label>

      <div v-if="routeLoading" class="hint-text">
        Computing flood-safe evacuation corridor via Routes API...
      </div>

      <template v-else-if="routeSummary">
        <div class="telemetry-box" style="margin-bottom: 8px">
          <div class="telemetry-label">Destination Shelter</div>
          <div class="telemetry-value">{{ routeSummary.shelterName }}</div>
        </div>

        <div class="route-metrics">
          <div class="metric-chip">
            <div class="metric-chip-label">Est. Drive ETA</div>
            <div class="metric-chip-val">{{ routeSummary.durationText }}</div>
          </div>
          <div class="metric-chip">
            <div class="metric-chip-label">Distance</div>
            <div class="metric-chip-val">{{ routeSummary.distanceText }}</div>
          </div>
        </div>

        <div
          class="bypass-badge"
          :class="routeSummary.avoidedFloodZones ? 'safe' : 'warn'"
        >
          <span>{{ routeSummary.avoidedFloodZones ? '✓' : '!' }}</span>
          <span>{{ routeSummary.statusMessage }}</span>
        </div>
      </template>

      <p v-else class="hint-text" style="margin-bottom: 0">
        Click <strong>Find Safe Shelter</strong> or select a facility below to calculate an
        evacuation route avoiding active flood polygons.
      </p>

      <div v-if="routeError" class="error-banner">
        {{ routeError }}
      </div>
    </section>

    <!-- [C] Live Nearby Emergency Shelters List -->
    <section class="panel-card">
      <div class="panel-header">
        <h2 class="panel-title">Nearby Emergency Shelters</h2>
        <span class="step-badge success">{{ shelters.length }} Found</span>
      </div>

      <form class="search-bar" @submit.prevent="onSearchSubmit">
        <input
          id="shelter-search-input"
          data-testid="shelter-search-input"
          v-model="localQuery"
          type="text"
          class="text-input"
          placeholder="Search hospitals or shelters in Miami..."
          aria-label="Search emergency shelters"
        />
        <button type="submit" class="btn-secondary" :disabled="searchingShelters">
          Search
        </button>
      </form>

      <div v-if="shelterError" class="error-banner" style="margin-bottom: 8px">
        {{ shelterError }}
      </div>

      <div id="shelter-list" data-testid="shelter-list" class="shelter-items">
        <div v-if="searchingShelters" class="hint-text">
          Querying Places API (New) for Miami hospitals &amp; community centers...
        </div>

        <div
          v-else-if="shelters.length === 0"
          class="hint-text"
        >
          No shelters loaded yet. Click <strong>Find Safe Shelter</strong> to query nearby
          facilities.
        </div>

        <div
          v-for="shelter in shelters"
          :key="shelter.id"
          class="shelter-item"
          :class="{ selected: shelter.id === selectedShelterId }"
        >
          <div class="shelter-item-top">
            <div class="shelter-name">{{ shelter.displayName }}</div>
            <div v-if="shelter.distanceKm !== undefined" class="shelter-dist">
              {{ shelter.distanceKm.toFixed(1) }} km
            </div>
          </div>

          <div class="shelter-addr">{{ shelter.formattedAddress }}</div>

          <div class="shelter-footer">
            <div class="shelter-meta">
              <template v-if="shelter.rating !== null">
                ★ {{ shelter.rating.toFixed(1) }}
                <template v-if="shelter.userRatingCount !== null">
                  ({{ shelter.userRatingCount }})
                </template>
              </template>
              <template v-else>Miami Civic Facility</template>
            </div>
            <button
              type="button"
              class="btn-route"
              @click="emit('route-to-shelter', shelter)"
            >
              Route Here
            </button>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>
