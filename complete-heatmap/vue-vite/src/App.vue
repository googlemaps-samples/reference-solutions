<script setup lang="ts">
import { ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import ControlSidebar from './components/ControlSidebar.vue';
import HazardMap from './components/HazardMap.vue';
import {
  DEFAULT_SHELTER_QUERY,
  FLOOD_HAZARD_ZONES,
  HAZARD_TYPE_WEIGHTS,
  MIAMI_CENTER,
  SEED_INCIDENTS,
} from './data/hazardData';
import type {
  EvacuationRouteSummary,
  HazardType,
  IncidentDraft,
  IncidentPoint,
  LatLngPoint,
  ShelterPlace,
  WeatherSummary,
} from './types/hazard';
import { enrichIncidentLocation } from './services/incidentEnrichment';
import { computeEvacuationRoute, searchEmergencyShelters } from './services/shelterRouting';

const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const hasValidKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

const hazardTypes: HazardType[] = [
  'Street Flooding',
  'Storm Surge',
  'Storm Drain Overflow',
  'Downed Power Line',
  'Road Obstruction',
];

const incidents = ref<IncidentPoint[]>([...SEED_INCIDENTS]);
const showHeatmap = ref(true);
const showPolygons = ref(true);
const mobileSidebarOpen = ref(true);

const headerWeather = ref<WeatherSummary | null>(null);
const selectedOrigin = ref<LatLngPoint>({ ...MIAMI_CENTER });
const selectedHazardType = ref<HazardType>('Street Flooding');
const reportConfirmation = ref<string | null>(null);

const incidentDraft = ref<IncidentDraft>({
  lat: MIAMI_CENTER.lat,
  lng: MIAMI_CENTER.lng,
  address: 'Downtown Miami, FL (Click map to geotag exact point)',
  elevationMeters: null,
  elevationResolutionMeters: null,
  weather: null,
  loading: false,
  error: null,
});

const shelters = ref<ShelterPlace[]>([]);
const shelterQuery = ref<string>(DEFAULT_SHELTER_QUERY);
const searchingShelters = ref(false);
const shelterError = ref<string | null>(null);
const selectedShelterId = ref<string | null>(null);

const avoidFloodZones = ref(true);
const activeRoute = ref<google.maps.routes.Route | null>(null);
const routeSummary = ref<EvacuationRouteSummary | null>(null);
const routeLoading = ref(false);
const routeError = ref<string | null>(null);

let activeMapPolygons: google.maps.Polygon[] = [];
let activeSelectedShelter: ShelterPlace | null = null;

async function handleMapClick(point: LatLngPoint): Promise<void> {
  selectedOrigin.value = point;
  reportConfirmation.value = null;

  incidentDraft.value = {
    ...incidentDraft.value,
    lat: point.lat,
    lng: point.lng,
    loading: true,
    error: null,
  };

  if (!hasValidKey) {
    incidentDraft.value.loading = false;
    return;
  }

  const enriched = await enrichIncidentLocation(point.lat, point.lng, apiKey);
  incidentDraft.value = {
    lat: point.lat,
    lng: point.lng,
    address: enriched.address,
    elevationMeters: enriched.elevationMeters,
    elevationResolutionMeters: enriched.elevationResolutionMeters,
    weather: enriched.weather,
    loading: false,
    error: enriched.error,
  };

  if (activeSelectedShelter) {
    await handleRouteToShelter(activeSelectedShelter);
  }
}

function handleSubmitIncident(): void {
  const newPoint: IncidentPoint = {
    id: `user-inc-${Date.now()}`,
    lat: incidentDraft.value.lat,
    lng: incidentDraft.value.lng,
    weight: HAZARD_TYPE_WEIGHTS[selectedHazardType.value],
    hazardType: selectedHazardType.value,
    address: incidentDraft.value.address,
    elevationMeters: incidentDraft.value.elevationMeters,
    reportedAt: new Date().toISOString(),
    isUserSubmitted: true,
  };

  incidents.value = [...incidents.value, newPoint];
  reportConfirmation.value = `Logged "${selectedHazardType.value}" at ${incidentDraft.value.address}. Heatmap updated.`;
}

async function handleSearchShelters(autoRouteFirst = false): Promise<void> {
  if (!hasValidKey) {
    shelterError.value = 'Configure VITE_GOOGLE_MAPS_API_KEY to search nearby shelters.';
    return;
  }

  searchingShelters.value = true;
  shelterError.value = null;

  try {
    const results = await searchEmergencyShelters(shelterQuery.value, selectedOrigin.value);
    shelters.value = results;

    if (autoRouteFirst && results.length > 0) {
      await handleRouteToShelter(results[0]);
    }
  } catch (err: unknown) {
    shelterError.value =
      err instanceof Error ? err.message : 'Unable to fetch nearby emergency shelters.';
  } finally {
    searchingShelters.value = false;
  }
}

async function handleRouteToShelter(shelter: ShelterPlace): Promise<void> {
  if (!hasValidKey) return;

  activeSelectedShelter = shelter;
  selectedShelterId.value = shelter.id;
  routeLoading.value = true;
  routeError.value = null;

  try {
    const result = await computeEvacuationRoute(
      selectedOrigin.value,
      shelter,
      FLOOD_HAZARD_ZONES,
      activeMapPolygons,
      avoidFloodZones.value,
    );
    activeRoute.value = result.route;
    routeSummary.value = result.summary;
  } catch (err: unknown) {
    routeError.value =
      err instanceof Error ? err.message : 'Unable to compute evacuation route.';
  } finally {
    routeLoading.value = false;
  }
}

async function handleAvoidFloodChange(nextValue: boolean): Promise<void> {
  avoidFloodZones.value = nextValue;
  if (activeSelectedShelter) {
    await handleRouteToShelter(activeSelectedShelter);
  }
}

async function handleMapReady(polygons: google.maps.Polygon[]): Promise<void> {
  activeMapPolygons = polygons;

  // Enrich initial Miami center coordinates and load nearby shelters
  const [enriched] = await Promise.all([
    enrichIncidentLocation(MIAMI_CENTER.lat, MIAMI_CENTER.lng, apiKey),
    handleSearchShelters(false),
  ]);

  incidentDraft.value = {
    lat: MIAMI_CENTER.lat,
    lng: MIAMI_CENTER.lng,
    address: enriched.address,
    elevationMeters: enriched.elevationMeters,
    elevationResolutionMeters: enriched.elevationResolutionMeters,
    weather: enriched.weather,
    loading: false,
    error: enriched.error,
  };
  headerWeather.value = enriched.weather;
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :weather="headerWeather"
      :show-heatmap="showHeatmap"
      :show-polygons="showPolygons"
      :searching-shelters="searchingShelters"
      :mobile-sidebar-open="mobileSidebarOpen"
      @toggle-heatmap="showHeatmap = !showHeatmap"
      @toggle-polygons="showPolygons = !showPolygons"
      @find-shelter="handleSearchShelters(true)"
      @toggle-mobile-sidebar="mobileSidebarOpen = !mobileSidebarOpen"
    />

    <div class="workspace">
      <ControlSidebar
        :incident-draft="incidentDraft"
        :hazard-types="hazardTypes"
        :selected-hazard-type="selectedHazardType"
        :report-confirmation="reportConfirmation"
        :total-incident-count="incidents.length"
        :route-summary="routeSummary"
        :route-loading="routeLoading"
        :route-error="routeError"
        :avoid-flood-zones="avoidFloodZones"
        :shelters="shelters"
        :selected-shelter-id="selectedShelterId"
        :shelter-query="shelterQuery"
        :searching-shelters="searchingShelters"
        :shelter-error="shelterError"
        :mobile-open="mobileSidebarOpen"
        @update:selected-hazard-type="selectedHazardType = $event"
        @submit-incident="handleSubmitIncident"
        @update:avoid-flood-zones="handleAvoidFloodChange"
        @update:shelter-query="shelterQuery = $event"
        @search-shelters="handleSearchShelters(false)"
        @route-to-shelter="handleRouteToShelter"
      />

      <HazardMap
        :api-key="apiKey"
        :incidents="incidents"
        :flood-zones="FLOOD_HAZARD_ZONES"
        :shelters="shelters"
        :selected-origin="selectedOrigin"
        :active-route="activeRoute"
        :show-heatmap="showHeatmap"
        :show-polygons="showPolygons"
        @map-ready="handleMapReady"
        @map-click="handleMapClick"
        @route-to-shelter="handleRouteToShelter"
      />
    </div>
  </div>
</template>
