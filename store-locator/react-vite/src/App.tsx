import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { HeaderBar } from './components/HeaderBar';
import { MapCanvas } from './components/MapCanvas';
import { Sidebar } from './components/Sidebar';
import { useNycBranches } from './hooks/useNycBranches';
import { useRouteMatrix } from './hooks/useRouteMatrix';
import {
  DEFAULT_ORIGIN,
  type ActiveRouteInfo,
  type BranchType,
  type OriginPoint,
  type ServiceTag,
  type TravelModeOption,
} from './types/locator';
import {
  formatDistanceMeters,
  formatDurationMillis,
  toSdkTravelMode,
} from './utils/placesHelpers';

const RAW_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const HAS_VALID_API_KEY =
  RAW_API_KEY.length > 0 && RAW_API_KEY !== 'your_google_maps_api_key_here';

const StoreLocatorWorkspace: React.FC<{ hasApiKey: boolean }> = ({
  hasApiKey,
}) => {
  const routesLibrary = useMapsLibrary('routes');
  const coreLibrary = useMapsLibrary('core');

  const [origin, setOrigin] = useState<OriginPoint>(DEFAULT_ORIGIN);
  const [travelMode, setTravelMode] = useState<TravelModeOption>('DRIVE');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    BranchType | 'all'
  >('all');
  const [selectedServices, setSelectedServices] = useState<ServiceTag[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRouteInfo | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const {
    branches,
    loading: branchesLoading,
    error: branchesError,
  } = useNycBranches();

  const { metricsById, loading: matrixLoading } = useRouteMatrix(
    origin,
    branches,
    travelMode
  );

  const filteredAndSortedBranches = useMemo(() => {
    const filtered = branches.filter((branch) => {
      if (
        selectedTypeFilter !== 'all' &&
        branch.branchType !== selectedTypeFilter
      ) {
        return false;
      }
      if (
        selectedServices.length > 0 &&
        !selectedServices.every((svc) => branch.services.includes(svc))
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const mA = metricsById[a.id];
      const mB = metricsById[b.id];

      const durA = mA?.durationMillis;
      const durB = mB?.durationMillis;
      if (typeof durA === 'number' && typeof durB === 'number') {
        return durA - durB;
      }
      if (typeof durA === 'number') return -1;
      if (typeof durB === 'number') return 1;

      const distA = mA?.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      const distB = mB?.distanceMeters ?? Number.MAX_SAFE_INTEGER;
      return distA - distB;
    });
  }, [branches, selectedTypeFilter, selectedServices, metricsById]);

  const fastestBranchId = useMemo(() => {
    if (!filteredAndSortedBranches.length) return null;
    return filteredAndSortedBranches[0].id;
  }, [filteredAndSortedBranches]);

  const selectedBranch = useMemo(
    () =>
      selectedBranchId
        ? branches.find((b) => b.id === selectedBranchId) ?? null
        : null,
    [branches, selectedBranchId]
  );

  useEffect(() => {
    if (
      selectedBranchId &&
      !filteredAndSortedBranches.some((b) => b.id === selectedBranchId)
    ) {
      setSelectedBranchId(null);
      setActiveRoute(null);
    }
  }, [filteredAndSortedBranches, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranch || !routesLibrary || !coreLibrary || !hasApiKey) {
      if (!selectedBranch) {
        setActiveRoute(null);
        setRouteError(null);
      }
      return;
    }

    let cancelled = false;

    const computeSelectedRoute = async () => {
      setIsRouting(true);
      setRouteError(null);

      try {
        const sdkMode = toSdkTravelMode(travelMode);
        const fields =
          sdkMode === 'TRANSIT'
            ? [
                'path',
                'legs',
                'distanceMeters',
                'durationMillis',
                'localizedValues',
                'viewport',
                'warnings',
              ]
            : [
                'path',
                'distanceMeters',
                'durationMillis',
                'localizedValues',
                'viewport',
                'warnings',
              ];

        const request: google.maps.routes.ComputeRoutesRequest = {
          origin: origin.location,
          destination: selectedBranch.location,
          travelMode: sdkMode,
          units: coreLibrary.UnitSystem.IMPERIAL,
          fields,
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          ...(sdkMode === 'DRIVING'
            ? { routingPreference: 'TRAFFIC_AWARE' }
            : {}),
        };

        const { routes } = await routesLibrary.Route.computeRoutes(request);
        if (cancelled) return;

        const primaryRoute = routes?.[0];
        if (!primaryRoute) {
          setActiveRoute(null);
          setRouteError(
            `No ${travelMode.toLowerCase()} route found to ${selectedBranch.name}.`
          );
          return;
        }

        setActiveRoute({
          branchId: selectedBranch.id,
          branchName: selectedBranch.name,
          travelMode,
          durationMillis: primaryRoute.durationMillis ?? null,
          distanceMeters: primaryRoute.distanceMeters ?? null,
          durationText:
            primaryRoute.localizedValues?.duration ??
            formatDurationMillis(primaryRoute.durationMillis),
          distanceText:
            primaryRoute.localizedValues?.distance ??
            formatDistanceMeters(primaryRoute.distanceMeters),
          warnings: primaryRoute.warnings ?? [],
          route: primaryRoute,
        });
      } catch (err) {
        if (!cancelled) {
          setActiveRoute(null);
          setRouteError(
            err instanceof Error ? err.message : 'Unable to compute route.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsRouting(false);
        }
      }
    };

    void computeSelectedRoute();

    return () => {
      cancelled = true;
    };
  }, [selectedBranch, origin, travelMode, routesLibrary, coreLibrary, hasApiKey]);

  const handleToggleService = useCallback((service: ServiceTag) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedTypeFilter('all');
    setSelectedServices([]);
  }, []);

  const handleRouteToFastest = useCallback(() => {
    if (!fastestBranchId) return;
    setSelectedBranchId(fastestBranchId);
  }, [fastestBranchId]);

  const handleClearRoute = useCallback(() => {
    setSelectedBranchId(null);
    setActiveRoute(null);
    setRouteError(null);
  }, []);

  return (
    <div className="app-shell">
      <HeaderBar
        origin={origin}
        onOriginChange={setOrigin}
        travelMode={travelMode}
        onTravelModeChange={setTravelMode}
        onRouteToFastest={handleRouteToFastest}
        hasFastestBranch={Boolean(fastestBranchId)}
        isRouting={isRouting}
      />

      <main className="split-workspace">
        <Sidebar
          branches={filteredAndSortedBranches}
          totalCount={branches.length}
          metricsById={metricsById}
          fastestBranchId={fastestBranchId}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          selectedTypeFilter={selectedTypeFilter}
          onTypeFilterChange={setSelectedTypeFilter}
          selectedServices={selectedServices}
          onToggleService={handleToggleService}
          onResetFilters={handleResetFilters}
          activeRoute={activeRoute}
          onClearRoute={handleClearRoute}
          onRouteToFastest={handleRouteToFastest}
          origin={origin}
          travelMode={travelMode}
          branchesLoading={branchesLoading}
          branchesError={branchesError}
          matrixLoading={matrixLoading}
          routeError={routeError}
          hasApiKey={hasApiKey}
        />

        <MapCanvas
          branches={filteredAndSortedBranches}
          metricsById={metricsById}
          origin={origin}
          selectedBranchId={selectedBranchId}
          fastestBranchId={fastestBranchId}
          activeRoute={activeRoute}
          onSelectBranch={setSelectedBranchId}
          onClearSelection={handleClearRoute}
          hasApiKey={hasApiKey}
        />
      </main>
    </div>
  );
};

export function App() {
  if (!HAS_VALID_API_KEY) {
    return <StoreLocatorWorkspace hasApiKey={false} />;
  }

  return (
    <APIProvider
      apiKey={RAW_API_KEY}
      version="weekly"
      language="en"
      region="US"
      libraries={['places', 'routes', 'marker', 'geocoding', 'geometry', 'core']}
    >
      <StoreLocatorWorkspace hasApiKey={true} />
    </APIProvider>
  );
}

export default App;
