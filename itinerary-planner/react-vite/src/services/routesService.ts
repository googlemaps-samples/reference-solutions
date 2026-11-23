import type {
  PlaceItem,
  RouteLegSummary,
  RouteSummaryState,
  TravelModeOption,
} from '../types/itinerary';

export interface ComputedDayRoutes {
  routes: google.maps.routes.Route[];
  summary: RouteSummaryState;
  reorderedStops?: PlaceItem[];
}

export async function computeDayItineraryRoute(
  routesLib: google.maps.RoutesLibrary,
  stops: PlaceItem[],
  travelMode: TravelModeOption,
  optimizeOrder: boolean,
): Promise<ComputedDayRoutes> {
  if (stops.length < 2) {
    return {
      routes: [],
      summary: {
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
        legs: [],
        isComputing: false,
        isOptimized: false,
        note:
          stops.length === 1
            ? 'Add at least 1 more stop to compute a route.'
            : 'Add stops to compute a multi-stop route.',
        error: null,
      },
    };
  }

  const { Route } = routesLib;

  // Routes API does not support intermediate waypoints in TRANSIT mode.
  // Compute consecutive leg-by-leg transit segments when >2 stops are selected.
  if (travelMode === 'TRANSIT' && stops.length > 2) {
    const legRoutes: google.maps.routes.Route[] = [];
    const legs: RouteLegSummary[] = [];
    let totalDistanceMeters = 0;
    let totalDurationMillis = 0;

    for (let i = 0; i < stops.length - 1; i += 1) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];
      const result = await Route.computeRoutes({
        origin: fromStop.location,
        destination: toStop.location,
        travelMode: 'TRANSIT',
        fields: ['distanceMeters', 'durationMillis', 'legs', 'path', 'localizedValues'],
      });

      const segment = result.routes?.[0];
      if (segment) {
        legRoutes.push(segment);
        const leg = segment.legs?.[0];
        const dist = segment.distanceMeters ?? leg?.distanceMeters ?? 0;
        const dur = segment.durationMillis ?? leg?.durationMillis ?? 0;
        totalDistanceMeters += dist;
        totalDurationMillis += dur;
        legs.push({
          fromName: fromStop.displayName,
          toName: toStop.displayName,
          distanceMeters: dist,
          durationMillis: dur,
          distanceText: leg?.localizedValues?.distance ?? undefined,
          durationText: leg?.localizedValues?.duration ?? undefined,
        });
      } else {
        legs.push({
          fromName: fromStop.displayName,
          toName: toStop.displayName,
          distanceMeters: 0,
          durationMillis: 0,
        });
      }
    }

    return {
      routes: legRoutes,
      summary: {
        totalDistanceMeters,
        totalDurationMillis,
        legs,
        isComputing: false,
        isOptimized: false,
        note: 'Transit mode routes each leg sequentially. Switch to Drive or Walk to optimize stop order.',
        error: null,
      },
    };
  }

  const intermediates =
    stops.length > 2
      ? stops.slice(1, -1).map((stop) => ({
          location: stop.location,
        }))
      : undefined;

  const canOptimize = optimizeOrder && stops.length >= 3;
  const fields = [
    'distanceMeters',
    'durationMillis',
    'legs',
    'path',
    'localizedValues',
    'viewport',
  ];
  if (canOptimize) {
    fields.push('optimizedIntermediateWaypointIndices');
  }

  const response = await Route.computeRoutes({
    origin: stops[0].location,
    destination: stops[stops.length - 1].location,
    intermediates,
    travelMode,
    optimizeWaypointOrder: canOptimize,
    fields,
  });

  const route = response.routes?.[0];
  if (!route) {
    return {
      routes: [],
      summary: {
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
        legs: [],
        isComputing: false,
        isOptimized: false,
        note: null,
        error: 'No route found between the selected stops for this travel mode.',
      },
    };
  }

  let effectiveStops = stops;
  let wasReordered = false;

  if (
    canOptimize &&
    route.optimizedIntermediateWaypointIndices &&
    route.optimizedIntermediateWaypointIndices.length === stops.length - 2
  ) {
    const middleStops = stops.slice(1, -1);
    const reorderedMiddle = route.optimizedIntermediateWaypointIndices.map(
      (idx) => middleStops[idx],
    );
    effectiveStops = [stops[0], ...reorderedMiddle, stops[stops.length - 1]];
    wasReordered = true;
  }

  const legs: RouteLegSummary[] = (route.legs ?? []).map((leg, index) => ({
    fromName: effectiveStops[index]?.displayName ?? `Stop ${index + 1}`,
    toName: effectiveStops[index + 1]?.displayName ?? `Stop ${index + 2}`,
    distanceMeters: leg.distanceMeters ?? 0,
    durationMillis: leg.durationMillis ?? 0,
    distanceText: leg.localizedValues?.distance ?? undefined,
    durationText: leg.localizedValues?.duration ?? undefined,
  }));

  return {
    routes: [route],
    reorderedStops: wasReordered ? effectiveStops : undefined,
    summary: {
      totalDistanceMeters: route.distanceMeters ?? 0,
      totalDurationMillis: route.durationMillis ?? 0,
      legs,
      isComputing: false,
      isOptimized: canOptimize,
      note: wasReordered
        ? 'Intermediate stops reordered for the fastest route.'
        : canOptimize
          ? 'Current stop order is already optimal.'
          : null,
      error: null,
    },
  };
}
