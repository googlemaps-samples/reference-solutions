import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import type {
  ActiveRouteSummary,
  AutocompletePredictionItem,
  Branch,
  BranchType,
  OriginLocation,
  OriginPreset,
  ServiceTag,
  TravelModeOption,
} from '../types/locator';
import {
  NYC_ORIGIN_PRESETS,
  formatDistanceMeters,
  formatDurationMillis,
  mapPlaceToBranch,
  toJsTravelMode,
} from '../utils/branchClassifier';
import {
  createBranchMarkerElement,
  createClusterMarkerElement,
  createInfoWindowContent,
  createOriginMarkerElement,
} from '../utils/markerFactory';

const INITIAL_CENTER = { lat: 40.7549, lng: -73.984 };
const INITIAL_ZOOM = 12;

let loaderConfigured = false;

interface LoadedGmpLibraries {
  coreLib: google.maps.CoreLibrary;
  mapsLib: google.maps.MapsLibrary;
  markerLib: google.maps.MarkerLibrary;
  placesLib: google.maps.PlacesLibrary;
  routesLib: google.maps.RoutesLibrary;
  geocodingLib: google.maps.GeocodingLibrary;
}

export function useStoreLocator(gmpMapRef: Ref<google.maps.MapElement | null>) {
  const apiKeyMissing = ref(false);
  const isInitializing = ref(true);
  const isSearchingBranches = ref(false);
  const isCalculatingMatrix = ref(false);
  const isComputingRoute = ref(false);
  const errorMessage = ref<string | null>(null);

  const currentZoom = ref<number>(INITIAL_ZOOM);
  const origin = ref<OriginLocation>({
    label: NYC_ORIGIN_PRESETS[0].label,
    address: NYC_ORIGIN_PRESETS[0].address,
    location: { ...NYC_ORIGIN_PRESETS[0].location },
  });

  const searchQuery = ref<string>(NYC_ORIGIN_PRESETS[0].label);
  const predictions = ref<AutocompletePredictionItem[]>([]);
  const isAutocompleteOpen = ref(false);

  const travelMode = ref<TravelModeOption>('DRIVE');
  const activeTypeFilter = ref<BranchType | 'all'>('all');
  const activeServices = ref<Set<ServiceTag>>(new Set());

  const branches = ref<Branch[]>([]);
  const selectedBranchId = ref<string | null>(null);
  const activeRouteSummary = ref<ActiveRouteSummary | null>(null);

  const mapInstance = shallowRef<google.maps.Map | null>(null);
  let libs: LoadedGmpLibraries | null = null;
  let clusterer: MarkerClusterer | null = null;
  let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let infoWindow: google.maps.InfoWindow | null = null;
  let activePolylines: google.maps.Polyline[] = [];
  const branchMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
  let autocompleteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let routeRequestCounter = 0;
  let matrixRequestCounter = 0;

  const filteredBranches = computed<Branch[]>(() => {
    const filtered = branches.value.filter((branch) => {
      if (activeTypeFilter.value !== 'all' && branch.branchType !== activeTypeFilter.value) {
        return false;
      }
      for (const reqService of activeServices.value) {
        if (!branch.services.includes(reqService)) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (a.durationMillis !== null && b.durationMillis !== null) {
        return a.durationMillis - b.durationMillis;
      }
      if (a.durationMillis !== null) return -1;
      if (b.durationMillis !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    const fastestId = sorted.find((b) => b.durationMillis !== null)?.id ?? sorted[0]?.id ?? null;

    return sorted.map((branch) => ({
      ...branch,
      isFastest: fastestId !== null && branch.id === fastestId,
    }));
  });

  const fastestBranch = computed<Branch | null>(() => {
    return filteredBranches.value.find((b) => b.isFastest) ?? filteredBranches.value[0] ?? null;
  });

  const selectedBranch = computed<Branch | null>(() => {
    if (!selectedBranchId.value) return null;
    return (
      filteredBranches.value.find((b) => b.id === selectedBranchId.value) ??
      branches.value.find((b) => b.id === selectedBranchId.value) ??
      null
    );
  });

  const typeCounts = computed<Record<BranchType | 'all', number>>(() => {
    const counts: Record<BranchType | 'all', number> = {
      all: branches.value.length,
      flagship: 0,
      kiosk: 0,
      atm: 0,
    };
    for (const b of branches.value) {
      counts[b.branchType] += 1;
    }
    return counts;
  });

  function clearPolylines() {
    for (const poly of activePolylines) {
      poly.setMap(null);
    }
    activePolylines = [];
  }

  function updateOriginMarker() {
    if (!mapInstance.value || !libs) return;
    if (!originMarker) {
      originMarker = new libs.markerLib.AdvancedMarkerElement({
        map: mapInstance.value,
        position: origin.value.location,
        title: `Starting Location: ${origin.value.label}`,
        zIndex: 950,
      });
    } else {
      originMarker.position = origin.value.location;
      originMarker.title = `Starting Location: ${origin.value.label}`;
      originMarker.map = mapInstance.value;
    }
    originMarker.replaceChildren(createOriginMarkerElement(origin.value.label));
  }

  function syncBranchMarkers() {
    if (!mapInstance.value || !libs) return;

    const visible = filteredBranches.value;
    const markersToRender: google.maps.marker.AdvancedMarkerElement[] = [];

    // Detach old markers not in visible set
    for (const [id, marker] of branchMarkers.entries()) {
      if (!visible.some((b) => b.id === id)) {
        marker.map = null;
      }
    }

    for (const branch of visible) {
      const isSelected = branch.id === selectedBranchId.value;
      let marker = branchMarkers.get(branch.id);
      if (!marker) {
        marker = new libs.markerLib.AdvancedMarkerElement({
          position: branch.location,
          title: branch.name,
          zIndex: isSelected ? 600 : branch.isFastest ? 400 : 200,
        });
        marker.addListener('click', () => {
          void selectBranch(branch.id);
        });
        branchMarkers.set(branch.id, marker);
      } else {
        marker.position = branch.location;
        marker.title = branch.name;
        marker.zIndex = isSelected ? 600 : branch.isFastest ? 400 : 200;
      }
      marker.replaceChildren(createBranchMarkerElement(branch, isSelected));
      markersToRender.push(marker);
    }

    if (!clusterer) {
      const markerLib = libs.markerLib;
      clusterer = new MarkerClusterer({
        map: mapInstance.value,
        markers: markersToRender,
        algorithm: new SuperClusterAlgorithm({
          radius: 65,
          maxZoom: 15,
        }),
        renderer: {
          render: ({ count, position }, _stats, targetMap) => {
            const clusterMarker = new markerLib.AdvancedMarkerElement({
              map: targetMap,
              position,
              title: `${count} branches in this area — click to zoom`,
              zIndex: 1000 + count,
            });
            clusterMarker.append(createClusterMarkerElement(count));
            return clusterMarker;
          },
        },
      });
    } else {
      clusterer.clearMarkers(true);
      clusterer.addMarkers(markersToRender);
    }
  }

  function updateMarkerSelectionVisuals() {
    for (const branch of filteredBranches.value) {
      const marker = branchMarkers.get(branch.id);
      if (!marker) continue;
      const isSelected = branch.id === selectedBranchId.value;
      marker.zIndex = isSelected ? 600 : branch.isFastest ? 400 : 200;
      marker.replaceChildren(createBranchMarkerElement(branch, isSelected));
    }
  }

  async function loadNycBranches() {
    if (!libs) return;
    isSearchingBranches.value = true;
    errorMessage.value = null;

    const { Place } = libs.placesLib;
    const fields = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'primaryType',
      'rating',
      'userRatingCount',
      'regularOpeningHours',
      'businessStatus',
    ];

    const queries: Array<{ textQuery: string; hint: BranchType }> = [
      { textQuery: 'flagship retail store Manhattan New York', hint: 'flagship' },
      { textQuery: 'espresso coffee kiosk Manhattan New York', hint: 'kiosk' },
      { textQuery: '24 hour ATM Manhattan New York', hint: 'atm' },
    ];

    try {
      const responses = await Promise.all(
        queries.map((q) =>
          Place.searchByText({
            textQuery: q.textQuery,
            fields,
            locationBias: { center: INITIAL_CENTER, radius: 7500 },
            language: 'en',
            region: 'us',
            maxResultCount: 8,
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          })
        )
      );

      const deduped = new Map<string, Branch>();
      responses.forEach((res, idx) => {
        const hint = queries[idx].hint;
        for (const place of res.places ?? []) {
          const branch = mapPlaceToBranch(place, hint);
          if (branch && !deduped.has(branch.id)) {
            deduped.set(branch.id, branch);
          }
        }
      });

      branches.value = Array.from(deduped.values()).slice(0, 24);
      if (branches.value.length === 0) {
        errorMessage.value = 'No NYC branches returned from Places API (New).';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Failed to load NYC branches: ${msg}`;
    } finally {
      isSearchingBranches.value = false;
    }
  }

  async function computeMatrixForBranches() {
    if (!libs || branches.value.length === 0) return;
    const currentRequest = ++matrixRequestCounter;
    isCalculatingMatrix.value = true;

    try {
      const { RouteMatrix } = libs.routesLib;
      const jsMode = toJsTravelMode(travelMode.value);
      const destinations = branches.value.map((b) => b.location);

      const request: google.maps.routes.ComputeRouteMatrixRequest = {
        origins: [origin.value.location],
        destinations,
        travelMode: jsMode,
        fields: ['durationMillis', 'distanceMeters', 'condition', 'localizedValues'],
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        ...(jsMode === 'DRIVING' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      };

      const { matrix } = await RouteMatrix.computeRouteMatrix(request);
      if (currentRequest !== matrixRequestCounter) return;

      const items = matrix.rows?.[0]?.items ?? [];
      branches.value = branches.value.map((branch, idx) => {
        const item = items[idx];
        const durationMillis =
          typeof item?.durationMillis === 'number' && Number.isFinite(item.durationMillis)
            ? item.durationMillis
            : null;
        const distanceMeters =
          typeof item?.distanceMeters === 'number' && Number.isFinite(item.distanceMeters)
            ? item.distanceMeters
            : null;

        const etaText =
          item?.localizedValues?.duration ??
          (durationMillis !== null ? formatDurationMillis(durationMillis) : null);
        const distanceText =
          item?.localizedValues?.distance ??
          (distanceMeters !== null ? formatDistanceMeters(distanceMeters) : null);

        return {
          ...branch,
          durationMillis,
          distanceMeters,
          etaText,
          distanceText,
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Route matrix calculation warning: ${msg}`;
    } finally {
      if (currentRequest === matrixRequestCounter) {
        isCalculatingMatrix.value = false;
      }
    }
  }

  async function selectBranch(branchId: string) {
    if (!mapInstance.value || !libs) return;

    const branch =
      filteredBranches.value.find((b) => b.id === branchId) ??
      branches.value.find((b) => b.id === branchId);
    if (!branch) return;

    selectedBranchId.value = branch.id;
    updateMarkerSelectionVisuals();

    const currentRequest = ++routeRequestCounter;
    isComputingRoute.value = true;
    clearPolylines();

    // Open InfoWindow on branch marker or position
    if (!infoWindow) {
      infoWindow = new libs.mapsLib.InfoWindow({
        maxWidth: 280,
      });
    }

    const marker = branchMarkers.get(branch.id);
    infoWindow.setContent(createInfoWindowContent(branch));
    if (marker && marker.map) {
      infoWindow.open({
        map: mapInstance.value,
        anchor: marker,
      });
    } else {
      infoWindow.setPosition(branch.location);
      infoWindow.open({
        map: mapInstance.value,
      });
    }

    try {
      const { Route } = libs.routesLib;
      const jsMode = toJsTravelMode(travelMode.value);

      const { routes } = await Route.computeRoutes({
        origin: origin.value.location,
        destination: branch.location,
        travelMode: jsMode,
        fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues', 'legs', 'viewport'],
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        ...(jsMode === 'DRIVING' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      });

      if (currentRequest !== routeRequestCounter) return;

      const route = routes?.[0];
      if (!route) {
        errorMessage.value = 'No route found for this travel mode.';
        return;
      }

      const polylines =
        jsMode === 'TRANSIT'
          ? route.createPolylines()
          : route.createPolylines({
              polylineOptions: {
                strokeColor: '#2563eb',
                strokeWeight: 5,
                strokeOpacity: 0.92,
              },
            });

      for (const poly of polylines) {
        poly.setMap(mapInstance.value);
      }
      activePolylines = polylines;

      const etaText =
        route.localizedValues?.duration ??
        (typeof route.durationMillis === 'number'
          ? formatDurationMillis(route.durationMillis)
          : branch.etaText ?? '—');

      const distanceText =
        route.localizedValues?.distance ??
        (typeof route.distanceMeters === 'number'
          ? formatDistanceMeters(route.distanceMeters)
          : branch.distanceText ?? '—');

      // Refresh branch metrics & InfoWindow with exact route numbers
      branches.value = branches.value.map((b) =>
        b.id === branch.id
          ? {
              ...b,
              durationMillis:
                typeof route.durationMillis === 'number' ? route.durationMillis : b.durationMillis,
              distanceMeters:
                typeof route.distanceMeters === 'number' ? route.distanceMeters : b.distanceMeters,
              etaText,
              distanceText,
            }
          : b
      );

      const updatedBranch =
        filteredBranches.value.find((b) => b.id === branch.id) ??
        branches.value.find((b) => b.id === branch.id) ??
        branch;

      infoWindow.setContent(createInfoWindowContent(updatedBranch));

      activeRouteSummary.value = {
        branchId: updatedBranch.id,
        branchName: updatedBranch.name,
        branchType: updatedBranch.branchType,
        etaText,
        distanceText,
        travelMode: travelMode.value,
        isFastest: updatedBranch.isFastest,
      };

      const bounds = new libs.coreLib.LatLngBounds();
      bounds.extend(origin.value.location);
      bounds.extend(updatedBranch.location);
      if (route.path?.length) {
        for (const pt of route.path) {
          bounds.extend(pt);
        }
      }
      mapInstance.value.fitBounds(bounds, { top: 64, right: 64, bottom: 84, left: 64 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Route calculation failed: ${msg}`;
    } finally {
      if (currentRequest === routeRequestCounter) {
        isComputingRoute.value = false;
      }
    }
  }

  async function routeToFastest() {
    const target = fastestBranch.value;
    if (!target) return;
    await selectBranch(target.id);
  }

  async function setOriginAndRefresh(nextOrigin: OriginLocation) {
    origin.value = nextOrigin;
    searchQuery.value = nextOrigin.label;
    predictions.value = [];
    isAutocompleteOpen.value = false;
    updateOriginMarker();
    clearPolylines();
    activeRouteSummary.value = null;

    await computeMatrixForBranches();
    syncBranchMarkers();

    if (selectedBranchId.value && filteredBranches.value.some((b) => b.id === selectedBranchId.value)) {
      await selectBranch(selectedBranchId.value);
    } else if (fastestBranch.value) {
      await selectBranch(fastestBranch.value.id);
    } else if (mapInstance.value) {
      mapInstance.value.panTo(nextOrigin.location);
    }
  }

  function handleSearchInput(value: string) {
    searchQuery.value = value;
    if (autocompleteDebounceTimer) {
      clearTimeout(autocompleteDebounceTimer);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2 || !libs) {
      predictions.value = [];
      isAutocompleteOpen.value = false;
      return;
    }

    autocompleteDebounceTimer = setTimeout(async () => {
      if (!libs) return;
      try {
        if (!sessionToken) {
          sessionToken = new libs.placesLib.AutocompleteSessionToken();
        }
        const { suggestions } =
          await libs.placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken,
            locationBias: { center: INITIAL_CENTER, radius: 18000 },
            includedRegionCodes: ['us'],
            region: 'us',
            language: 'en',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          });

        const mapped: AutocompletePredictionItem[] = [];
        for (const s of suggestions) {
          const pred = s.placePrediction;
          if (!pred) continue;
          mapped.push({
            placeId: pred.placeId,
            mainText: pred.mainText?.text ?? pred.text.text,
            secondaryText: pred.secondaryText?.text ?? '',
            fullText: pred.text.text,
            prediction: pred,
          });
        }
        predictions.value = mapped;
        isAutocompleteOpen.value = mapped.length > 0;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.value = `Autocomplete lookup warning: ${msg}`;
        predictions.value = [];
        isAutocompleteOpen.value = false;
      }
    }, 220);
  }

  async function selectPrediction(item: AutocompletePredictionItem) {
    if (!libs) return;
    isAutocompleteOpen.value = false;
    predictions.value = [];

    try {
      const place = item.prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      sessionToken = null;

      if (!place.location) {
        errorMessage.value = 'Selected address did not include coordinates.';
        return;
      }

      await setOriginAndRefresh({
        label: place.displayName || item.mainText,
        address: place.formattedAddress || item.fullText,
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Failed to resolve selected location: ${msg}`;
    }
  }

  async function submitSearchFallback() {
    if (predictions.value.length > 0) {
      await selectPrediction(predictions.value[0]);
      return;
    }

    const query = searchQuery.value.trim();
    if (!query || !libs) return;

    try {
      const geocoder = new libs.geocodingLib.Geocoder();
      const { results } = await geocoder.geocode({
        address: /new york|ny|manhattan|brooklyn|queens/i.test(query)
          ? query
          : `${query}, New York, NY`,
        componentRestrictions: { country: 'US', administrativeArea: 'NY' },
      });

      const first = results?.[0];
      if (!first?.geometry?.location) {
        errorMessage.value = `Could not find "${query}" in New York City.`;
        return;
      }

      await setOriginAndRefresh({
        label: query,
        address: first.formatted_address || query,
        location: {
          lat: first.geometry.location.lat(),
          lng: first.geometry.location.lng(),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Geocoding fallback failed: ${msg}`;
    }
  }

  async function applyOriginPreset(preset: OriginPreset) {
    await setOriginAndRefresh({
      label: preset.label,
      address: preset.address,
      location: { ...preset.location },
    });
  }

  async function setTravelMode(mode: TravelModeOption) {
    if (travelMode.value === mode) return;
    travelMode.value = mode;
    await computeMatrixForBranches();
    syncBranchMarkers();
    if (selectedBranchId.value) {
      await selectBranch(selectedBranchId.value);
    }
  }

  function setTypeFilter(type: BranchType | 'all') {
    activeTypeFilter.value = type;
  }

  function toggleService(service: ServiceTag) {
    const next = new Set(activeServices.value);
    if (next.has(service)) {
      next.delete(service);
    } else {
      next.add(service);
    }
    activeServices.value = next;
  }

  function resetFilters() {
    activeTypeFilter.value = 'all';
    activeServices.value = new Set();
  }

  function closeAutocomplete() {
    isAutocompleteOpen.value = false;
  }

  watch(filteredBranches, () => {
    syncBranchMarkers();
  });

  async function initMapAndData() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      apiKeyMissing.value = true;
      isInitializing.value = false;
      return;
    }

    try {
      if (!loaderConfigured) {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'US',
        });
        loaderConfigured = true;
      }

      const [coreLib, mapsLib, markerLib, placesLib, routesLib, geocodingLib] =
        await Promise.all([
          importLibrary('core'),
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('places'),
          importLibrary('routes'),
          importLibrary('geocoding'),
          importLibrary('geometry'),
        ]);

      libs = {
        coreLib,
        mapsLib,
        markerLib,
        placesLib,
        routesLib,
        geocodingLib,
      };

      await customElements.whenDefined('gmp-map');
      await nextTick();

      const el = gmpMapRef.value;
      if (!el) {
        throw new Error('Map element failed to mount.');
      }

      let innerMap = el.innerMap;
      if (!innerMap) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        innerMap = el.innerMap;
      }
      if (!innerMap) {
        throw new Error('MapElement.innerMap is unavailable.');
      }

      innerMap.setOptions({
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });

      innerMap.addListener('zoom_changed', () => {
        currentZoom.value = innerMap.getZoom() ?? INITIAL_ZOOM;
      });

      mapInstance.value = innerMap;
      updateOriginMarker();

      await loadNycBranches();
      await computeMatrixForBranches();
      syncBranchMarkers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Google Maps initialization failed: ${msg}`;
    } finally {
      isInitializing.value = false;
    }
  }

  onBeforeUnmount(() => {
    if (autocompleteDebounceTimer) {
      clearTimeout(autocompleteDebounceTimer);
    }
    clearPolylines();
    clusterer?.clearMarkers(true);
    if (originMarker) {
      originMarker.map = null;
    }
    infoWindow?.close();
  });

  return {
    apiKeyMissing,
    isInitializing,
    isSearchingBranches,
    isCalculatingMatrix,
    isComputingRoute,
    errorMessage,
    currentZoom,
    origin,
    searchQuery,
    predictions,
    isAutocompleteOpen,
    travelMode,
    activeTypeFilter,
    activeServices,
    branches,
    filteredBranches,
    fastestBranch,
    selectedBranch,
    selectedBranchId,
    activeRouteSummary,
    typeCounts,
    initMapAndData,
    handleSearchInput,
    selectPrediction,
    submitSearchFallback,
    applyOriginPreset,
    setTravelMode,
    setTypeFilter,
    toggleService,
    resetFilters,
    selectBranch,
    routeToFastest,
    closeAutocomplete,
  };
}
