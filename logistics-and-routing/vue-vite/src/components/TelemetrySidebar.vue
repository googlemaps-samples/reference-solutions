<script setup lang="ts">
import type {
  DispatchRouteSummary,
  FleetVehicle,
  LogisticsHub,
  RouteMatrixEntry,
  SnapToRoadsResult,
} from '../types/logistics';

defineProps<{
  vehicles: FleetVehicle[];
  selectedVehicleId: string;
  snapResult: SnapToRoadsResult | null;
  showSnappedOverlay: boolean;
  isSnapping: boolean;
  depot: LogisticsHub | null;
  stops: LogisticsHub[];
  optimizeOrder: boolean;
  isComputingRoute: boolean;
  dispatchRoute: DispatchRouteSummary | null;
  matrixEntries: RouteMatrixEntry[];
  hubLoadNote: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-vehicle', vehicleId: string): void;
  (e: 'toggle-snap-overlay'): void;
  (e: 'resnap-vehicle'): void;
  (e: 'update:optimizeOrder', value: boolean): void;
  (e: 'compute-dispatch'): void;
  (e: 'remove-stop', hubId: string): void;
}>();

function statusClass(status: FleetVehicle['status']): string {
  if (status === 'En Route') return 'badge-en-route';
  if (status === 'Delayed') return 'badge-delayed';
  return 'badge-idle';
}
</script>

<template>
  <aside class="telemetry-sidebar">
    <!-- Section 1: Active Fleet Telemetry Cards -->
    <section class="panel-section">
      <div class="section-header">
        <h2>Active Fleet Telemetry</h2>
        <span class="section-meta">{{ vehicles.length }} units shown</span>
      </div>

      <div data-testid="fleet-vehicle-list" class="vehicle-list">
        <button
          v-for="vehicle in vehicles"
          :key="vehicle.id"
          type="button"
          class="vehicle-card"
          :class="{ selected: vehicle.id === selectedVehicleId }"
          @click="emit('select-vehicle', vehicle.id)"
        >
          <div class="vehicle-card-top">
            <div class="vehicle-identity">
              <span class="vehicle-callsign">{{ vehicle.callsign }}</span>
              <span class="vehicle-class">{{ vehicle.vehicleClass }}</span>
            </div>
            <span class="status-badge" :class="statusClass(vehicle.status)">
              {{ vehicle.status }}
            </span>
          </div>

          <div class="vehicle-telemetry-grid">
            <div class="metric-cell">
              <span class="metric-label">Speed</span>
              <span class="metric-value">{{ vehicle.speedMph }} mph</span>
            </div>
            <div class="metric-cell">
              <span class="metric-label">ETA</span>
              <span class="metric-value">{{ vehicle.etaText }}</span>
            </div>
            <div class="metric-cell">
              <span class="metric-label">Corridor</span>
              <span class="metric-value truncate">{{ vehicle.corridor }}</span>
            </div>
          </div>

          <div class="vehicle-next-stop">
            <span class="next-label">Next Stop:</span>
            <span class="next-name">{{ vehicle.nextStopName }}</span>
            <span v-if="vehicle.distanceText !== '--'" class="next-dist">
              ({{ vehicle.distanceText }})
            </span>
          </div>
        </button>

        <div v-if="vehicles.length === 0" class="empty-state">
          No vehicles match the active status filter.
        </div>
      </div>
    </section>

    <!-- Section 2: GPS Trace & Roads API Inspector -->
    <section data-testid="raw-vs-snapped-panel" class="panel-section">
      <div class="section-header">
        <h2>GPS Trace &amp; Roads API</h2>
        <button
          type="button"
          data-testid="snap-to-roads-toggle"
          class="toggle-chip"
          :class="{ active: showSnappedOverlay }"
          :aria-pressed="showSnappedOverlay"
          @click="emit('toggle-snap-overlay')"
        >
          {{ showSnappedOverlay ? 'Snapped Path: ON' : 'Snapped Path: OFF' }}
        </button>
      </div>

      <div v-if="snapResult" class="roads-inspector">
        <div class="trace-legend-row">
          <span class="trace-pill raw">Dashed: Raw GPS ({{ snapResult.rawPoints.length }} pts)</span>
          <span class="trace-pill snapped">
            Solid: Road-Snapped ({{ snapResult.snappedPoints.length }} pts)
          </span>
        </div>

        <div class="inspector-metrics">
          <div class="inspector-stat">
            <span class="stat-label">Raw Points</span>
            <span class="stat-val">{{ snapResult.rawPoints.length }}</span>
          </div>
          <div class="inspector-stat">
            <span class="stat-label">Snapped Points</span>
            <span class="stat-val">{{ snapResult.snappedPoints.length }}</span>
          </div>
          <div class="inspector-stat">
            <span class="stat-label">Road Segments</span>
            <span class="stat-val">
              {{
                snapResult.roadSegmentPlaceIds.length > 0
                  ? snapResult.roadSegmentPlaceIds.length
                  : 'Corridor'
              }}
            </span>
          </div>
          <div class="inspector-stat">
            <span class="stat-label">Mean Snap Offset</span>
            <span class="stat-val">{{ snapResult.meanOffsetMeters }} m</span>
          </div>
        </div>

        <div class="inspector-footer">
          <span class="source-tag" :class="snapResult.source">
            {{
              snapResult.source === 'roads-api'
                ? 'Roads API v1/snapToRoads'
                : 'Route Corridor Fallback'
            }}
          </span>
          <button
            type="button"
            class="secondary-btn"
            :disabled="isSnapping"
            @click="emit('resnap-vehicle')"
          >
            {{ isSnapping ? 'Snapping...' : 'Re-Snap Trace' }}
          </button>
        </div>

        <p v-if="snapResult.warningMessage" class="inspector-note">
          {{ snapResult.warningMessage }}
        </p>
      </div>
      <div v-else class="empty-state">
        {{ isSnapping ? 'Snapping GPS trace to Dallas roads...' : 'Select a vehicle to inspect GPS snapping.' }}
      </div>
    </section>

    <!-- Section 3: Multi-Stop Dispatch & Route Matrix -->
    <section data-testid="dispatch-matrix-panel" class="panel-section">
      <div class="section-header">
        <h2>Multi-Stop Dispatch &amp; Matrix</h2>
        <span class="section-meta">{{ stops.length }} drop-offs</span>
      </div>

      <p v-if="hubLoadNote" class="inspector-note">{{ hubLoadNote }}</p>

      <div v-if="depot" class="dispatch-depot-box">
        <span class="hub-badge depot">DEPOT</span>
        <div class="hub-copy">
          <div class="hub-name">{{ depot.name }}</div>
          <div class="hub-address">{{ depot.address }}</div>
        </div>
      </div>

      <div class="stop-sequence">
        <div v-for="(stop, idx) in stops" :key="stop.id" class="stop-row">
          <span class="hub-badge stop">{{ idx + 1 }}</span>
          <div class="hub-copy">
            <div class="hub-name">{{ stop.name }}</div>
            <div class="hub-address">{{ stop.address }}</div>
          </div>
          <button
            v-if="stops.length > 1"
            type="button"
            class="remove-stop-btn"
            title="Remove stop"
            @click="emit('remove-stop', stop.id)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="dispatch-controls">
        <label class="optimize-label">
          <input
            type="checkbox"
            data-testid="optimize-waypoints-toggle"
            :checked="optimizeOrder"
            @change="
              emit(
                'update:optimizeOrder',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span>Optimize Stop Order (TSP)</span>
        </label>

        <button
          type="button"
          data-testid="calculate-dispatch-route-btn"
          class="primary-btn"
          :disabled="isComputingRoute || !depot || stops.length === 0"
          @click="emit('compute-dispatch')"
        >
          {{ isComputingRoute ? 'Computing...' : 'Compute Dispatch' }}
        </button>
      </div>

      <div v-if="dispatchRoute" class="route-summary-box">
        <div class="route-totals">
          <div>
            <span class="metric-label">Total Corridor</span>
            <strong class="total-val">{{ dispatchRoute.totalDistanceText }}</strong>
          </div>
          <div>
            <span class="metric-label">Traffic-Aware ETA</span>
            <strong class="total-val">{{ dispatchRoute.totalDurationText }}</strong>
          </div>
        </div>

        <div class="legs-list">
          <div v-for="leg in dispatchRoute.legs" :key="leg.legIndex" class="leg-row">
            <span class="leg-index">L{{ leg.legIndex }}</span>
            <span class="leg-route">{{ leg.toName }}</span>
            <span class="leg-metrics">{{ leg.durationText }} · {{ leg.distanceText }}</span>
          </div>
        </div>
      </div>

      <div v-if="matrixEntries.length > 0" class="matrix-table-wrap">
        <div class="matrix-title">Hub-to-Stop Route Matrix (Routes API)</div>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>Origin</th>
              <th>Drop-Off Hub</th>
              <th>ETA</th>
              <th>Dist</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in matrixEntries"
              :key="`${entry.originId}-${entry.destinationId}`"
            >
              <td class="mono-cell">{{ entry.originLabel }}</td>
              <td class="truncate-cell" :title="entry.destinationName">
                {{ entry.destinationName }}
              </td>
              <td class="eta-cell">{{ entry.durationText }}</td>
              <td>{{ entry.distanceText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </aside>
</template>
