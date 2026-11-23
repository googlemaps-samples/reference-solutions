import type {
  ActiveDispatchRoute,
  DispatchProvider,
  LatLngLiteral,
  RouteStepSummary,
} from '../types/dispatch';
import {
  formatDistance,
  formatDurationSeconds,
} from '../utils/formatters';

const ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

export async function computeDispatchRoute(
  routesLib: google.maps.RoutesLibrary,
  coreLib: google.maps.CoreLibrary,
  origin: LatLngLiteral,
  provider: DispatchProvider,
): Promise<ActiveDispatchRoute> {
  const runCompute = async (
    routingPreference: 'TRAFFIC_AWARE' | 'TRAFFIC_UNAWARE',
  ) => {
    return routesLib.Route.computeRoutes({
      origin,
      destination: provider.location,
      travelMode: 'DRIVING',
      routingPreference,
      units: coreLib.UnitSystem.METRIC,
      fields: [
        'path',
        'legs',
        'durationMillis',
        'distanceMeters',
        'localizedValues',
        'viewport',
      ],
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    });
  };

  let result;
  try {
    result = await runCompute('TRAFFIC_AWARE');
  } catch {
    result = await runCompute('TRAFFIC_UNAWARE');
  }

  const route = result.routes?.[0];
  if (!route) {
    throw new Error('No drivable dispatch route was returned for this location.');
  }

  const rawPath = route.path ?? [];
  const path: LatLngLiteral[] = rawPath.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
  }));

  const firstLeg = route.legs?.[0];
  const rawSteps = firstLeg?.steps ?? [];
  const steps: RouteStepSummary[] = rawSteps
    .filter((s) => Boolean(s.instructions || s.maneuver))
    .map((s) => ({
      instruction: s.instructions ?? 'Continue on route',
      maneuver: s.maneuver ?? null,
      distanceText:
        s.localizedValues?.distance ?? formatDistance(s.distanceMeters),
      durationText:
        s.localizedValues?.staticDuration ??
        formatDurationSeconds(
          typeof s.staticDurationMillis === 'number'
            ? Math.round(s.staticDurationMillis / 1000)
            : null,
        ),
    }));

  const distanceMeters = route.distanceMeters ?? firstLeg?.distanceMeters ?? 0;
  const durationMillis = route.durationMillis ?? firstLeg?.durationMillis ?? 0;
  const durationSeconds = Number.isFinite(durationMillis)
    ? Math.round(durationMillis / 1000)
    : 0;

  return {
    providerId: provider.id,
    providerName: provider.name,
    providerCategory: provider.category,
    distanceMeters,
    durationSeconds,
    distanceText:
      route.localizedValues?.distance ?? formatDistance(distanceMeters),
    durationText:
      route.localizedValues?.duration ?? formatDurationSeconds(durationSeconds),
    path,
    viewport: route.viewport ?? null,
    steps,
  };
}
