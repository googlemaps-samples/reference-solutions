import { DALLAS_CENTER, SEED_HUB_QUERY } from '../data/dallasFleet';
import type {
  DispatchLegSummary,
  DispatchRouteResult,
  LatLngPoint,
  LogisticsHub,
  MatrixStopEntry,
} from '../types/logistics';

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '—';
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return '—';
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function toLatLngPoint(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined,
): LatLngPoint | null {
  if (!loc) return null;
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const literal = loc as google.maps.LatLngLiteral;
  if (typeof literal.lat === 'number' && typeof literal.lng === 'number') {
    return { lat: literal.lat, lng: literal.lng };
  }
  return null;
}

export async function discoverDallasHubs(
  placesLib: google.maps.PlacesLibrary,
): Promise<{ depot: LogisticsHub | null; stops: LogisticsHub[]; error: string | null }> {
  try {
    const { places } = await placesLib.Place.searchByText({
      textQuery: SEED_HUB_QUERY,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      locationBias: {
        center: DALLAS_CENTER,
        radius: 25000,
      },
      maxResultCount: 6,
      language: 'en-US',
      region: 'us',
    });

    const hubs: LogisticsHub[] = [];
    for (const place of places ?? []) {
      const point = toLatLngPoint(place.location);
      if (!point) continue;
      hubs.push({
        id: place.id,
        name: place.displayName ?? 'Dallas Logistics Facility',
        address: place.formattedAddress ?? 'Dallas, TX',
        position: point,
        source: 'places-search',
      });
    }

    if (hubs.length === 0) {
      return {
        depot: null,
        stops: [],
        error: 'No Dallas logistics facilities returned by Places API (New).',
      };
    }

    const [firstHub, ...restHubs] = hubs;
    const depot: LogisticsHub = {
      ...firstHub,
      isDepot: true,
    };

    return {
      depot,
      stops: restHubs.slice(0, 4),
      error: null,
    };
  } catch (err) {
    return {
      depot: null,
      stops: [],
      error: err instanceof Error ? err.message : 'Places search failed.',
    };
  }
}

export async function computeDispatchRouteAndMatrix(
  routesLib: google.maps.RoutesLibrary,
  depot: LogisticsHub,
  stops: LogisticsHub[],
  optimizeOrder: boolean,
): Promise<DispatchRouteResult> {
  if (stops.length === 0) {
    return {
      path: [],
      totalDurationText: '0 min',
      totalDistanceText: '0.0 mi',
      optimizedOrderIndices: [],
      orderedStopIds: [],
      legs: [],
      matrixEntries: [],
    };
  }

  const intermediateStops = stops.length > 1 ? stops.slice(0, -1) : [];
  const finalStop = stops[stops.length - 1];
  const canOptimize = optimizeOrder && intermediateStops.length > 1;

  const [routesResponse, matrixResponse] = await Promise.all([
    routesLib.Route.computeRoutes({
      origin: depot.position,
      destination: finalStop.position,
      intermediates:
        intermediateStops.length > 0
          ? intermediateStops.map((stop) => ({
              location: stop.position,
              sideOfRoad: true,
            }))
          : undefined,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      optimizeWaypointOrder: canOptimize,
      fields: [
        'durationMillis',
        'distanceMeters',
        'path',
        'legs',
        'optimizedIntermediateWaypointIndices',
      ],
    }),
    routesLib.RouteMatrix.computeRouteMatrix({
      origins: [depot.position],
      destinations: stops.map((stop) => stop.position),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['condition', 'distanceMeters', 'durationMillis'],
    }),
  ]);

  const route = routesResponse.routes?.[0];
  const rawPath = route?.path ?? [];
  const path: LatLngPoint[] = [];
  for (const pt of rawPath) {
    const converted = toLatLngPoint(pt);
    if (converted) path.push(converted);
  }

  const optimizedIndices =
    canOptimize &&
    Array.isArray(route?.optimizedIntermediateWaypointIndices) &&
    route.optimizedIntermediateWaypointIndices.length === intermediateStops.length
      ? route.optimizedIntermediateWaypointIndices
      : intermediateStops.map((_, idx) => idx);

  const orderedStops: LogisticsHub[] = [
    ...optimizedIndices.map((idx) => intermediateStops[idx]).filter(Boolean),
    finalStop,
  ];

  const legLabels = [depot, ...orderedStops];
  const legs: DispatchLegSummary[] = (route?.legs ?? []).map((leg, index) => {
    const durationSeconds =
      typeof leg.durationMillis === 'number'
        ? Math.round(leg.durationMillis / 1000)
        : 0;
    const distanceMeters = typeof leg.distanceMeters === 'number' ? leg.distanceMeters : 0;
    return {
      legIndex: index,
      fromLabel: legLabels[index]?.name ?? `Stop ${index}`,
      toLabel: legLabels[index + 1]?.name ?? `Stop ${index + 1}`,
      durationSeconds,
      durationText: formatDurationSeconds(durationSeconds),
      distanceMeters,
      distanceText: formatDistanceMeters(distanceMeters),
    };
  });

  const totalSeconds =
    typeof route?.durationMillis === 'number'
      ? Math.round(route.durationMillis / 1000)
      : legs.reduce((sum, l) => sum + l.durationSeconds, 0);
  const totalMeters =
    typeof route?.distanceMeters === 'number'
      ? route.distanceMeters
      : legs.reduce((sum, l) => sum + l.distanceMeters, 0);

  const matrixRow = matrixResponse.matrix?.rows?.[0];
  const matrixEntries: MatrixStopEntry[] = stops.map((stop, idx) => {
    const item = matrixRow?.items?.[idx];
    const durationSeconds =
      typeof item?.durationMillis === 'number' && Number.isFinite(item.durationMillis)
        ? Math.round(item.durationMillis / 1000)
        : null;
    const distanceMeters =
      typeof item?.distanceMeters === 'number' ? item.distanceMeters : null;

    return {
      hubId: stop.id,
      hubName: stop.name,
      address: stop.address,
      durationSeconds,
      durationText: formatDurationSeconds(durationSeconds),
      distanceMeters,
      distanceText: formatDistanceMeters(distanceMeters),
      condition: item?.condition ?? 'ROUTE_EXISTS',
    };
  });

  return {
    path,
    totalDurationText: formatDurationSeconds(totalSeconds),
    totalDistanceText: formatDistanceMeters(totalMeters),
    optimizedOrderIndices: optimizedIndices,
    orderedStopIds: orderedStops.map((s) => s.id),
    legs,
    matrixEntries,
  };
}
