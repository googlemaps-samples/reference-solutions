import { importLibrary } from '@googlemaps/js-api-loader';
import { DALLAS_CENTER } from '../data/dallasFleet';
import type {
  DispatchLegSummary,
  DispatchRouteSummary,
  LatLngPoint,
  LogisticsHub,
  RouteMatrixEntry,
} from '../types/logistics';

export function formatDistanceMeters(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function formatDurationMillis(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) {
    return '0 min';
  }
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

/**
 * Discovers real Dallas distribution centers and logistics hubs at runtime
 * via Places API (New) Place.searchByText.
 */
export async function discoverDallasLogisticsHubs(): Promise<LogisticsHub[]> {
  const { Place } = await importLibrary('places');

  const { places } = await Place.searchByText({
    textQuery: 'distribution center logistics hub Dallas TX',
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: {
      center: DALLAS_CENTER,
      radius: 22000,
    },
    maxResultCount: 6,
    language: 'en-US',
    region: 'us',
  });

  const hubs: LogisticsHub[] = [];
  for (const place of places) {
    if (!place.location || !place.id) {
      continue;
    }
    hubs.push({
      id: `hub-${hubs.length + 1}`,
      placeId: place.id,
      name: place.displayName ?? 'Dallas Logistics Hub',
      address: place.formattedAddress ?? 'Dallas, TX',
      location: {
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
      role: hubs.length === 0 ? 'depot' : 'stop',
    });
  }

  return hubs;
}

/**
 * Computes a multi-stop dispatch corridor polyline and leg ETAs
 * via Routes API (Route.computeRoutes).
 */
export async function computeMultiStopDispatchRoute(
  depot: LogisticsHub,
  stops: LogisticsHub[],
  optimizeOrder: boolean,
): Promise<DispatchRouteSummary | null> {
  if (stops.length === 0) {
    return null;
  }

  const { Route } = await importLibrary('routes');

  const destinationHub = stops[stops.length - 1];
  const intermediateHubs = stops.slice(0, -1);
  const shouldOptimize = optimizeOrder && intermediateHubs.length > 0;

  const { routes } = await Route.computeRoutes({
    origin: depot.location,
    destination: destinationHub.location,
    intermediates: intermediateHubs.map((stop) => ({
      location: stop.location,
      vehicleStopover: true,
    })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: shouldOptimize,
    fields: [
      'durationMillis',
      'distanceMeters',
      'path',
      'legs',
      'optimizedIntermediateWaypointIndices',
      'localizedValues',
    ],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const route = routes?.[0];
  if (!route) {
    return null;
  }

  const path: LatLngPoint[] = (route.path ?? []).map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
  }));

  const optimizedIndices = route.optimizedIntermediateWaypointIndices ?? [];
  const orderedIntermediates =
    shouldOptimize && optimizedIndices.length === intermediateHubs.length
      ? optimizedIndices.map((idx) => intermediateHubs[idx])
      : intermediateHubs;

  const orderedSequence = [depot, ...orderedIntermediates, destinationHub];

  const legs: DispatchLegSummary[] = (route.legs ?? []).map((leg, idx) => {
    const distMeters = leg.distanceMeters ?? 0;
    const durMillis = leg.durationMillis ?? 0;
    const fromHub = orderedSequence[idx];
    const toHub = orderedSequence[idx + 1];

    return {
      legIndex: idx + 1,
      fromName: fromHub?.name ?? `Waypoint ${idx}`,
      toName: toHub?.name ?? `Stop ${idx + 1}`,
      distanceMeters: distMeters,
      durationMillis: durMillis,
      distanceText: leg.localizedValues?.distance ?? formatDistanceMeters(distMeters),
      durationText: leg.localizedValues?.duration ?? formatDurationMillis(durMillis),
    };
  });

  const totalDistanceMeters = route.distanceMeters ?? 0;
  const totalDurationMillis = route.durationMillis ?? 0;

  return {
    path,
    totalDistanceMeters,
    totalDurationMillis,
    totalDistanceText:
      route.localizedValues?.distance ?? formatDistanceMeters(totalDistanceMeters),
    totalDurationText:
      route.localizedValues?.duration ?? formatDurationMillis(totalDurationMillis),
    optimizedStopIndices: optimizedIndices,
    legs,
  };
}

/**
 * Computes an origin-to-hub travel-time and distance matrix
 * via Routes API (RouteMatrix.computeRouteMatrix).
 */
export async function computeDispatchMatrix(
  origins: Array<{ id: string; label: string; location: LatLngPoint }>,
  destinations: LogisticsHub[],
): Promise<RouteMatrixEntry[]> {
  if (origins.length === 0 || destinations.length === 0) {
    return [];
  }

  const [{ RouteMatrix }, { UnitSystem }] = await Promise.all([
    importLibrary('routes'),
    importLibrary('core'),
  ]);

  const { matrix } = await RouteMatrix.computeRouteMatrix({
    origins: origins.map((o) => o.location),
    destinations: destinations.map((d) => d.location),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    units: UnitSystem.IMPERIAL,
    fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const entries: RouteMatrixEntry[] = [];
  matrix.rows.forEach((row, originIdx) => {
    const origin = origins[originIdx];
    row.items.forEach((item, destIdx) => {
      const dest = destinations[destIdx];
      const distMeters = item.distanceMeters ?? null;
      const durMillis = item.durationMillis ?? null;

      entries.push({
        originId: origin.id,
        originLabel: origin.label,
        destinationId: dest.id,
        destinationName: dest.name,
        distanceMeters: distMeters,
        durationMillis: durMillis,
        distanceText:
          item.localizedValues?.distance ??
          (distMeters !== null ? formatDistanceMeters(distMeters) : '--'),
        durationText:
          item.localizedValues?.duration ??
          (durMillis !== null ? formatDurationMillis(durMillis) : '--'),
        condition: item.condition ?? 'ROUTE_EXISTS',
      });
    });
  });

  return entries;
}
