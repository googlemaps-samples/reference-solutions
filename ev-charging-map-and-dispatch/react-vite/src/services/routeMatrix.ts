import type { DispatchProvider, LatLngLiteral } from '../types/dispatch';
import {
  formatCompactDistance,
  formatDurationSeconds,
} from '../utils/formatters';

const ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

export interface MatrixRankResult {
  providers: DispatchProvider[];
  usedLiveMatrix: boolean;
}

/**
 * Ranks discovered providers by real driving ETA using Routes API RouteMatrix.computeRouteMatrix.
 */
export async function rankProvidersByRouteMatrix(
  routesLib: google.maps.RoutesLibrary,
  coreLib: google.maps.CoreLibrary,
  origin: LatLngLiteral,
  providers: DispatchProvider[],
): Promise<MatrixRankResult> {
  if (providers.length === 0) {
    return { providers: [], usedLiveMatrix: true };
  }

  // Sort by straight-line first and cap at 25 destinations for a single fast RouteMatrix call
  const candidates = [...providers]
    .sort((a, b) => a.straightLineMeters - b.straightLineMeters)
    .slice(0, 25);

  const runMatrix = async (
    routingPreference: 'TRAFFIC_AWARE' | 'TRAFFIC_UNAWARE',
  ) => {
    return routesLib.RouteMatrix.computeRouteMatrix({
      origins: [origin],
      destinations: candidates.map((p) => p.location),
      travelMode: 'DRIVING',
      routingPreference,
      units: coreLib.UnitSystem.METRIC,
      fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    });
  };

  try {
    let response;
    try {
      response = await runMatrix('TRAFFIC_AWARE');
    } catch {
      response = await runMatrix('TRAFFIC_UNAWARE');
    }

    const items = response.matrix.rows[0]?.items ?? [];

    const enriched = candidates.map((provider, idx) => {
      const item = items[idx];
      if (!item || item.condition !== 'ROUTE_EXISTS') {
        return {
          ...provider,
          distanceMeters: provider.straightLineMeters,
          distanceText: formatCompactDistance(provider.straightLineMeters),
          durationSeconds: null,
          durationText: null,
        };
      }

      const distanceMeters =
        typeof item.distanceMeters === 'number'
          ? item.distanceMeters
          : provider.straightLineMeters;
      const durationSeconds =
        typeof item.durationMillis === 'number' &&
        Number.isFinite(item.durationMillis)
          ? Math.round(item.durationMillis / 1000)
          : null;

      return {
        ...provider,
        distanceMeters,
        durationSeconds,
        distanceText:
          item.localizedValues?.distance ??
          formatCompactDistance(distanceMeters),
        durationText:
          item.localizedValues?.duration ??
          formatDurationSeconds(durationSeconds),
      };
    });

    enriched.sort((a, b) => {
      const aTime = a.durationSeconds ?? Number.POSITIVE_INFINITY;
      const bTime = b.durationSeconds ?? Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return (
        (a.distanceMeters ?? a.straightLineMeters) -
        (b.distanceMeters ?? b.straightLineMeters)
      );
    });

    return { providers: enriched, usedLiveMatrix: true };
  } catch (err) {
    console.warn('RouteMatrix.computeRouteMatrix fallback triggered:', err);
    // Graceful fallback sorting by straight-line distance if RouteMatrix is unavailable
    const fallback = candidates.map((p) => ({
      ...p,
      distanceMeters: Math.round(p.straightLineMeters),
      distanceText: `~${formatCompactDistance(p.straightLineMeters)}`,
      durationSeconds: null,
      durationText: null,
    }));
    return { providers: fallback, usedLiveMatrix: false };
  }
}
