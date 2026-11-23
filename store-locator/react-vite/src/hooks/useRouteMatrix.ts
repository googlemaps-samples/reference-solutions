import { useEffect, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type {
  BranchLocation,
  BranchMatrixMetrics,
  OriginPoint,
  TravelModeOption,
} from '../types/locator';
import {
  formatDistanceMeters,
  formatDurationMillis,
  toSdkTravelMode,
} from '../utils/placesHelpers';

const MATRIX_BATCH_SIZE = 20;

export function useRouteMatrix(
  origin: OriginPoint,
  branches: BranchLocation[],
  travelMode: TravelModeOption
) {
  const routesLibrary = useMapsLibrary('routes');
  const coreLibrary = useMapsLibrary('core');
  const geometryLibrary = useMapsLibrary('geometry');

  const [metricsById, setMetricsById] = useState<
    Record<string, BranchMatrixMetrics>
  >({});
  const [loading, setLoading] = useState<boolean>(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  useEffect(() => {
    if (!branches.length) {
      setMetricsById({});
      return;
    }

    let cancelled = false;

    const buildFallbackMetrics = (): Record<string, BranchMatrixMetrics> => {
      const fallback: Record<string, BranchMatrixMetrics> = {};
      for (const branch of branches) {
        let straightMeters: number | null = null;
        if (geometryLibrary && coreLibrary) {
          const from = new coreLibrary.LatLng(origin.location);
          const to = new coreLibrary.LatLng(branch.location);
          straightMeters = geometryLibrary.spherical.computeDistanceBetween(
            from,
            to
          );
        }
        fallback[branch.id] = {
          branchId: branch.id,
          durationMillis: null,
          distanceMeters: straightMeters,
          durationText: 'Calculating...',
          distanceText: formatDistanceMeters(straightMeters),
          isEstimatedFallback: true,
        };
      }
      return fallback;
    };

    setMetricsById(buildFallbackMetrics());

    if (!routesLibrary || !coreLibrary) {
      return;
    }

    const computeMatrix = async () => {
      setLoading(true);
      setMatrixError(null);

      try {
        const sdkMode = toSdkTravelMode(travelMode);
        const nextMetrics: Record<string, BranchMatrixMetrics> = {};

        for (let i = 0; i < branches.length; i += MATRIX_BATCH_SIZE) {
          const batch = branches.slice(i, i + MATRIX_BATCH_SIZE);

          const request: google.maps.routes.ComputeRouteMatrixRequest = {
            origins: [origin.location],
            destinations: batch.map((b) => b.location),
            travelMode: sdkMode,
            units: coreLibrary.UnitSystem.IMPERIAL,
            fields: [
              'distanceMeters',
              'durationMillis',
              'localizedValues',
              'condition',
            ],
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
            ...(sdkMode === 'DRIVING'
              ? { routingPreference: 'TRAFFIC_AWARE' }
              : {}),
          };

          const { matrix } =
            await routesLibrary.RouteMatrix.computeRouteMatrix(request);

          if (cancelled) return;

          const row = matrix.rows?.[0];
          batch.forEach((branch, index) => {
            const item = row?.items?.[index];
            const routeExists =
              item &&
              item.condition === 'ROUTE_EXISTS' &&
              typeof item.durationMillis === 'number' &&
              Number.isFinite(item.durationMillis);

            if (routeExists && item) {
              const distMeters = item.distanceMeters ?? null;
              const durMillis = item.durationMillis ?? null;
              nextMetrics[branch.id] = {
                branchId: branch.id,
                durationMillis: durMillis,
                distanceMeters: distMeters,
                durationText:
                  item.localizedValues?.duration ??
                  formatDurationMillis(durMillis),
                distanceText:
                  item.localizedValues?.distance ??
                  formatDistanceMeters(distMeters),
                isEstimatedFallback: false,
              };
            } else {
              nextMetrics[branch.id] = {
                branchId: branch.id,
                durationMillis: null,
                distanceMeters: null,
                durationText: 'Unavailable',
                distanceText: '—',
                isEstimatedFallback: true,
              };
            }
          });
        }

        if (!cancelled) {
          setMetricsById(nextMetrics);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Unable to compute Route Matrix.';
          setMatrixError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void computeMatrix();

    return () => {
      cancelled = true;
    };
  }, [origin, branches, travelMode, routesLibrary, coreLibrary, geometryLibrary]);

  return { metricsById, loading, matrixError };
}
