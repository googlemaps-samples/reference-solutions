import type { CommuteLegResult, CommuteSummary, LatLngPoint } from '../types/realEstate';
import { GMP_ATTRIBUTION_ID } from './mapsLoader';

function formatDurationMillis(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return 'N/A';
  }
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatMeters(meters: number | undefined): string {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters <= 0) {
    return '';
  }
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

function extractMatrixItem(
  matrix: google.maps.routes.RouteMatrix,
  fallbackLabel: string
): CommuteLegResult {
  const item = matrix.rows?.[0]?.items?.[0];
  if (!item || item.condition !== 'ROUTE_EXISTS') {
    return {
      durationText: 'Unavailable',
      distanceText: '',
      durationMillis: null,
      distanceMeters: null,
      available: false,
      note: item?.error?.message ?? `${fallbackLabel} route unavailable`,
    };
  }

  const durationText =
    item.localizedValues?.duration ?? formatDurationMillis(item.durationMillis);
  const distanceText =
    item.localizedValues?.distance ?? formatMeters(item.distanceMeters);

  return {
    durationText,
    distanceText,
    durationMillis: item.durationMillis ?? null,
    distanceMeters: item.distanceMeters ?? null,
    available: true,
  };
}

export async function computeWorkplaceCommute(
  origin: LatLngPoint,
  destination: { name: string; address: string; location: LatLngPoint },
  routesLib: google.maps.RoutesLibrary
): Promise<CommuteSummary> {
  const { RouteMatrix, Route } = routesLib;

  const matrixFields = ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'];

  const [drivingRes, transitRes, drivingRouteRes, transitRouteRes] = await Promise.allSettled([
    RouteMatrix.computeRouteMatrix({
      origins: [origin],
      destinations: [destination.location],
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: matrixFields,
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    }),
    RouteMatrix.computeRouteMatrix({
      origins: [origin],
      destinations: [destination.location],
      travelMode: 'TRANSIT',
      fields: matrixFields,
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    }),
    Route.computeRoutes({
      origin,
      destination: destination.location,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues'],
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    }),
    Route.computeRoutes({
      origin,
      destination: destination.location,
      travelMode: 'TRANSIT',
      fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues'],
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    }),
  ]);

  const driving: CommuteLegResult =
    drivingRes.status === 'fulfilled'
      ? extractMatrixItem(drivingRes.value.matrix, 'Driving')
      : {
          durationText: 'Unavailable',
          distanceText: '',
          durationMillis: null,
          distanceMeters: null,
          available: false,
          note: drivingRes.reason instanceof Error ? drivingRes.reason.message : 'Error',
        };

  const transit: CommuteLegResult =
    transitRes.status === 'fulfilled'
      ? extractMatrixItem(transitRes.value.matrix, 'Transit')
      : {
          durationText: 'Unavailable',
          distanceText: '',
          durationMillis: null,
          distanceMeters: null,
          available: false,
          note: transitRes.reason instanceof Error ? transitRes.reason.message : 'Error',
        };

  const toLiteralPath = (route?: google.maps.routes.Route): LatLngPoint[] => {
    if (!route?.path) return [];
    return route.path.map((pt) => ({
      lat: Number(pt.lat),
      lng: Number(pt.lng),
    }));
  };

  const drivingPath =
    drivingRouteRes.status === 'fulfilled'
      ? toLiteralPath(drivingRouteRes.value.routes?.[0])
      : [];

  const transitPath =
    transitRouteRes.status === 'fulfilled'
      ? toLiteralPath(transitRouteRes.value.routes?.[0])
      : [];

  return {
    workplaceName: destination.name,
    workplaceAddress: destination.address,
    workplaceLocation: destination.location,
    driving,
    transit,
    drivingPath,
    transitPath,
  };
}
