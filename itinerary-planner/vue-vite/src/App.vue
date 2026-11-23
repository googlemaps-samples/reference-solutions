<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import ItineraryPanel from './components/ItineraryPanel.vue';
import DiscoveryPanel from './components/DiscoveryPanel.vue';
import MapAndStreetView from './components/MapAndStreetView.vue';
import { loadMapsLibraries, type LoadedGoogleMapsLibraries } from './services/mapsLoader';
import { PLACE_DISCOVERY_FIELDS, searchPlacesForCategory, serializePlace } from './services/placesService';
import { computeDayRoute } from './services/routesService';
import { fetchTimeZoneForLocation } from './services/timezoneService';
import {
  CITY_PRESETS,
  DAY_COLORS,
  type CityPreset,
  type ComputedRouteResult,
  type DayId,
  type DiscoveredPlace,
  type DiscoveryCategory,
  type ItineraryStop,
  type LatLngPoint,
  type TimeZoneInfo,
  type TravelModeKey,
} from './types/itinerary';

const defaultPreset = CITY_PRESETS[0]; // Tokyo

const libs = ref<LoadedGoogleMapsLibraries | null>(null);
const apiKeyError = ref<string | null>(null);

const selectedPresetId = ref<string>(defaultPreset.id);
const cityName = ref<string>(defaultPreset.name);
const mapCenter = ref<LatLngPoint>({ ...defaultPreset.center });
const mapZoom = ref<number>(defaultPreset.zoom);

const timeZoneInfo = ref<TimeZoneInfo>({
  timeZoneId: defaultPreset.fallbackTimeZoneId,
  timeZoneName: defaultPreset.fallbackTimeZoneName,
  rawOffsetSeconds: defaultPreset.fallbackUtcOffsetMinutes * 60,
  dstOffsetSeconds: 0,
  totalOffsetMinutes: defaultPreset.fallbackUtcOffsetMinutes,
  utcOffsetLabel: 'UTC+09:00',
  source: 'preset',
});

const activeDay = ref<DayId>(1);
const travelMode = ref<TravelModeKey>('DRIVE');
const activeCategory = ref<DiscoveryCategory>('attractions');

const discoveryByCategory = ref<Record<DiscoveryCategory, DiscoveredPlace[]>>({
  attractions: [],
  restaurants: [],
  hotels: [],
});
const discoveryLoading = ref<boolean>(true);
const discoveryError = ref<string | null>(null);

const itineraryByDay = ref<Record<DayId, ItineraryStop[]>>({
  1: [],
  2: [],
});

const routeResult = ref<ComputedRouteResult | null>(null);
const routeLoading = ref<boolean>(false);
const selectedPlace = ref<DiscoveredPlace | null>(null);

let stopUidCounter = 1;
let destinationLoadToken = 0;
let routeLoadToken = 0;

const activeStops = computed(() => itineraryByDay.value[activeDay.value]);
const day1PlaceIds = computed(() => new Set(itineraryByDay.value[1].map((s) => s.place.id)));
const day2PlaceIds = computed(() => new Set(itineraryByDay.value[2].map((s) => s.place.id)));
const activeDiscoveryPlaces = computed(() => discoveryByCategory.value[activeCategory.value]);

function createStop(place: DiscoveredPlace, day: DayId): ItineraryStop {
  stopUidCounter += 1;
  return {
    uid: `${day}-${place.id}-${stopUidCounter}`,
    place,
    day,
  };
}

async function recomputeRoute(optimize: boolean) {
  if (!libs.value) return;
  const stops = itineraryByDay.value[activeDay.value];
  const token = ++routeLoadToken;
  routeLoading.value = true;

  try {
    const result = await computeDayRoute(
      libs.value.routesLib,
      libs.value.coreLib,
      stops,
      travelMode.value,
      DAY_COLORS[activeDay.value].primary,
      optimize
    );

    if (token !== routeLoadToken) return;

    if (
      optimize &&
      result.optimizedIntermediateIndices.length === Math.max(0, stops.length - 2) &&
      stops.length >= 3
    ) {
      const first = stops[0];
      const last = stops[stops.length - 1];
      const middle = stops.slice(1, -1);
      const reorderedMiddle = result.optimizedIntermediateIndices.map((idx) => middle[idx]);
      itineraryByDay.value = {
        ...itineraryByDay.value,
        [activeDay.value]: [first, ...reorderedMiddle, last],
      };

      // If TRANSIT mode optimized via DRIVING, now compute the actual TRANSIT polylines on the reordered stops
      if (travelMode.value === 'TRANSIT') {
        const transitResult = await computeDayRoute(
          libs.value.routesLib,
          libs.value.coreLib,
          itineraryByDay.value[activeDay.value],
          'TRANSIT',
          DAY_COLORS[activeDay.value].primary,
          false
        );
        if (token === routeLoadToken) {
          routeResult.value = transitResult;
        }
        return;
      }
    }

    routeResult.value = result;
  } catch {
    if (token === routeLoadToken) {
      routeResult.value = {
        polylines: [],
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
        distanceText: '0 km',
        durationText: '0 min',
        legs: [],
        optimizedIntermediateIndices: [],
        bounds: null,
        notice: 'Unable to compute route for the current stops.',
      };
    }
  } finally {
    if (token === routeLoadToken) {
      routeLoading.value = false;
    }
  }
}

async function loadDestination(
  targetName: string,
  center: LatLngPoint,
  zoom: number,
  preset: CityPreset | null,
  utcOffsetMinutes?: number | null,
  searchedLandmark?: DiscoveredPlace | null
) {
  if (!libs.value) return;

  const token = ++destinationLoadToken;
  cityName.value = targetName;
  mapCenter.value = { ...center };
  mapZoom.value = zoom;
  discoveryLoading.value = true;
  discoveryError.value = null;

  const { placesLib } = libs.value;

  const [tzInfo, attractionsRes, restaurantsRes, hotelsRes] = await Promise.allSettled([
    fetchTimeZoneForLocation(center, utcOffsetMinutes, preset),
    searchPlacesForCategory(placesLib, targetName, center, 'attractions'),
    searchPlacesForCategory(placesLib, targetName, center, 'restaurants'),
    searchPlacesForCategory(placesLib, targetName, center, 'hotels'),
  ]);

  if (token !== destinationLoadToken) return;

  const attractions = attractionsRes.status === 'fulfilled' ? attractionsRes.value : [];
  const restaurants = restaurantsRes.status === 'fulfilled' ? restaurantsRes.value : [];
  const hotels = hotelsRes.status === 'fulfilled' ? hotelsRes.value : [];

  discoveryByCategory.value = {
    attractions,
    restaurants,
    hotels,
  };

  if (
    attractionsRes.status === 'rejected' &&
    restaurantsRes.status === 'rejected' &&
    hotelsRes.status === 'rejected'
  ) {
    discoveryError.value = 'Unable to load live places. Check your API key and Places API (New) status.';
  }

  // Use place utcOffsetMinutes from live results if Time Zone API fell back and header place lacked it
  const liveUtcOffset =
    utcOffsetMinutes ??
    attractions.find((p) => p.utcOffsetMinutes !== null)?.utcOffsetMinutes ??
    hotels.find((p) => p.utcOffsetMinutes !== null)?.utcOffsetMinutes ??
    null;

  if (tzInfo.status === 'fulfilled') {
    const resolvedTz = tzInfo.value;
    if (resolvedTz.source === 'preset' && liveUtcOffset !== null) {
      timeZoneInfo.value = await fetchTimeZoneForLocation(center, liveUtcOffset, preset);
    } else {
      timeZoneInfo.value = resolvedTz;
    }
  }

  // Pre-seed Day 1 and Day 2 from live Places API (New) results
  const day1SeedPlaces: DiscoveredPlace[] = [];
  const day2SeedPlaces: DiscoveredPlace[] = [];
  const usedIds = new Set<string>();

  if (searchedLandmark) {
    day1SeedPlaces.push(searchedLandmark);
    usedIds.add(searchedLandmark.id);
  }

  for (const attr of attractions) {
    if (usedIds.has(attr.id)) continue;
    if (day1SeedPlaces.length < 3) {
      day1SeedPlaces.push(attr);
      usedIds.add(attr.id);
    } else if (day2SeedPlaces.length < 3) {
      day2SeedPlaces.push(attr);
      usedIds.add(attr.id);
    }
  }

  const firstHotel = hotels.find((h) => !usedIds.has(h.id));
  if (firstHotel) {
    day1SeedPlaces.push(firstHotel);
    usedIds.add(firstHotel.id);
  }

  const firstRestaurant = restaurants.find((r) => !usedIds.has(r.id));
  if (firstRestaurant) {
    day2SeedPlaces.push(firstRestaurant);
    usedIds.add(firstRestaurant.id);
  }

  itineraryByDay.value = {
    1: day1SeedPlaces.map((p) => createStop(p, 1)),
    2: day2SeedPlaces.map((p) => createStop(p, 2)),
  };

  activeDay.value = 1;
  selectedPlace.value = day1SeedPlaces[0] ?? attractions[0] ?? hotels[0] ?? null;
  discoveryLoading.value = false;

  await recomputeRoute(false);
}

async function handleSelectPreset(presetId: string) {
  const preset = CITY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  selectedPresetId.value = preset.id;
  await loadDestination(preset.name, preset.center, preset.zoom, preset, preset.fallbackUtcOffsetMinutes);
}

async function handleSelectAutocompletePlace(place: google.maps.places.Place) {
  if (!libs.value) return;
  try {
    await place.fetchFields({
      fields: [...PLACE_DISCOVERY_FIELDS, 'viewport'],
    });
    const serialized = serializePlace(place, 'attractions');
    if (!serialized) return;

    selectedPresetId.value = 'custom';
    const isCityLike =
      place.types?.includes('locality') ||
      place.types?.includes('administrative_area_level_1') ||
      place.types?.includes('country');

    await loadDestination(
      serialized.displayName,
      serialized.location,
      12,
      null,
      serialized.utcOffsetMinutes,
      isCityLike ? null : serialized
    );
  } catch {
    discoveryError.value = 'Could not load details for the selected destination.';
  }
}

function handleChangeDay(day: DayId) {
  if (activeDay.value === day) return;
  activeDay.value = day;
  const stops = itineraryByDay.value[day];
  if (stops.length > 0) {
    selectedPlace.value = stops[0].place;
  }
  void recomputeRoute(false);
}

function handleChangeTravelMode(mode: TravelModeKey) {
  travelMode.value = mode;
  void recomputeRoute(false);
}

function handleOptimizeRoute() {
  void recomputeRoute(true);
}

function handleAddToDay(place: DiscoveredPlace, day: DayId) {
  const existing = itineraryByDay.value[day];
  if (existing.some((s) => s.place.id === place.id)) return;

  itineraryByDay.value = {
    ...itineraryByDay.value,
    [day]: [...existing, createStop(place, day)],
  };
  selectedPlace.value = place;
  if (activeDay.value === day) {
    void recomputeRoute(false);
  }
}

function handleMoveStop(uid: string, direction: 'up' | 'down') {
  const list = [...itineraryByDay.value[activeDay.value]];
  const idx = list.findIndex((s) => s.uid === uid);
  if (idx === -1) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;

  const [moved] = list.splice(idx, 1);
  list.splice(targetIdx, 0, moved);

  itineraryByDay.value = {
    ...itineraryByDay.value,
    [activeDay.value]: list,
  };
  void recomputeRoute(false);
}

function handleRemoveStop(uid: string) {
  const list = itineraryByDay.value[activeDay.value].filter((s) => s.uid !== uid);
  itineraryByDay.value = {
    ...itineraryByDay.value,
    [activeDay.value]: list,
  };
  void recomputeRoute(false);
}

function handleSelectStop(stop: ItineraryStop) {
  selectedPlace.value = stop.place;
}

function handleInspectStreetView(place: DiscoveredPlace) {
  selectedPlace.value = place;
}

onMounted(async () => {
  try {
    libs.value = await loadMapsLibraries();
    await loadDestination(
      defaultPreset.name,
      defaultPreset.center,
      defaultPreset.zoom,
      defaultPreset,
      defaultPreset.fallbackUtcOffsetMinutes
    );
  } catch (err) {
    discoveryLoading.value = false;
    apiKeyError.value =
      err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform libraries.';
  }
});
</script>

<template>
  <div class="app-shell">
    <HeaderBar
      :city-name="cityName"
      :selected-preset-id="selectedPresetId"
      :presets="CITY_PRESETS"
      :time-zone-info="timeZoneInfo"
      :maps-ready="libs !== null"
      @select-preset="handleSelectPreset"
      @select-autocomplete-place="handleSelectAutocompletePlace"
    />

    <main class="workspace">
      <aside class="sidebar">
        <ItineraryPanel
          :active-day="activeDay"
          :day1-count="itineraryByDay[1].length"
          :day2-count="itineraryByDay[2].length"
          :stops="activeStops"
          :travel-mode="travelMode"
          :route-result="routeResult"
          :route-loading="routeLoading"
          :selected-stop-id="selectedPlace?.id ?? null"
          @change-day="handleChangeDay"
          @change-travel-mode="handleChangeTravelMode"
          @optimize-route="handleOptimizeRoute"
          @select-stop="handleSelectStop"
          @move-stop="handleMoveStop"
          @remove-stop="handleRemoveStop"
        />

        <DiscoveryPanel
          :active-category="activeCategory"
          :places="activeDiscoveryPlaces"
          :loading="discoveryLoading"
          :error-message="discoveryError"
          :selected-place-id="selectedPlace?.id ?? null"
          :day1-place-ids="day1PlaceIds"
          :day2-place-ids="day2PlaceIds"
          @change-category="(cat) => (activeCategory = cat)"
          @add-to-day="handleAddToDay"
          @inspect-street-view="handleInspectStreetView"
        />
      </aside>

      <MapAndStreetView
        :libs="libs"
        :center="mapCenter"
        :zoom="mapZoom"
        :active-day="activeDay"
        :active-stops="activeStops"
        :route-result="routeResult"
        :selected-place="selectedPlace"
        :api-key-error="apiKeyError"
        @select-place="(p) => (selectedPlace = p)"
      />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  background: #f1f5f9;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
}

.sidebar {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-right: 1px solid #cbd5e1;
  overflow-y: auto;
}

@media (max-width: 960px) {
  .app-shell {
    height: auto;
    min-height: 100vh;
  }
  .workspace {
    flex-direction: column-reverse;
  }
  .sidebar {
    width: 100%;
    border-right: 0;
    border-top: 1px solid #cbd5e1;
  }
}
</style>
