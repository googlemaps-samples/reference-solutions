import type {
  ComputedRouteResult,
  ItineraryStop,
  RouteLegSummary,
  TravelModeKey,
} from '../types/itinerary';
import { GMP_ATTRIBUTION_ID } from './mapsLoader';

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0 km';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) {
    return '0 min';
  }
  const totalMinutes = Math.round(millis / 60000);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function toJsTravelMode(
  routesLib: google.maps.RoutesLibrary,
  mode: TravelModeKey
): google.maps.TravelModeString {
  switch (mode) {
    case 'WALK':
      return routesLib.Route ? 'WALKING' : 'WALKING';
    case 'TRANSIT':
      return 'TRANSIT';
    case 'DRIVE':
    default:
      return 'DRIVING';
  }
}

export async function computeDayRoute(
  routesLib: google.maps.RoutesLibrary,
  coreLib: google.maps.CoreLibrary,
  stops: ItineraryStop[],
  travelMode: TravelModeKey,
  dayColor: string,
  optimizeWaypointOrder: boolean
): Promise<ComputedRouteResult> {
  if (stops.length < 2) {
    return {
      polylines: [],
      totalDistanceMeters: 0,
      totalDurationMillis: 0,
      distanceText: '0 km',
      durationText: '0 min',
      legs: [],
      optimizedIntermediateIndices: [],
      bounds: null,
      notice: stops.length === 1 ? 'Add at least 2 stops to compute a route.' : null,
    };
  }

  const { Route } = routesLib;
  const { LatLngBounds } = coreLib;
  const bounds = new LatLngBounds();
  stops.forEach((s) => bounds.extend(s.place.location));

  // Routes API TRANSIT mode does not support intermediate waypoints in a single call.
  // Compute consecutive pairs for multi-stop transit itineraries.
  if (travelMode === 'TRANSIT' && stops.length > 2) {
    if (optimizeWaypointOrder && stops.length >= 3) {
      // Optimize stop ordering using DRIVING first, then return the optimized indices
      const optResp = await Route.computeRoutes({
        origin: stops[0].place.location,
        destination: stops[stops.length - 1].place.location,
        intermediates: stops.slice(1, -1).map((s) => ({ location: s.place.location })),
        travelMode: 'DRIVING',
        optimizeWaypointOrder: true,
        fields: ['optimizedIntermediateWaypointIndices'],
        internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
      });
      const optIndices = optResp.routes?.[0]?.optimizedIntermediateWaypointIndices ?? [];
      if (optIndices.length > 0) {
        return {
          polylines: [],
          totalDistanceMeters: 0,
          totalDurationMillis: 0,
          distanceText: '—',
          durationText: '—',
          legs: [],
          optimizedIntermediateIndices: optIndices,
          bounds,
          notice: 'Reordered intermediate stops for shortest route before recalculating transit legs.',
        };
      }
    }

    const polylines: google.maps.Polyline[] = [];
    const legs: RouteLegSummary[] = [];
    let totalDistanceMeters = 0;
    let totalDurationMillis = 0;

    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      try {
        const resp = await Route.computeRoutes({
          origin: from.place.location,
          destination: to.place.location,
          travelMode: 'TRANSIT',
          fields: ['path', 'legs', 'distanceMeters', 'durationMillis', 'viewport'],
          internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
        });
        const route = resp.routes?.[0];
        if (route) {
          const dist = route.distanceMeters ?? 0;
          const dur = Number.isFinite(route.durationMillis) ? (route.durationMillis ?? 0) : 0;
          totalDistanceMeters += dist;
          totalDurationMillis += dur;
          legs.push({
            fromName: from.place.displayName,
            toName: to.place.displayName,
            distanceMeters: dist,
            durationMillis: dur,
            distanceText: formatDistance(dist),
            durationText: formatDuration(dur),
          });
          const segPolylines = route.createPolylines({
            polylineOptions: {
              strokeColor: dayColor,
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });
          polylines.push(...segPolylines);
          if (route.viewport) {
            bounds.union(route.viewport);
          }
        }
      } catch {
        // Skip unavailable transit leg gracefully
      }
    }

    return {
      polylines,
      totalDistanceMeters,
      totalDurationMillis,
      distanceText: formatDistance(totalDistanceMeters),
      durationText: formatDuration(totalDurationMillis),
      legs,
      optimizedIntermediateIndices: [],
      bounds,
      notice:
        legs.length < stops.length - 1
          ? 'Some transit segments were unavailable; showing available legs.'
          : null,
    };
  }

  const jsMode = toJsTravelMode(routesLib, travelMode);
  const canOptimize = optimizeWaypointOrder && stops.length >= 3 && jsMode !== 'TRANSIT';

  const request: google.maps.routes.ComputeRoutesRequest = {
    origin: stops[0].place.location,
    destination: stops[stops.length - 1].place.location,
    travelMode: jsMode,
    fields: canOptimize
      ? [
          'path',
          'legs',
          'distanceMeters',
          'durationMillis',
          'viewport',
          'optimizedIntermediateWaypointIndices',
        ]
      : ['path', 'legs', 'distanceMeters', 'durationMillis', 'viewport'],
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
  };

  if (stops.length > 2) {
    request.intermediates = stops.slice(1, -1).map((s) => ({
      location: s.place.location,
    }));
  }

  if (canOptimize) {
    request.optimizeWaypointOrder = true;
  }

  const { routes } = await Route.computeRoutes(request);
  const route = routes?.[0];

  if (!route) {
    return {
      polylines: [],
      totalDistanceMeters: 0,
      totalDurationMillis: 0,
      distanceText: '0 km',
      durationText: '0 min',
      legs: [],
      optimizedIntermediateIndices: [],
      bounds,
      notice: 'No route found for these stops in the selected travel mode.',
    };
  }

  const polylines = route.createPolylines({
    polylineOptions: {
      strokeColor: dayColor,
      strokeOpacity: 0.92,
      strokeWeight: 5,
    },
  });

  if (route.viewport) {
    bounds.union(route.viewport);
  }

  const rawLegs = route.legs ?? [];
  const legs: RouteLegSummary[] = rawLegs.map((leg, idx) => {
    const dist = leg.distanceMeters ?? 0;
    const dur = Number.isFinite(leg.durationMillis) ? (leg.durationMillis ?? 0) : 0;
    return {
      fromName: stops[idx]?.place.displayName ?? `Stop ${idx + 1}`,
      toName: stops[idx + 1]?.place.displayName ?? `Stop ${idx + 2}`,
      distanceMeters: dist,
      durationMillis: dur,
      distanceText: formatDistance(dist),
      durationText: formatDuration(dur),
    };
  });

  const totalDistanceMeters = route.distanceMeters ?? legs.reduce((acc, l) => acc + l.distanceMeters, 0);
  const totalDurationMillis = Number.isFinite(route.durationMillis)
    ? (route.durationMillis ?? 0)
    : legs.reduce((acc, l) => acc + l.durationMillis, 0);

  return {
    polylines,
    totalDistanceMeters,
    totalDurationMillis,
    distanceText: formatDistance(totalDistanceMeters),
    durationText: formatDuration(totalDurationMillis),
    legs,
    optimizedIntermediateIndices: route.optimizedIntermediateWaypointIndices
      ? [...route.optimizedIntermediateWaypointIndices]
      : [],
    bounds,
    notice:
      travelMode === 'WALK'
        ? 'Walking routes are in beta; verify pedestrian paths and sidewalks locally.'
        : null,
  };
}
