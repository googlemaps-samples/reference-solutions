import { computed, onBeforeUnmount, ref, type Ref } from 'vue';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type {
  CandidateDriver,
  ComputedRouteInfo,
  DriverTelemetry,
  EmissionType,
  FareTierId,
  LatLngPoint,
  ResolvedPlace,
  RouteOptionKind,
} from '../types/rideshare';
import {
  calculateEcoComparison,
  calculateFareTiers,
  formatDistanceMiles,
  formatDuration,
} from '../utils/fares';
import {
  INITIAL_CANDIDATE_DRIVERS,
  rankDriversWithRouteMatrix,
} from '../utils/drivers';

const LA_CENTER: LatLngPoint = { lat: 34.0328, lng: -118.3669 };
const LA_BIAS_CENTER: LatLngPoint = { lat: 34.0522, lng: -118.2437 };
const DEFAULT_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
const DEFAULT_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

let loaderConfigured = false;

interface LibrariesBundle {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  geometry: google.maps.GeometryLibrary;
}

interface PathSegment {
  from: LatLngPoint;
  to: LatLngPoint;
  lengthMeters: number;
  cumulativeEndMeters: number;
  heading: number;
}

function createDriverCarElement(labelText: string): {
  root: HTMLDivElement;
  pill: HTMLDivElement;
  iconWrap: HTMLDivElement;
} {
  const root = document.createElement('div');
  root.className = 'driver-marker-wrap';

  const pill = document.createElement('div');
  pill.className = 'driver-marker-pill';
  pill.textContent = labelText;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'driver-car-icon';

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', 'M12 2L19 20L12 16.5L5 20L12 2Z');
  path.setAttribute('fill', '#34D399');
  path.setAttribute('stroke', '#FFFFFF');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linejoin', 'round');

  svg.appendChild(path);
  iconWrap.appendChild(svg);
  root.appendChild(pill);
  root.appendChild(iconWrap);

  return { root, pill, iconWrap };
}

function createCandidateDotElement(label: string): HTMLDivElement {
  const dot = document.createElement('div');
  dot.className = 'candidate-dot-marker';
  dot.textContent = label;
  return dot;
}

function buildSegments(
  points: LatLngPoint[],
  spherical: typeof google.maps.geometry.spherical,
): { segments: PathSegment[]; totalMeters: number } {
  const segments: PathSegment[] = [];
  let cumulative = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const lengthMeters = spherical.computeDistanceBetween(from, to);
    if (lengthMeters <= 0.1) continue;
    cumulative += lengthMeters;
    segments.push({
      from,
      to,
      lengthMeters,
      cumulativeEndMeters: cumulative,
      heading: spherical.computeHeading(from, to),
    });
  }

  return { segments, totalMeters: cumulative };
}

function sampleAlongSegments(
  segments: PathSegment[],
  totalMeters: number,
  fraction: number,
  spherical: typeof google.maps.geometry.spherical,
): { position: LatLngPoint; heading: number } {
  if (segments.length === 0) {
    return { position: LA_CENTER, heading: 0 };
  }
  const clamped = Math.max(0, Math.min(1, fraction));
  if (clamped === 0) {
    return { position: segments[0].from, heading: segments[0].heading };
  }
  if (clamped === 1) {
    const last = segments[segments.length - 1];
    return { position: last.to, heading: last.heading };
  }

  const targetDist = clamped * totalMeters;
  let prevEnd = 0;
  for (const seg of segments) {
    if (targetDist <= seg.cumulativeEndMeters) {
      const localFraction =
        seg.lengthMeters > 0 ? (targetDist - prevEnd) / seg.lengthMeters : 0;
      const interpolated = spherical.interpolate(seg.from, seg.to, localFraction);
      return {
        position: { lat: interpolated.lat(), lng: interpolated.lng() },
        heading: seg.heading,
      };
    }
    prevEnd = seg.cumulativeEndMeters;
  }

  const last = segments[segments.length - 1];
  return { position: last.to, heading: last.heading };
}

export function useRideshareMap(
  mapContainer: Ref<HTMLElement | null>,
  pickupAutocompleteHost: Ref<HTMLElement | null>,
  dropoffAutocompleteHost: Ref<HTMLElement | null>,
) {
  const isInitializing = ref(true);
  const isRouting = ref(false);
  const errorMessage = ref<string | null>(null);

  const pickupPlace = ref<ResolvedPlace | null>(null);
  const dropoffPlace = ref<ResolvedPlace | null>(null);

  const emissionType = ref<EmissionType>('HYBRID');
  const selectedRouteKind = ref<RouteOptionKind>('eco');
  const selectedTierId = ref<FareTierId>('green');

  const fastestRoute = ref<ComputedRouteInfo | null>(null);
  const ecoRoute = ref<ComputedRouteInfo | null>(null);

  const candidateDrivers = ref<CandidateDriver[]>(
    INITIAL_CANDIDATE_DRIVERS.map((d) => ({ ...d })),
  );
  const activeDriver = ref<CandidateDriver>(candidateDrivers.value[0]);

  const telemetry = ref<DriverTelemetry>({
    phase: 'idle',
    isRunning: false,
    progressPercent: 0,
    remainingSeconds: 0,
    remainingMeters: 0,
    currentHeading: 0,
    currentPosition: null,
    statusLabel: 'Awaiting route...',
  });

  const activeRoute = computed<ComputedRouteInfo | null>(() => {
    if (selectedRouteKind.value === 'eco' && ecoRoute.value) {
      return ecoRoute.value;
    }
    return fastestRoute.value ?? ecoRoute.value;
  });

  const ecoSummary = computed(() => {
    if (!fastestRoute.value) return null;
    return calculateEcoComparison(
      fastestRoute.value,
      ecoRoute.value,
      emissionType.value,
    );
  });

  const fareTiers = computed(() => {
    if (!activeRoute.value || !ecoSummary.value) return [];
    return calculateFareTiers(
      activeRoute.value,
      ecoSummary.value,
      emissionType.value,
    );
  });

  // Non-reactive Maps SDK handles
  let libs: LibrariesBundle | null = null;
  let map: google.maps.Map | null = null;
  let pickupInputEl: google.maps.places.PlaceAutocompleteElement | null = null;
  let dropoffInputEl: google.maps.places.PlaceAutocompleteElement | null = null;

  let pickupMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let dropoffMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let candidateMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
  let driverMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let driverDom: ReturnType<typeof createDriverCarElement> | null = null;

  let fastestPolyline: google.maps.Polyline | null = null;
  let ecoPolyline: google.maps.Polyline | null = null;
  let approachPolyline: google.maps.Polyline | null = null;

  let approachPathPoints: LatLngPoint[] = [];
  let approachDurationSeconds = 180;
  let approachDistanceMeters = 1200;

  let animFrameId: number | null = null;
  let lastFrameTs = 0;
  let phaseElapsedSec = 0;
  let atPickupPauseSec = 0;

  const APPROACH_SIM_DURATION_SEC = 7;
  const TRIP_SIM_DURATION_SEC = 16;

  async function init(): Promise<void> {
    const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      errorMessage.value =
        'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and add a valid Google Maps Platform API key (or a free Maps Demo Key).';
      isInitializing.value = false;
      return;
    }

    if (!mapContainer.value) {
      errorMessage.value = 'Map container element is not mounted.';
      isInitializing.value = false;
      return;
    }

    try {
      if (!loaderConfigured) {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en-US',
          region: 'US',
        });
        loaderConfigured = true;
      }

      const [core, maps, marker, places, routes, geometry] = await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geometry'),
      ]);

      libs = { core, maps, marker, places, routes, geometry };

      map = new maps.Map(mapContainer.value, {
        center: LA_CENTER,
        zoom: 12,
        mapId: 'DEMO_MAP_ID',
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mountAutocompleteInputs();
      renderCandidateDriverMarkers();

      // Resolve pre-seeded Los Angeles pickup & drop-off via Places API (New)
      const [resolvedPickup, resolvedDropoff] = await Promise.all([
        resolvePlaceByText(DEFAULT_PICKUP_QUERY),
        resolvePlaceByText(DEFAULT_DROPOFF_QUERY),
      ]);

      if (!resolvedPickup || !resolvedDropoff) {
        errorMessage.value =
          'Could not resolve initial Los Angeles locations via Places API (New). Verify that Places API (New) is enabled on your key.';
        isInitializing.value = false;
        return;
      }

      pickupPlace.value = resolvedPickup;
      dropoffPlace.value = resolvedDropoff;
      syncInputLabels();

      isInitializing.value = false;
      await recomputeTripAndDispatch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Failed to initialize Google Maps Platform services: ${msg}`;
      isInitializing.value = false;
    }
  }

  function mountAutocompleteInputs(): void {
    if (!libs) return;
    const { PlaceAutocompleteElement } = libs.places;

    const laBias = { center: LA_BIAS_CENTER, radius: 45000 };

    if (pickupAutocompleteHost.value) {
      const el = new PlaceAutocompleteElement({
        locationBias: laBias,
        includedRegionCodes: ['us'],
      });
      setAutocompleteProps(el, 'Pickup in Los Angeles...', DEFAULT_PICKUP_QUERY);
      el.addEventListener('gmp-select', (ev) => {
        void handlePlaceSelect(
          ev as google.maps.places.PlacePredictionSelectEvent,
          'pickup',
        );
      });
      el.addEventListener('gmp-error', () => {
        errorMessage.value =
          'Places Autocomplete encountered an authorization or network error.';
      });
      pickupAutocompleteHost.value.replaceChildren(el);
      pickupInputEl = el;
    }

    if (dropoffAutocompleteHost.value) {
      const el = new PlaceAutocompleteElement({
        locationBias: laBias,
        includedRegionCodes: ['us'],
      });
      setAutocompleteProps(
        el,
        'Drop-off in Los Angeles...',
        DEFAULT_DROPOFF_QUERY,
      );
      el.addEventListener('gmp-select', (ev) => {
        void handlePlaceSelect(
          ev as google.maps.places.PlacePredictionSelectEvent,
          'dropoff',
        );
      });
      el.addEventListener('gmp-error', () => {
        errorMessage.value =
          'Places Autocomplete encountered an authorization or network error.';
      });
      dropoffAutocompleteHost.value.replaceChildren(el);
      dropoffInputEl = el;
    }
  }

  function setAutocompleteProps(
    el: google.maps.places.PlaceAutocompleteElement,
    placeholder: string,
    value: string,
  ): void {
    const writable = el as unknown as {
      placeholder?: string;
      value?: string;
    };
    writable.placeholder = placeholder;
    writable.value = value;
  }

  function syncInputLabels(): void {
    if (pickupInputEl && pickupPlace.value) {
      setAutocompleteProps(
        pickupInputEl,
        'Pickup in Los Angeles...',
        pickupPlace.value.displayName,
      );
    }
    if (dropoffInputEl && dropoffPlace.value) {
      setAutocompleteProps(
        dropoffInputEl,
        'Drop-off in Los Angeles...',
        dropoffPlace.value.displayName,
      );
    }
  }

  async function handlePlaceSelect(
    event: google.maps.places.PlacePredictionSelectEvent,
    target: 'pickup' | 'dropoff',
  ): Promise<void> {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) return;

      const resolved: ResolvedPlace = {
        id: place.id,
        displayName: place.displayName ?? place.formattedAddress ?? 'Selected Place',
        formattedAddress: place.formattedAddress ?? '',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      };

      if (target === 'pickup') {
        pickupPlace.value = resolved;
      } else {
        dropoffPlace.value = resolved;
      }

      await recomputeTripAndDispatch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Failed to load selected place details: ${msg}`;
    }
  }

  async function resolvePlaceByText(
    textQuery: string,
  ): Promise<ResolvedPlace | null> {
    if (!libs) return null;
    const { Place } = libs.places;
    const { places } = await Place.searchByText({
      textQuery,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      locationBias: { center: LA_BIAS_CENTER, radius: 45000 },
      maxResultCount: 1,
      region: 'us',
    });

    const first = places[0];
    if (!first?.location) return null;

    return {
      id: first.id,
      displayName: first.displayName ?? textQuery,
      formattedAddress: first.formattedAddress ?? textQuery,
      location: {
        lat: first.location.lat(),
        lng: first.location.lng(),
      },
    };
  }

  async function swapLocations(): Promise<void> {
    if (!pickupPlace.value || !dropoffPlace.value) return;
    const prevPickup = pickupPlace.value;
    pickupPlace.value = dropoffPlace.value;
    dropoffPlace.value = prevPickup;
    syncInputLabels();
    await recomputeTripAndDispatch();
  }

  async function setEmissionType(nextType: EmissionType): Promise<void> {
    emissionType.value = nextType;
    await recomputeRoutesOnly();
  }

  function selectRouteKind(kind: RouteOptionKind): void {
    selectedRouteKind.value = kind;
    updatePolylineStyles();
    if (telemetry.value.phase === 'on_trip' || telemetry.value.phase === 'arrived') {
      dispatchClosestDriver();
    }
  }

  function selectFareTier(tierId: FareTierId): void {
    selectedTierId.value = tierId;
    if (tierId === 'green') {
      selectedRouteKind.value = 'eco';
      updatePolylineStyles();
    }
  }

  async function recomputeTripAndDispatch(): Promise<void> {
    if (!libs || !pickupPlace.value || !dropoffPlace.value) return;
    errorMessage.value = null;

    updateEndpointMarkers();
    await recomputeRoutesOnly();
    await evaluateDriversAndApproach();
    dispatchClosestDriver();
  }

  async function recomputeRoutesOnly(): Promise<void> {
    if (!libs || !map || !pickupPlace.value || !dropoffPlace.value) return;
    isRouting.value = true;

    try {
      const {
        Route,
        ComputeRoutesExtraComputation,
        ReferenceRoute,
        RouteLabel,
        RoutingPreference,
        TravelMode,
      } = libs.routes;

      const { routes } = await Route.computeRoutes({
        origin: pickupPlace.value.location,
        destination: dropoffPlace.value.location,
        travelMode: TravelMode.DRIVING,
        routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
        extraComputations: [ComputeRoutesExtraComputation.FUEL_CONSUMPTION],
        requestedReferenceRoutes: [ReferenceRoute.FUEL_EFFICIENT],
        routeModifiers: {
          vehicleInfo: {
            emissionType:
              emissionType.value as google.maps.routes.VehicleEmissionType,
          },
        },
        fields: [
          'distanceMeters',
          'durationMillis',
          'staticDurationMillis',
          'path',
          'routeLabels',
          'travelAdvisory',
          'localizedValues',
          'viewport',
        ],
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      });

      if (!routes || routes.length === 0) {
        errorMessage.value = 'No driving routes returned between these locations.';
        isRouting.value = false;
        return;
      }

      const defaultRaw =
        routes.find((r) => r.routeLabels?.includes(RouteLabel.DEFAULT_ROUTE)) ??
        routes[0];
      const ecoRaw =
        routes.find((r) => r.routeLabels?.includes(RouteLabel.FUEL_EFFICIENT)) ??
        null;

      fastestRoute.value = mapRouteToInfo(defaultRaw, 'fastest', 'Fastest Route');

      if (ecoRaw && ecoRaw !== defaultRaw) {
        ecoRoute.value = mapRouteToInfo(ecoRaw, 'eco', 'Eco-Friendly');
      } else {
        ecoRoute.value = {
          ...fastestRoute.value,
          kind: 'eco',
          label: 'Eco-Friendly',
          isSharedWithFastest: true,
        };
      }

      drawTripPolylines();
      fitMapToTrip();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessage.value = `Routes API computation failed: ${msg}`;
    } finally {
      isRouting.value = false;
    }
  }

  function mapRouteToInfo(
    route: google.maps.routes.Route,
    kind: RouteOptionKind,
    label: string,
  ): ComputedRouteInfo {
    const distanceMeters = route.distanceMeters ?? 0;
    const durationMillis = route.durationMillis ?? route.staticDurationMillis ?? 0;
    const staticDurationMillis = route.staticDurationMillis ?? durationMillis;

    const pathPoints: LatLngPoint[] = (route.path ?? []).map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
    }));

    return {
      kind,
      label,
      routeLabels: (route.routeLabels ?? []).map(String),
      distanceMeters,
      durationMillis,
      staticDurationMillis,
      distanceText:
        route.localizedValues?.distance ?? formatDistanceMiles(distanceMeters),
      durationText:
        route.localizedValues?.duration ?? formatDuration(durationMillis),
      fuelConsumptionMicroliters:
        route.travelAdvisory?.fuelConsumptionMicroliters ?? null,
      path:
        pathPoints.length >= 2
          ? pathPoints
          : [
              pickupPlace.value!.location,
              dropoffPlace.value!.location,
            ],
    };
  }

  function drawTripPolylines(): void {
    if (!libs || !map) return;
    const { Polyline } = libs.maps;

    fastestPolyline?.setMap(null);
    ecoPolyline?.setMap(null);

    if (fastestRoute.value) {
      fastestPolyline = new Polyline({
        map,
        path: fastestRoute.value.path,
        geodesic: true,
        strokeColor: '#2563EB',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        zIndex: 3,
      });
    }

    if (ecoRoute.value && !ecoRoute.value.isSharedWithFastest) {
      ecoPolyline = new Polyline({
        map,
        path: ecoRoute.value.path,
        geodesic: true,
        strokeColor: '#10B981',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        zIndex: 4,
      });
    } else {
      ecoPolyline = null;
    }

    updatePolylineStyles();
  }

  function updatePolylineStyles(): void {
    const ecoActive = selectedRouteKind.value === 'eco';
    if (fastestPolyline) {
      fastestPolyline.setOptions({
        strokeColor: ecoActive && ecoRoute.value?.isSharedWithFastest ? '#10B981' : '#2563EB',
        strokeWeight: ecoActive && !ecoRoute.value?.isSharedWithFastest ? 4 : 6,
        strokeOpacity: ecoActive && !ecoRoute.value?.isSharedWithFastest ? 0.5 : 0.94,
        zIndex: ecoActive && !ecoRoute.value?.isSharedWithFastest ? 2 : 5,
      });
    }
    if (ecoPolyline) {
      ecoPolyline.setOptions({
        strokeWeight: ecoActive ? 6 : 4,
        strokeOpacity: ecoActive ? 0.95 : 0.55,
        zIndex: ecoActive ? 5 : 2,
      });
    }
  }

  function updateEndpointMarkers(): void {
    if (!libs || !map || !pickupPlace.value || !dropoffPlace.value) return;
    const { AdvancedMarkerElement, PinElement } = libs.marker;

    if (!pickupMarker) {
      const pin = new PinElement({
        background: '#2563EB',
        borderColor: '#1E40AF',
        glyphText: 'A',
        glyphColor: '#FFFFFF',
        scale: 1.15,
      });
      pickupMarker = new AdvancedMarkerElement({
        map,
        position: pickupPlace.value.location,
        title: `Pickup: ${pickupPlace.value.displayName}`,
        zIndex: 20,
      });
      pickupMarker.append(pin);
    } else {
      pickupMarker.position = pickupPlace.value.location;
      pickupMarker.title = `Pickup: ${pickupPlace.value.displayName}`;
    }

    if (!dropoffMarker) {
      const pin = new PinElement({
        background: '#E11D48',
        borderColor: '#9F1239',
        glyphText: 'B',
        glyphColor: '#FFFFFF',
        scale: 1.15,
      });
      dropoffMarker = new AdvancedMarkerElement({
        map,
        position: dropoffPlace.value.location,
        title: `Drop-off: ${dropoffPlace.value.displayName}`,
        zIndex: 20,
      });
      dropoffMarker.append(pin);
    } else {
      dropoffMarker.position = dropoffPlace.value.location;
      dropoffMarker.title = `Drop-off: ${dropoffPlace.value.displayName}`;
    }
  }

  function renderCandidateDriverMarkers(): void {
    if (!libs || !map) return;
    const { AdvancedMarkerElement } = libs.marker;

    candidateMarkers.forEach((m) => {
      m.map = null;
    });
    candidateMarkers = candidateDrivers.value.map((driver, idx) => {
      const marker = new AdvancedMarkerElement({
        map,
        position: driver.position,
        title: `${driver.name} · ${driver.vehicleModel}`,
        zIndex: 10,
      });
      marker.append(createCandidateDotElement(`${idx + 1}`));
      return marker;
    });
  }

  async function evaluateDriversAndApproach(): Promise<void> {
    if (!libs || !map || !pickupPlace.value) return;

    const ranked = await rankDriversWithRouteMatrix(
      INITIAL_CANDIDATE_DRIVERS,
      pickupPlace.value.location,
      libs.routes,
      libs.geometry,
    );

    candidateDrivers.value = ranked;
    activeDriver.value = ranked[0];

    try {
      const { Route, RoutingPreference, TravelMode } = libs.routes;
      const { routes } = await Route.computeRoutes({
        origin: activeDriver.value.position,
        destination: pickupPlace.value.location,
        travelMode: TravelMode.DRIVING,
        routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
        fields: ['distanceMeters', 'durationMillis', 'path'],
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      });

      const approach = routes?.[0];
      if (approach?.path && approach.path.length >= 2) {
        approachPathPoints = approach.path.map((pt) => ({
          lat: pt.lat,
          lng: pt.lng,
        }));
        approachDistanceMeters =
          approach.distanceMeters ??
          activeDriver.value.distanceToPickupMeters ??
          1200;
        approachDurationSeconds = Math.max(
          30,
          Math.round(
            (approach.durationMillis ??
              (activeDriver.value.etaToPickupSeconds ?? 180) * 1000) / 1000,
          ),
        );
      } else {
        approachPathPoints = [
          activeDriver.value.position,
          pickupPlace.value.location,
        ];
        approachDistanceMeters =
          activeDriver.value.distanceToPickupMeters ?? 1200;
        approachDurationSeconds =
          activeDriver.value.etaToPickupSeconds ?? 180;
      }
    } catch {
      approachPathPoints = [
        activeDriver.value.position,
        pickupPlace.value.location,
      ];
      approachDistanceMeters =
        activeDriver.value.distanceToPickupMeters ?? 1200;
      approachDurationSeconds = activeDriver.value.etaToPickupSeconds ?? 180;
    }

    approachPolyline?.setMap(null);
    approachPolyline = new libs.maps.Polyline({
      map,
      path: approachPathPoints,
      geodesic: true,
      strokeColor: '#F59E0B',
      strokeOpacity: 0.88,
      strokeWeight: 4,
      zIndex: 6,
    });
  }

  function fitMapToTrip(): void {
    if (!libs || !map || !pickupPlace.value || !dropoffPlace.value) return;
    const bounds = new libs.core.LatLngBounds();
    bounds.extend(pickupPlace.value.location);
    bounds.extend(dropoffPlace.value.location);
    fastestRoute.value?.path.forEach((pt) => bounds.extend(pt));
    ecoRoute.value?.path.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 88, left: 48 });
  }

  function ensureDriverMarker(initialPos: LatLngPoint): void {
    if (!libs || !map) return;
    const { AdvancedMarkerElement } = libs.marker;

    if (!driverMarker) {
      driverDom = createDriverCarElement(activeDriver.value.etaText);
      driverMarker = new AdvancedMarkerElement({
        map,
        position: initialPos,
        title: `Dispatched Driver: ${activeDriver.value.name}`,
        zIndex: 50,
      });
      driverMarker.append(driverDom.root);
    } else {
      driverMarker.position = initialPos;
      driverMarker.title = `Dispatched Driver: ${activeDriver.value.name}`;
    }
  }

  function dispatchClosestDriver(): void {
    if (!libs || !activeRoute.value || approachPathPoints.length < 2) return;
    stopAnimationLoop();

    const spherical = libs.geometry.spherical;
    const approachSegs = buildSegments(approachPathPoints, spherical);
    const tripPath = activeRoute.value.path;
    const tripSegs = buildSegments(tripPath, spherical);

    ensureDriverMarker(approachPathPoints[0]);

    phaseElapsedSec = 0;
    atPickupPauseSec = 0;
    lastFrameTs = 0;

    telemetry.value = {
      phase: 'approaching_pickup',
      isRunning: true,
      progressPercent: 0,
      remainingSeconds: approachDurationSeconds,
      remainingMeters: approachDistanceMeters,
      currentHeading: approachSegs.segments[0]?.heading ?? 0,
      currentPosition: approachPathPoints[0],
      statusLabel: `${activeDriver.value.name} en route to pickup`,
    };

    const tick = (ts: number) => {
      if (!telemetry.value.isRunning) return;
      if (lastFrameTs === 0) {
        lastFrameTs = ts;
      }
      const dt = Math.min(0.1, (ts - lastFrameTs) / 1000);
      lastFrameTs = ts;

      if (telemetry.value.phase === 'approaching_pickup') {
        phaseElapsedSec += dt;
        const frac = Math.min(1, phaseElapsedSec / APPROACH_SIM_DURATION_SEC);
        const sample = sampleAlongSegments(
          approachSegs.segments,
          approachSegs.totalMeters,
          frac,
          spherical,
        );
        updateDriverMarkerVisual(sample.position, sample.heading);

        const remSec = Math.max(0, Math.round(approachDurationSeconds * (1 - frac)));
        const remMeters = Math.max(0, Math.round(approachDistanceMeters * (1 - frac)));

        telemetry.value = {
          ...telemetry.value,
          progressPercent: Math.round(frac * 100),
          remainingSeconds: remSec,
          remainingMeters: remMeters,
          currentHeading: sample.heading,
          currentPosition: sample.position,
          statusLabel: `${activeDriver.value.name} en route to pickup`,
        };

        if (driverDom) {
          driverDom.pill.textContent =
            remSec > 60 ? `${Math.ceil(remSec / 60)} min away` : `${remSec}s away`;
        }

        if (frac >= 1) {
          telemetry.value.phase = 'at_pickup';
          telemetry.value.statusLabel = 'Arrived at pickup · Rider boarding';
          atPickupPauseSec = 0;
          if (driverDom) {
            driverDom.pill.textContent = 'At Pickup';
          }
        }
      } else if (telemetry.value.phase === 'at_pickup') {
        atPickupPauseSec += dt;
        if (atPickupPauseSec >= 1.2) {
          telemetry.value.phase = 'on_trip';
          phaseElapsedSec = 0;
          approachPolyline?.setMap(null);
        }
      } else if (telemetry.value.phase === 'on_trip') {
        phaseElapsedSec += dt;
        const route = activeRoute.value;
        const tripDurationSec = Math.max(
          60,
          Math.round((route?.durationMillis ?? 900000) / 1000),
        );
        const tripDistanceMeters = route?.distanceMeters ?? 12000;

        const frac = Math.min(1, phaseElapsedSec / TRIP_SIM_DURATION_SEC);
        const sample = sampleAlongSegments(
          tripSegs.segments,
          tripSegs.totalMeters,
          frac,
          spherical,
        );
        updateDriverMarkerVisual(sample.position, sample.heading);

        const remSec = Math.max(0, Math.round(tripDurationSec * (1 - frac)));
        const remMeters = Math.max(0, Math.round(tripDistanceMeters * (1 - frac)));

        telemetry.value = {
          ...telemetry.value,
          progressPercent: Math.round(frac * 100),
          remainingSeconds: remSec,
          remainingMeters: remMeters,
          currentHeading: sample.heading,
          currentPosition: sample.position,
          statusLabel: `On ${route?.label ?? 'Active'} trip to drop-off`,
        };

        if (driverDom) {
          driverDom.pill.textContent =
            remSec > 60 ? `${Math.ceil(remSec / 60)} min ETA` : `${remSec}s ETA`;
        }

        if (frac >= 1) {
          telemetry.value = {
            ...telemetry.value,
            phase: 'arrived',
            isRunning: false,
            progressPercent: 100,
            remainingSeconds: 0,
            remainingMeters: 0,
            statusLabel: 'Arrived at destination',
          };
          if (driverDom) {
            driverDom.pill.textContent = 'Arrived';
          }
          stopAnimationLoop();
          return;
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
  }

  function updateDriverMarkerVisual(pos: LatLngPoint, heading: number): void {
    if (driverMarker) {
      driverMarker.position = pos;
    }
    if (driverDom) {
      driverDom.iconWrap.style.transform = `rotate(${Math.round(heading)}deg)`;
    }
  }

  function toggleSimulation(): void {
    if (telemetry.value.phase === 'arrived' || telemetry.value.phase === 'idle') {
      dispatchClosestDriver();
      return;
    }

    if (telemetry.value.isRunning) {
      telemetry.value.isRunning = false;
      stopAnimationLoop();
    } else {
      resumeSimulation();
    }
  }

  function resumeSimulation(): void {
    if (!libs || !activeRoute.value) return;
    const spherical = libs.geometry.spherical;
    const approachSegs = buildSegments(approachPathPoints, spherical);
    const tripSegs = buildSegments(activeRoute.value.path, spherical);

    telemetry.value.isRunning = true;
    lastFrameTs = 0;

    const tick = (ts: number) => {
      if (!telemetry.value.isRunning) return;
      if (lastFrameTs === 0) lastFrameTs = ts;
      const dt = Math.min(0.1, (ts - lastFrameTs) / 1000);
      lastFrameTs = ts;

      if (telemetry.value.phase === 'approaching_pickup') {
        phaseElapsedSec += dt;
        const frac = Math.min(1, phaseElapsedSec / APPROACH_SIM_DURATION_SEC);
        const sample = sampleAlongSegments(
          approachSegs.segments,
          approachSegs.totalMeters,
          frac,
          spherical,
        );
        updateDriverMarkerVisual(sample.position, sample.heading);
        const remSec = Math.max(0, Math.round(approachDurationSeconds * (1 - frac)));
        const remMeters = Math.max(0, Math.round(approachDistanceMeters * (1 - frac)));
        telemetry.value = {
          ...telemetry.value,
          progressPercent: Math.round(frac * 100),
          remainingSeconds: remSec,
          remainingMeters: remMeters,
          currentHeading: sample.heading,
          currentPosition: sample.position,
        };
        if (driverDom) {
          driverDom.pill.textContent =
            remSec > 60 ? `${Math.ceil(remSec / 60)} min away` : `${remSec}s away`;
        }
        if (frac >= 1) {
          telemetry.value.phase = 'at_pickup';
          telemetry.value.statusLabel = 'Arrived at pickup · Rider boarding';
          atPickupPauseSec = 0;
        }
      } else if (telemetry.value.phase === 'at_pickup') {
        atPickupPauseSec += dt;
        if (atPickupPauseSec >= 1.2) {
          telemetry.value.phase = 'on_trip';
          phaseElapsedSec = 0;
          approachPolyline?.setMap(null);
        }
      } else if (telemetry.value.phase === 'on_trip') {
        phaseElapsedSec += dt;
        const route = activeRoute.value;
        const tripDurationSec = Math.max(
          60,
          Math.round((route?.durationMillis ?? 900000) / 1000),
        );
        const tripDistanceMeters = route?.distanceMeters ?? 12000;
        const frac = Math.min(1, phaseElapsedSec / TRIP_SIM_DURATION_SEC);
        const sample = sampleAlongSegments(
          tripSegs.segments,
          tripSegs.totalMeters,
          frac,
          spherical,
        );
        updateDriverMarkerVisual(sample.position, sample.heading);
        const remSec = Math.max(0, Math.round(tripDurationSec * (1 - frac)));
        const remMeters = Math.max(0, Math.round(tripDistanceMeters * (1 - frac)));
        telemetry.value = {
          ...telemetry.value,
          progressPercent: Math.round(frac * 100),
          remainingSeconds: remSec,
          remainingMeters: remMeters,
          currentHeading: sample.heading,
          currentPosition: sample.position,
          statusLabel: `On ${route?.label ?? 'Active'} trip to drop-off`,
        };
        if (driverDom) {
          driverDom.pill.textContent =
            remSec > 60 ? `${Math.ceil(remSec / 60)} min ETA` : `${remSec}s ETA`;
        }
        if (frac >= 1) {
          telemetry.value = {
            ...telemetry.value,
            phase: 'arrived',
            isRunning: false,
            progressPercent: 100,
            remainingSeconds: 0,
            remainingMeters: 0,
            statusLabel: 'Arrived at destination',
          };
          if (driverDom) driverDom.pill.textContent = 'Arrived';
          stopAnimationLoop();
          return;
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
  }

  function stopAnimationLoop(): void {
    if (animFrameId != null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  onBeforeUnmount(() => {
    stopAnimationLoop();
    fastestPolyline?.setMap(null);
    ecoPolyline?.setMap(null);
    approachPolyline?.setMap(null);
    candidateMarkers.forEach((m) => {
      m.map = null;
    });
    if (pickupMarker) pickupMarker.map = null;
    if (dropoffMarker) dropoffMarker.map = null;
    if (driverMarker) driverMarker.map = null;
  });

  return {
    isInitializing,
    isRouting,
    errorMessage,
    pickupPlace,
    dropoffPlace,
    emissionType,
    selectedRouteKind,
    selectedTierId,
    fastestRoute,
    ecoRoute,
    activeRoute,
    ecoSummary,
    fareTiers,
    candidateDrivers,
    activeDriver,
    telemetry,
    init,
    swapLocations,
    setEmissionType,
    selectRouteKind,
    selectFareTier,
    dispatchClosestDriver,
    toggleSimulation,
  };
}
