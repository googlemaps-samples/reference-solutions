import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DispatchMap } from './components/DispatchMap';
import { DispatchSidebar } from './components/DispatchSidebar';
import { HeaderBar } from './components/HeaderBar';
import { SetupNotice } from './components/SetupNotice';
import { discoverNearbyProviders } from './services/placesDiscovery';
import { reverseGeocodeLocation } from './services/reverseGeocode';
import { computeDispatchRoute } from './services/routeDispatch';
import { rankProvidersByRouteMatrix } from './services/routeMatrix';
import type {
  ActiveDispatchRoute,
  CategoryFilter,
  DispatchProvider,
  LatLngLiteral,
  RadiusKm,
} from './types/dispatch';

const SEATTLE_DEFAULT_LOCATION: LatLngLiteral = {
  lat: 47.6062,
  lng: -122.3321,
};

function DispatchWorkspace() {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');
  const coreLib = useMapsLibrary('core');

  const [driverLocation, setDriverLocation] = useState<LatLngLiteral>(
    SEATTLE_DEFAULT_LOCATION,
  );
  const [driverAddress, setDriverAddress] = useState<string>(
    'Downtown Seattle, WA',
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [providers, setProviders] = useState<DispatchProvider[]>([]);
  const [usedLiveMatrix, setUsedLiveMatrix] = useState<boolean>(true);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(true);
  const [discoveryNonce, setDiscoveryNonce] = useState<number>(0);

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [activeRoute, setActiveRoute] = useState<ActiveDispatchRoute | null>(
    null,
  );
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [viewportToFit, setViewportToFit] =
    useState<google.maps.LatLngBounds | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapCenterRef = useRef<LatLngLiteral>(SEATTLE_DEFAULT_LOCATION);
  const searchSeqRef = useRef<number>(0);
  const geocodeSeqRef = useRef<number>(0);
  const skipNextGeocodeRef = useRef<boolean>(false);

  // Reverse-geocode driver breakdown pin whenever driverLocation changes
  useEffect(() => {
    if (!geocodingLib) return;
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }

    const seq = ++geocodeSeqRef.current;
    setIsGeocoding(true);

    reverseGeocodeLocation(geocodingLib, driverLocation)
      .then((address) => {
        if (seq === geocodeSeqRef.current) {
          setDriverAddress(address);
        }
      })
      .finally(() => {
        if (seq === geocodeSeqRef.current) {
          setIsGeocoding(false);
        }
      });
  }, [geocodingLib, driverLocation]);

  // Discover nearby EV stations and auto repair providers, then rank via RouteMatrix
  useEffect(() => {
    if (!placesLib || !routesLib || !coreLib) return;

    const seq = ++searchSeqRef.current;
    setIsDiscovering(true);
    setErrorMessage(null);

    discoverNearbyProviders(placesLib, driverLocation, radiusKm)
      .then((discovered) => {
        if (seq !== searchSeqRef.current) return null;
        return rankProvidersByRouteMatrix(
          routesLib,
          coreLib,
          driverLocation,
          discovered,
        );
      })
      .then((matrixResult) => {
        if (!matrixResult || seq !== searchSeqRef.current) return;
        setProviders(matrixResult.providers);
        setUsedLiveMatrix(matrixResult.usedLiveMatrix);
      })
      .catch((err: unknown) => {
        if (seq !== searchSeqRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to load nearby EV stations and repair providers.';
        setErrorMessage(msg);
      })
      .finally(() => {
        if (seq === searchSeqRef.current) {
          setIsDiscovering(false);
        }
      });
  }, [placesLib, routesLib, coreLib, driverLocation, radiusKm, discoveryNonce]);

  const filteredProviders = useMemo(() => {
    if (categoryFilter === 'all') return providers;
    return providers.filter((p) => p.category === categoryFilter);
  }, [providers, categoryFilter]);

  const selectedProvider = useMemo(() => {
    if (!selectedProviderId) return null;
    return filteredProviders.find((p) => p.id === selectedProviderId) ?? null;
  }, [filteredProviders, selectedProviderId]);

  const handleRelocateDriver = useCallback(
    (
      nextLocation: LatLngLiteral,
      knownAddress?: string,
      viewport?: google.maps.LatLngBounds | null,
    ) => {
      setActiveRoute(null);
      setSelectedProviderId(null);
      setErrorMessage(null);
      if (knownAddress) {
        skipNextGeocodeRef.current = true;
        setDriverAddress(knownAddress);
        setIsGeocoding(false);
      }
      if (viewport) {
        setViewportToFit(viewport);
      } else {
        setViewportToFit(null);
      }
      setDriverLocation(nextLocation);
    },
    [],
  );

  const handleUseMapCenter = useCallback(() => {
    handleRelocateDriver({ ...mapCenterRef.current });
  }, [handleRelocateDriver]);

  const handleRadiusChange = useCallback((nextRadius: RadiusKm) => {
    setRadiusKm(nextRadius);
    setActiveRoute(null);
  }, []);

  const handleSelectProvider = useCallback((provider: DispatchProvider | null) => {
    setSelectedProviderId(provider ? provider.id : null);
  }, []);

  const handleDispatchRoute = useCallback(
    async (provider: DispatchProvider) => {
      if (!routesLib || !coreLib) return;
      setSelectedProviderId(provider.id);
      setIsComputingRoute(true);
      setErrorMessage(null);

      try {
        const route = await computeDispatchRoute(
          routesLib,
          coreLib,
          driverLocation,
          provider,
        );
        setActiveRoute(route);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to compute driving route to this destination.';
        setErrorMessage(msg);
      } finally {
        setIsComputingRoute(false);
      }
    },
    [routesLib, coreLib, driverLocation],
  );

  const handleClearRoute = useCallback(() => {
    setActiveRoute(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setDiscoveryNonce((n) => n + 1);
  }, []);

  const handleMapCenterUpdate = useCallback((center: LatLngLiteral) => {
    mapCenterRef.current = center;
  }, []);

  return (
    <div className="app-shell">
      <HeaderBar
        driverAddress={driverAddress}
        isGeocoding={isGeocoding}
        categoryFilter={categoryFilter}
        radiusKm={radiusKm}
        onCategoryChange={setCategoryFilter}
        onRadiusChange={handleRadiusChange}
        onRelocateDriver={handleRelocateDriver}
        onUseMapCenter={handleUseMapCenter}
      />

      <main className="dispatch-workspace">
        <DispatchSidebar
          providers={filteredProviders}
          selectedProviderId={selectedProviderId}
          activeRoute={activeRoute}
          isDiscovering={isDiscovering}
          isComputingRoute={isComputingRoute}
          usedLiveMatrix={usedLiveMatrix}
          radiusKm={radiusKm}
          errorMessage={errorMessage}
          onSelectProvider={handleSelectProvider}
          onDispatchRoute={handleDispatchRoute}
          onClearRoute={handleClearRoute}
          onRefresh={handleRefresh}
        />

        <DispatchMap
          driverLocation={driverLocation}
          driverAddress={driverAddress}
          radiusKm={radiusKm}
          providers={filteredProviders}
          selectedProvider={selectedProvider}
          activeRoute={activeRoute}
          viewportToFit={viewportToFit}
          onMapCenterUpdate={handleMapCenterUpdate}
          onRelocateDriver={handleRelocateDriver}
          onSelectProvider={handleSelectProvider}
          onDispatchRoute={handleDispatchRoute}
        />
      </main>
    </div>
  );
}

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const isConfigured =
    apiKey.length > 0 && apiKey !== 'your_google_maps_api_key_here';

  if (!isConfigured) {
    return <SetupNotice />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'routes', 'geocoding', 'marker', 'core']}
      language="en"
      region="US"
    >
      <DispatchWorkspace />
    </APIProvider>
  );
}

export default App;
