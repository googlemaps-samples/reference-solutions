<script setup lang="ts">
import { computed, ref } from 'vue';
import TopCommandBar from './components/TopCommandBar.vue';
import TelemetrySidebar from './components/TelemetrySidebar.vue';
import FleetMapCanvas from './components/FleetMapCanvas.vue';
import { INITIAL_FLEET_VEHICLES } from './data/dallasFleet';
import { getApiKey } from './services/mapsLoader';
import {
  computeDispatchMatrix,
  computeMultiStopDispatchRoute,
  discoverDallasLogisticsHubs,
} from './services/dispatchService';
import { snapVehicleTraceToRoads } from './services/roadsService';
import type {
  DispatchRouteSummary,
  FleetVehicle,
  LogisticsHub,
  RouteMatrixEntry,
  SnapToRoadsResult,
  StatusFilter,
} from './types/logistics';

const apiKey = getApiKey();
const mapsReady = ref(false);
const mapError = ref<string | null>(
  apiKey
    ? null
    : 'VITE_GOOGLE_MAPS_API_KEY is not set. Add your key to .env.local to load live Google Maps Platform data.',
);

const vehicles = ref<FleetVehicle[]>(
  INITIAL_FLEET_VEHICLES.map((v) => ({ ...v, rawGpsTrace: [...v.rawGpsTrace] })),
);
const activeFilter = ref<StatusFilter>('All');
const selectedVehicleId = ref<string>(INITIAL_FLEET_VEHICLES[0].id);
const trafficEnabled = ref<boolean>(false);

const depot = ref<LogisticsHub | null>(null);
const stops = ref<LogisticsHub[]>([]);
const hubLoadNote = ref<string | null>(null);

const snapResult = ref<SnapToRoadsResult | null>(null);
const showSnappedOverlay = ref<boolean>(true);
const isSnapping = ref<boolean>(false);

const optimizeOrder = ref<boolean>(false);
const isComputingRoute = ref<boolean>(false);
const dispatchRoute = ref<DispatchRouteSummary | null>(null);
const matrixEntries = ref<RouteMatrixEntry[]>([]);

const statusCounts = computed(() => {
  const all = vehicles.value.length;
  const enRoute = vehicles.value.filter((v) => v.status === 'En Route').length;
  const delayed = vehicles.value.filter((v) => v.status === 'Delayed').length;
  const idle = vehicles.value.filter((v) => v.status === 'Idle').length;
  return { all, enRoute, delayed, idle };
});

const filteredVehicles = computed(() => {
  if (activeFilter.value === 'All') {
    return vehicles.value;
  }
  return vehicles.value.filter((v) => v.status === activeFilter.value);
});

async function runSnapForVehicle(vehicleId: string) {
  const target = vehicles.value.find((v) => v.id === vehicleId);
  if (!target || !mapsReady.value) return;

  isSnapping.value = true;
  try {
    snapResult.value = await snapVehicleTraceToRoads(
      target.id,
      target.rawGpsTrace,
    );
  } finally {
    isSnapping.value = false;
  }
}

async function computeDispatchAndMatrix() {
  if (!depot.value || stops.value.length === 0 || !mapsReady.value) {
    return;
  }

  isComputingRoute.value = true;
  try {
    const activeVehicles = vehicles.value.filter((v) => v.status !== 'Idle');
    const matrixOrigins = [
      {
        id: depot.value.id,
        label: 'Central Depot',
        location: depot.value.location,
      },
      ...activeVehicles.slice(0, 3).map((v) => ({
        id: v.id,
        label: v.callsign,
        location: v.position,
      })),
    ];

    const [routeSummary, matrix] = await Promise.all([
      computeMultiStopDispatchRoute(
        depot.value,
        stops.value,
        optimizeOrder.value,
      ),
      computeDispatchMatrix(matrixOrigins, stops.value),
    ]);

    dispatchRoute.value = routeSummary;
    matrixEntries.value = matrix;

    // Update active vehicles' live next-stop ETAs & distances from RouteMatrix
    vehicles.value = vehicles.value.map((veh, idx) => {
      if (veh.status === 'Idle') {
        return veh;
      }
      const assignedStop = stops.value[idx % stops.value.length];
      if (!assignedStop) return veh;

      const match = matrix.find(
        (m) => m.originId === veh.id && m.destinationId === assignedStop.id,
      );
      return {
        ...veh,
        nextStopHubId: assignedStop.id,
        nextStopName: assignedStop.name,
        etaText: match?.durationText ?? veh.etaText,
        distanceText: match?.distanceText ?? veh.distanceText,
      };
    });
  } catch (err) {
    hubLoadNote.value =
      err instanceof Error
        ? `Routes API notice: ${err.message}`
        : 'Unable to compute dispatch route.';
  } finally {
    isComputingRoute.value = false;
  }
}

async function handleMapReady() {
  mapsReady.value = true;
  mapError.value = null;

  // Kick off vehicle GPS road-snapping immediately in parallel with hub discovery
  const snapPromise = runSnapForVehicle(selectedVehicleId.value);

  try {
    const hubs = await discoverDallasLogisticsHubs();
    if (hubs.length >= 2) {
      depot.value = hubs[0];
      stops.value = hubs.slice(1, 4);
      hubLoadNote.value = null;
      await computeDispatchAndMatrix();
    } else {
      hubLoadNote.value =
        'Fewer than 2 logistics hubs returned by Places Search. Use the search bar above to add stops.';
    }
  } catch (err) {
    hubLoadNote.value =
      err instanceof Error
        ? `Places API notice: ${err.message}`
        : 'Could not query Dallas logistics hubs.';
  }

  await snapPromise;
}

function handleMapError(message: string) {
  mapError.value = message;
}

function handleSelectVehicle(vehicleId: string) {
  selectedVehicleId.value = vehicleId;
  void runSnapForVehicle(vehicleId);
}

function handlePlaceSelected(hub: LogisticsHub) {
  if (!depot.value) {
    depot.value = { ...hub, role: 'depot' };
    return;
  }
  const exists =
    depot.value.placeId === hub.placeId ||
    stops.value.some((s) => s.placeId === hub.placeId);
  if (!exists) {
    stops.value = [...stops.value, hub];
  }
  void computeDispatchAndMatrix();
}

function handleRemoveStop(hubId: string) {
  if (stops.value.length <= 1) return;
  stops.value = stops.value.filter((s) => s.id !== hubId);
  void computeDispatchAndMatrix();
}
</script>

<template>
  <div class="dashboard-shell">
    <TopCommandBar
      :maps-ready="mapsReady"
      :active-filter="activeFilter"
      :counts="statusCounts"
      :traffic-enabled="trafficEnabled"
      @update:active-filter="activeFilter = $event"
      @toggle-traffic="trafficEnabled = !trafficEnabled"
      @place-selected="handlePlaceSelected"
    />

    <div v-if="mapError" class="config-banner" role="alert">
      <strong>Maps Configuration Notice:</strong> {{ mapError }}
      <span>
        Create a <code>.env.local</code> file with
        <code>VITE_GOOGLE_MAPS_API_KEY=...</code> (see <code>.env.example</code>).
      </span>
    </div>

    <div class="workspace-split">
      <TelemetrySidebar
        :vehicles="filteredVehicles"
        :selected-vehicle-id="selectedVehicleId"
        :snap-result="snapResult"
        :show-snapped-overlay="showSnappedOverlay"
        :is-snapping="isSnapping"
        :depot="depot"
        :stops="stops"
        :optimize-order="optimizeOrder"
        :is-computing-route="isComputingRoute"
        :dispatch-route="dispatchRoute"
        :matrix-entries="matrixEntries"
        :hub-load-note="hubLoadNote"
        @select-vehicle="handleSelectVehicle"
        @toggle-snap-overlay="showSnappedOverlay = !showSnappedOverlay"
        @resnap-vehicle="runSnapForVehicle(selectedVehicleId)"
        @update:optimize-order="optimizeOrder = $event"
        @compute-dispatch="computeDispatchAndMatrix"
        @remove-stop="handleRemoveStop"
      />

      <FleetMapCanvas
        :api-key="apiKey"
        :vehicles="filteredVehicles"
        :selected-vehicle-id="selectedVehicleId"
        :depot="depot"
        :stops="stops"
        :snap-result="snapResult"
        :show-snapped-overlay="showSnappedOverlay"
        :dispatch-route="dispatchRoute"
        :traffic-enabled="trafficEnabled"
        @map-ready="handleMapReady"
        @map-error="handleMapError"
        @select-vehicle="handleSelectVehicle"
      />
    </div>
  </div>
</template>
