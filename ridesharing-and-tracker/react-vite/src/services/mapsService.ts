import { formatDuration, formatMiles } from '../data/drivers';
import type {
  CandidateDriver,
  ComputedRouteData,
  EmissionType,
  ResolvedPlace,
  RouteComparisonResult,
  RouteKind,
} from '../types/rideshare';

const LA_SEARCH_CENTER: google.maps.LatLngLiteral = {
  lat: 34.0522,
  lng: -118.2437,
};

function toLatLngLiteral(
  pt: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude
): google.maps.LatLngLiteral {
  const anyPt = pt as unknown as {
    lat: number | (() => number);
    lng: number | (() => number);
  };
  return {
    lat: typeof anyPt.lat === 'function' ? anyPt.lat() : anyPt.lat,
    lng: typeof anyPt.lng === 'function' ? anyPt.lng() : anyPt.lng,
  };
}

/**
 * Resolves a Los Angeles location query via Places API (New) Place.searchByText.
 */
export async function resolvePlaceByText(
  placesLib: google.maps.PlacesLibrary,
  query: string
): Promise<ResolvedPlace | null> {
  const { places } = await placesLib.Place.searchByText({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: {
      center: LA_SEARCH_CENTER,
      radius: 50000,
    },
    language: 'en-US',
    region: 'us',
    maxResultCount: 1,
  });

  if (!places || places.length === 0) {
    return null;
  }

  const place = places[0];
  if (!place.location) {
    return null;
  }

  return {
    id: place.id,
    name: place.displayName ?? query,
    address: place.formattedAddress ?? query,
    location: toLatLngLiteral(place.location),
  };
}

function mapRouteToData(
  route: google.maps.routes.Route,
  kind: RouteKind
): ComputedRouteData {
  const distanceMeters = route.distanceMeters ?? 0;
  const durationMillis = route.durationMillis ?? 0;
  const staticDurationMillis = route.staticDurationMillis ?? durationMillis;
  const rawPath = route.path ?? [];
  const path = rawPath.map(toLatLngLiteral);
  const fuelRaw = route.travelAdvisory?.fuelConsumptionMicroliters;
  const fuelConsumptionMicroliters =
    typeof fuelRaw === 'number' && Number.isFinite(fuelRaw) ? fuelRaw : null;

  return {
    kind,
    label: kind === 'fastest' ? 'Fastest Route' : 'Eco-Friendly Route',
    description:
      route.description && route.description.trim().length > 0
        ? route.description
        : kind === 'fastest'
          ? 'Traffic-aware optimal corridor'
          : 'Fuel & energy optimized corridor',
    distanceMeters,
    durationMillis,
    staticDurationMillis,
    distanceText: route.localizedValues?.distance ?? formatMiles(distanceMeters),
    durationText: route.localizedValues?.duration ?? formatDuration(durationMillis),
    fuelConsumptionMicroliters,
    path,
    routeLabels: route.routeLabels ? [...route.routeLabels] : [],
  };
}

/**
 * Computes both the traffic-aware fastest route (DEFAULT_ROUTE) and
 * the fuel/energy-optimized route (FUEL_EFFICIENT) using Route.computeRoutes.
 */
export async function computeRideshareRoutes(
  routesLib: google.maps.RoutesLibrary,
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  emissionType: EmissionType
): Promise<RouteComparisonResult> {
  const { routes } = await routesLib.Route.computeRoutes({
    origin,
    destination,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    requestedReferenceRoutes: ['FUEL_EFFICIENT'],
    extraComputations: ['FUEL_CONSUMPTION'],
    routeModifiers: {
      vehicleInfo: {
        emissionType,
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
      'description',
    ],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  if (!routes || routes.length === 0) {
    throw new Error('No driving routes returned for the selected locations.');
  }

  const defaultRoute =
    routes.find((r) => r.routeLabels?.includes('DEFAULT_ROUTE')) ?? routes[0];
  const ecoRoute =
    routes.find((r) => r.routeLabels?.includes('FUEL_EFFICIENT')) ??
    routes[routes.length - 1];

  const isSameRoute =
    routes.length === 1 ||
    (defaultRoute === ecoRoute &&
      defaultRoute.routeLabels?.includes('FUEL_EFFICIENT') === true);

  return {
    fastest: mapRouteToData(defaultRoute, 'fastest'),
    eco: mapRouteToData(ecoRoute, 'eco'),
    isSameRoute,
  };
}

/**
 * Evaluates all nearby candidate drivers to the passenger pickup location via
 * RouteMatrix.computeRouteMatrix and returns the ranked list (closest ETA first).
 */
export async function rankCandidateDrivers(
  routesLib: google.maps.RoutesLibrary,
  drivers: CandidateDriver[],
  pickupLocation: google.maps.LatLngLiteral
): Promise<CandidateDriver[]> {
  if (drivers.length === 0) {
    return [];
  }

  const { matrix } = await routesLib.RouteMatrix.computeRouteMatrix({
    origins: drivers.map((d) => d.initialLocation),
    destinations: [pickupLocation],
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const enriched = drivers.map((driver, idx) => {
    const item = matrix.rows?.[idx]?.items?.[0];
    const hasRoute = item?.condition === 'ROUTE_EXISTS';
    return {
      ...driver,
      etaMillis:
        hasRoute && typeof item?.durationMillis === 'number'
          ? item.durationMillis
          : undefined,
      distanceMeters:
        hasRoute && typeof item?.distanceMeters === 'number'
          ? item.distanceMeters
          : undefined,
    };
  });

  return enriched.sort((a, b) => {
    const etaA = a.etaMillis ?? Number.MAX_SAFE_INTEGER;
    const etaB = b.etaMillis ?? Number.MAX_SAFE_INTEGER;
    if (etaA !== etaB) return etaA - etaB;
    return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER);
  });
}

/**
 * Computes the approach route from the dispatched driver's location to pickup.
 */
export async function computeDriverApproachRoute(
  routesLib: google.maps.RoutesLibrary,
  driverLocation: google.maps.LatLngLiteral,
  pickupLocation: google.maps.LatLngLiteral
): Promise<{
  path: google.maps.LatLngLiteral[];
  durationMillis: number;
  distanceMeters: number;
}> {
  const { routes } = await routesLib.Route.computeRoutes({
    origin: driverLocation,
    destination: pickupLocation,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    fields: ['distanceMeters', 'durationMillis', 'path'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const route = routes?.[0];
  if (!route || !route.path || route.path.length === 0) {
    return {
      path: [driverLocation, pickupLocation],
      durationMillis: 180_000,
      distanceMeters: 1500,
    };
  }

  return {
    path: route.path.map(toLatLngLiteral),
    durationMillis: route.durationMillis ?? 180_000,
    distanceMeters: route.distanceMeters ?? 1500,
  };
}
