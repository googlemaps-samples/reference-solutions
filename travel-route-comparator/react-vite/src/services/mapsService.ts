import type {
  ComputedRouteOption,
  ElevationProfileSummary,
  PlacePoint,
  RouteModifiersState,
  TravelModeId,
} from '../types/routing';
import {
  computeElevationStats,
  decimatePath,
  DENVER_BOULDER_BOUNDS,
  ECO_ROUTE_COLOR,
  formatDistance,
  formatDuration,
  ROUTE_PALETTE,
  toLatLngLiteral,
} from '../utils/geo';

const ROUTE_FIELDS = [
  'path',
  'distanceMeters',
  'durationMillis',
  'staticDurationMillis',
  'localizedValues',
  'routeLabels',
  'travelAdvisory',
  'warnings',
  'description',
  'legs',
];

export async function searchSeededPlace(
  placesLib: google.maps.PlacesLibrary,
  query: string,
): Promise<PlacePoint> {
  const { places } = await placesLib.Place.searchByText({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: DENVER_BOULDER_BOUNDS,
    language: 'en-US',
    region: 'us',
    maxResultCount: 1,
  });

  const first = places[0];
  const loc = toLatLngLiteral(first?.location);
  if (!first || !loc) {
    throw new Error(`Could not resolve place for query: "${query}"`);
  }

  return {
    id: first.id,
    name: first.displayName ?? query,
    formattedAddress: first.formattedAddress ?? query,
    location: loc,
  };
}

function formatMoney(money?: google.maps.places.Money | null): string | undefined {
  if (!money || money.units === undefined || money.units === null) return undefined;
  const units = Number(money.units);
  const nanos = Number(money.nanos ?? 0) / 1e9;
  const total = units + nanos;
  if (!Number.isFinite(total)) return undefined;
  const currency = money.currencyCode || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(total);
}

function buildRouteLabel(
  routeLabels: string[],
  index: number,
  description?: string,
): string {
  if (routeLabels.includes('FUEL_EFFICIENT')) {
    return 'Eco-Friendly';
  }
  if (routeLabels.includes('DEFAULT_ROUTE')) {
    return description ? `Recommended · ${description}` : 'Recommended';
  }
  if (routeLabels.includes('SHORTER_DISTANCE')) {
    return 'Shorter Distance';
  }
  return description ? `Alt ${index} · ${description}` : `Alternative ${index}`;
}

function extractTransitSummary(route: google.maps.routes.Route): string | undefined {
  const steps = route.legs?.[0]?.steps;
  if (!steps || steps.length === 0) return undefined;
  const lineNames: string[] = [];
  for (const step of steps) {
    const line = step.transitDetails?.transitLine;
    const label = line?.shortName || line?.name;
    if (label && !lineNames.includes(label)) {
      lineNames.push(label);
    }
  }
  return lineNames.length > 0 ? lineNames.join(' → ') : undefined;
}

function mapRouteToOption(
  route: google.maps.routes.Route,
  index: number,
  mode: TravelModeId,
): ComputedRouteOption {
  const path: google.maps.LatLngLiteral[] = [];
  for (const pt of route.path ?? []) {
    const lit = toLatLngLiteral(pt);
    if (lit) path.push(lit);
  }

  const routeLabels = (route.routeLabels ?? []).map((l) => String(l));
  const isEco = routeLabels.includes('FUEL_EFFICIENT');
  const distanceMeters = route.distanceMeters ?? 0;
  const durationSeconds = route.durationMillis ? route.durationMillis / 1000 : 0;
  const staticDurationSeconds = route.staticDurationMillis
    ? route.staticDurationMillis / 1000
    : undefined;

  const tollPrices = route.travelAdvisory?.tollInfo?.estimatedPrices;
  const hasTolls = Boolean(route.travelAdvisory?.tollInfo);
  const tollEstimateText =
    tollPrices && tollPrices.length > 0 ? formatMoney(tollPrices[0]) : undefined;

  const fuelMicroliters = route.travelAdvisory?.fuelConsumptionMicroliters;
  const fuelLiters =
    typeof fuelMicroliters === 'number' && Number.isFinite(fuelMicroliters)
      ? fuelMicroliters / 1_000_000
      : undefined;

  const color = isEco
    ? ECO_ROUTE_COLOR
    : ROUTE_PALETTE[index % ROUTE_PALETTE.length];

  const description = route.description ?? undefined;

  return {
    id: `${mode}-${index}-${routeLabels.join('_')}`,
    index,
    mode,
    label: buildRouteLabel(routeLabels, index, description),
    routeLabels,
    description,
    distanceMeters,
    durationSeconds,
    staticDurationSeconds,
    distanceText: route.localizedValues?.distance || formatDistance(distanceMeters),
    durationText: route.localizedValues?.duration || formatDuration(durationSeconds),
    path,
    hasTolls,
    tollEstimateText,
    fuelLiters,
    transitSummary: mode === 'TRANSIT' ? extractTransitSummary(route) : undefined,
    warnings: route.warnings ?? [],
    color,
    rawRoute: route,
  };
}

export async function computeRoutesForMode(
  routesLib: google.maps.RoutesLibrary,
  origin: PlacePoint,
  destination: PlacePoint,
  mode: TravelModeId,
  modifiers: RouteModifiersState,
): Promise<ComputedRouteOption[]> {
  const baseRequest: google.maps.routes.ComputeRoutesRequest = {
    origin: origin.location,
    destination: destination.location,
    travelMode: mode,
    fields: ROUTE_FIELDS,
    computeAlternativeRoutes: true,
    ...(mode === 'TRANSIT' ? {} : { polylineQuality: 'HIGH_QUALITY' }),
    language: 'en-US',
    region: 'us',
  };

  if (mode === 'DRIVING') {
    if (modifiers.ecoFriendly) {
      // FUEL_EFFICIENT and FUEL_CONSUMPTION strictly require TRAFFIC_AWARE_OPTIMAL
      baseRequest.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
      baseRequest.routeModifiers = {
        avoidTolls: modifiers.avoidTolls,
        avoidHighways: modifiers.avoidHighways,
        vehicleInfo: {
          emissionType: 'GASOLINE' as google.maps.routes.VehicleEmissionType,
        },
      };
      baseRequest.extraComputations = ['TOLLS', 'FUEL_CONSUMPTION'];
      baseRequest.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
    } else {
      baseRequest.routingPreference = 'TRAFFIC_AWARE';
      baseRequest.routeModifiers = {
        avoidTolls: modifiers.avoidTolls,
        avoidHighways: modifiers.avoidHighways,
      };
      baseRequest.extraComputations = ['TOLLS'];
    }
  }

  let routes: google.maps.routes.Route[] | undefined;

  try {
    const result = await routesLib.Route.computeRoutes(baseRequest);
    routes = result.routes;
  } catch (err) {
    // Graceful degradation if a user selects a region where eco-friendly reference routing is unsupported
    if (mode === 'DRIVING' && modifiers.ecoFriendly) {
      const fallbackResult = await routesLib.Route.computeRoutes({
        origin: origin.location,
        destination: destination.location,
        travelMode: 'DRIVING',
        fields: ROUTE_FIELDS,
        computeAlternativeRoutes: true,
        polylineQuality: 'HIGH_QUALITY',
        routingPreference: 'TRAFFIC_AWARE',
        routeModifiers: {
          avoidTolls: modifiers.avoidTolls,
          avoidHighways: modifiers.avoidHighways,
        },
        extraComputations: ['TOLLS'],
        language: 'en-US',
        region: 'us',
      });
      routes = fallbackResult.routes;
    } else {
      throw err;
    }
  }

  if (!routes || routes.length === 0) {
    return [];
  }

  return routes.map((route, idx) => mapRouteToOption(route, idx, mode));
}

export async function fetchElevationProfileForRoute(
  elevationLib: google.maps.ElevationLibrary,
  route: ComputedRouteOption,
  samples = 64,
): Promise<ElevationProfileSummary | null> {
  if (!route.path || route.path.length < 2) {
    return null;
  }
  const sampledInput = decimatePath(route.path, 140);
  const service = new elevationLib.ElevationService();
  const response = await service.getElevationAlongPath({
    path: sampledInput,
    samples,
  });

  return computeElevationStats(response.results, route.distanceMeters);
}
