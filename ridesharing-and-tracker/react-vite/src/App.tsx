import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Header } from './components/Header';
import { RideshareMap } from './components/RideshareMap';
import { Sidebar } from './components/Sidebar';
import {
  SEED_DROPOFF_QUERY,
  SEED_PICKUP_QUERY,
  SIMULATED_CANDIDATE_DRIVERS,
} from './data/drivers';
import {
  computeDriverApproachRoute,
  computeRideshareRoutes,
  rankCandidateDrivers,
  resolvePlaceByText,
} from './services/mapsService';
import type {
  CandidateDriver,
  DriverLiveState,
  EmissionType,
  ResolvedPlace,
  RideTierId,
  RouteComparisonResult,
  RouteKind,
} from './types/rideshare';
import { buildPathMeasure, sampleAlongPath } from './utils/geometry';

const INITIAL_DRIVER_STATE: DriverLiveState = {
  driver: null,
  phase: 'idle',
  position: null,
  heading: 0,
  remainingSeconds: 0,
  remainingMeters: 0,
  progressPct: 0,
  isPaused: false,
  approachPath: [],
  approachDurationMillis: 0,
  approachDistanceMeters: 0,
};

const APPROACH_SIM_DURATION_MS = 9000;
const BOARDING_PAUSE_MS = 1200;
const TRIP_SIM_DURATION_MS = 22000;

interface RideshareWorkspaceProps {
  hasApiKey: boolean;
}

function RideshareWorkspace({ hasApiKey }: RideshareWorkspaceProps) {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  useMapsLibrary('geometry');

  const [pickupText, setPickupText] = useState(SEED_PICKUP_QUERY);
  const [dropoffText, setDropoffText] = useState(SEED_DROPOFF_QUERY);
  const [pickup, setPickup] = useState<ResolvedPlace | null>(null);
  const [dropoff, setDropoff] = useState<ResolvedPlace | null>(null);

  const [emissionType, setEmissionType] = useState<EmissionType>('HYBRID');
  const [selectedRouteKind, setSelectedRouteKind] =
    useState<RouteKind>('fastest');
  const [selectedTier, setSelectedTier] = useState<RideTierId>('economy');
  const [routeComparison, setRouteComparison] =
    useState<RouteComparisonResult | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [candidateDrivers, setCandidateDrivers] = useState<CandidateDriver[]>(
    SIMULATED_CANDIDATE_DRIVERS
  );
  const [driverState, setDriverState] =
    useState<DriverLiveState>(INITIAL_DRIVER_STATE);

  const simRef = useRef<{
    active: boolean;
    isPaused: boolean;
    elapsedMs: number;
    lastTickTs: number | null;
    approachPath: google.maps.LatLngLiteral[];
    approachDurationSec: number;
    tripPath: google.maps.LatLngLiteral[];
    tripDurationSec: number;
    driver: CandidateDriver | null;
  }>({
    active: false,
    isPaused: false,
    elapsedMs: 0,
    lastTickTs: null,
    approachPath: [],
    approachDurationSec: 180,
    tripPath: [],
    tripDurationSec: 1200,
    driver: null,
  });

  const seededRef = useRef(false);

  // Pre-seed Los Angeles pickup & drop-off locations on initial load
  useEffect(() => {
    if (!hasApiKey || !placesLib || seededRef.current) {
      return;
    }
    seededRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const [resolvedPickup, resolvedDropoff] = await Promise.all([
          resolvePlaceByText(placesLib, SEED_PICKUP_QUERY),
          resolvePlaceByText(placesLib, SEED_DROPOFF_QUERY),
        ]);
        if (cancelled) return;
        if (resolvedPickup) {
          setPickup(resolvedPickup);
          setPickupText(resolvedPickup.address || resolvedPickup.name);
        }
        if (resolvedDropoff) {
          setDropoff(resolvedDropoff);
          setDropoffText(resolvedDropoff.address || resolvedDropoff.name);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Failed to resolve pre-seeded Los Angeles locations.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, placesLib]);

  // Compute Fastest & Eco-Friendly routes whenever pickup, drop-off, or emissionType changes
  useEffect(() => {
    if (!hasApiKey || !routesLib || !pickup || !dropoff) {
      return;
    }
    let cancelled = false;
    setIsLoadingRoutes(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const result = await computeRideshareRoutes(
          routesLib,
          pickup.location,
          dropoff.location,
          emissionType
        );
        if (!cancelled) {
          setRouteComparison(result);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Failed to compute routes via Routes API.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRoutes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, routesLib, pickup, dropoff, emissionType]);

  const activeRoute = useMemo(() => {
    if (!routeComparison) return null;
    return selectedRouteKind === 'eco'
      ? routeComparison.eco
      : routeComparison.fastest;
  }, [routeComparison, selectedRouteKind]);

  const startDriverSimulation = useCallback(
    async (
      driver: CandidateDriver,
      pickupLocation: google.maps.LatLngLiteral,
      tripRoutePath: google.maps.LatLngLiteral[],
      tripDurationMillis: number
    ) => {
      if (!routesLib || tripRoutePath.length < 2) return;

      const approach = await computeDriverApproachRoute(
        routesLib,
        driver.initialLocation,
        pickupLocation
      );

      const approachDurationSec = Math.max(
        30,
        Math.round(approach.durationMillis / 1000)
      );
      const tripDurationSec = Math.max(
        60,
        Math.round(tripDurationMillis / 1000)
      );

      simRef.current = {
        active: true,
        isPaused: false,
        elapsedMs: 0,
        lastTickTs: performance.now(),
        approachPath: approach.path,
        approachDurationSec,
        tripPath: tripRoutePath,
        tripDurationSec,
        driver,
      };

      setDriverState({
        driver,
        phase: 'en_route_pickup',
        position: approach.path[0] ?? driver.initialLocation,
        heading: 0,
        remainingSeconds: approachDurationSec,
        remainingMeters: approach.distanceMeters,
        progressPct: 0,
        isPaused: false,
        approachPath: approach.path,
        approachDurationMillis: approach.durationMillis,
        approachDistanceMeters: approach.distanceMeters,
      });
    },
    [routesLib]
  );

  // Rank nearby drivers via RouteMatrix & auto-dispatch when pickup and route are ready
  useEffect(() => {
    if (!hasApiKey || !routesLib || !pickup || !activeRoute) {
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const ranked = await rankCandidateDrivers(
          routesLib,
          SIMULATED_CANDIDATE_DRIVERS,
          pickup.location
        );
        if (cancelled) return;
        setCandidateDrivers(ranked);
        if (ranked[0]) {
          await startDriverSimulation(
            ranked[0],
            pickup.location,
            activeRoute.path,
            activeRoute.durationMillis
          );
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Failed to evaluate nearby drivers.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, routesLib, pickup, activeRoute, startDriverSimulation]);

  // Smooth 60fps requestAnimationFrame driver movement along approach + trip polylines
  useEffect(() => {
    let rafId = 0;

    const tick = (now: number) => {
      const sim = simRef.current;
      if (sim.active && sim.driver && !sim.isPaused) {
        if (sim.lastTickTs === null) {
          sim.lastTickTs = now;
        }
        const delta = Math.min(100, Math.max(0, now - sim.lastTickTs));
        sim.lastTickTs = now;
        sim.elapsedMs += delta;

        const totalSimMs =
          APPROACH_SIM_DURATION_MS + BOARDING_PAUSE_MS + TRIP_SIM_DURATION_MS;

        if (sim.elapsedMs < APPROACH_SIM_DURATION_MS) {
          const progress = sim.elapsedMs / APPROACH_SIM_DURATION_MS;
          const measure = buildPathMeasure(sim.approachPath);
          const sample = sampleAlongPath(measure, progress);
          const remainingSeconds = Math.max(
            0,
            Math.round(sim.approachDurationSec * (1 - progress))
          );

          setDriverState((prev) => ({
            ...prev,
            phase: 'en_route_pickup',
            position: sample.position,
            heading: sample.heading,
            remainingSeconds,
            remainingMeters: sample.remainingMeters,
            progressPct: (sim.elapsedMs / totalSimMs) * 100,
          }));
        } else if (
          sim.elapsedMs <
          APPROACH_SIM_DURATION_MS + BOARDING_PAUSE_MS
        ) {
          const pickupPos =
            sim.tripPath[0] ??
            sim.approachPath[sim.approachPath.length - 1] ??
            sim.driver.initialLocation;
          setDriverState((prev) => ({
            ...prev,
            phase: 'arrived_pickup',
            position: pickupPos,
            remainingSeconds: sim.tripDurationSec,
            remainingMeters: buildPathMeasure(sim.tripPath).totalMeters,
            progressPct: (sim.elapsedMs / totalSimMs) * 100,
          }));
        } else if (sim.elapsedMs < totalSimMs) {
          const tripElapsed =
            sim.elapsedMs - APPROACH_SIM_DURATION_MS - BOARDING_PAUSE_MS;
          const progress = tripElapsed / TRIP_SIM_DURATION_MS;
          const measure = buildPathMeasure(sim.tripPath);
          const sample = sampleAlongPath(measure, progress);
          const remainingSeconds = Math.max(
            0,
            Math.round(sim.tripDurationSec * (1 - progress))
          );

          setDriverState((prev) => ({
            ...prev,
            phase: 'in_trip',
            position: sample.position,
            heading: sample.heading,
            remainingSeconds,
            remainingMeters: sample.remainingMeters,
            progressPct: (sim.elapsedMs / totalSimMs) * 100,
          }));
        } else {
          const finalPos =
            sim.tripPath[sim.tripPath.length - 1] ?? sim.driver.initialLocation;
          sim.active = false;
          setDriverState((prev) => ({
            ...prev,
            phase: 'completed',
            position: finalPos,
            remainingSeconds: 0,
            remainingMeters: 0,
            progressPct: 100,
          }));
        }
      } else {
        sim.lastTickTs = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePickupSelect = useCallback((place: ResolvedPlace) => {
    setPickup(place);
    setPickupText(place.address || place.name);
    setErrorMessage(null);
  }, []);

  const handleDropoffSelect = useCallback((place: ResolvedPlace) => {
    setDropoff(place);
    setDropoffText(place.address || place.name);
    setErrorMessage(null);
  }, []);

  const handleSwapLocations = useCallback(() => {
    setPickup(dropoff);
    setDropoff(pickup);
    setPickupText(dropoffText);
    setDropoffText(pickupText);
  }, [pickup, dropoff, pickupText, dropoffText]);

  const handleSelectPreset = useCallback(
    async (pickupQuery: string, dropoffQuery: string) => {
      if (!placesLib) return;
      setErrorMessage(null);
      try {
        const [p, d] = await Promise.all([
          resolvePlaceByText(placesLib, pickupQuery),
          resolvePlaceByText(placesLib, dropoffQuery),
        ]);
        if (p) {
          setPickup(p);
          setPickupText(p.address || p.name);
        }
        if (d) {
          setDropoff(d);
          setDropoffText(d.address || d.name);
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to load preset trip.'
        );
      }
    },
    [placesLib]
  );

  const handleDispatchDriver = useCallback(() => {
    if (!pickup || !activeRoute || !candidateDrivers[0]) return;
    void startDriverSimulation(
      candidateDrivers[0],
      pickup.location,
      activeRoute.path,
      activeRoute.durationMillis
    );
  }, [pickup, activeRoute, candidateDrivers, startDriverSimulation]);

  const handleToggleSimulation = useCallback(() => {
    const nextPaused = !simRef.current.isPaused;
    simRef.current.isPaused = nextPaused;
    simRef.current.lastTickTs = performance.now();
    setDriverState((prev) => ({
      ...prev,
      isPaused: nextPaused,
    }));
  }, []);

  return (
    <div className="app-shell">
      <Header
        pickup={pickup}
        dropoff={dropoff}
        driverPhase={driverState.phase}
        isPaused={driverState.isPaused}
      />

      <main className="app-main">
        <Sidebar
          pickupText={pickupText}
          dropoffText={dropoffText}
          onPickupSelect={handlePickupSelect}
          onDropoffSelect={handleDropoffSelect}
          onSwapLocations={handleSwapLocations}
          onSelectPreset={handleSelectPreset}
          routeComparison={routeComparison}
          selectedRouteKind={selectedRouteKind}
          onSelectRoute={setSelectedRouteKind}
          emissionType={emissionType}
          onChangeEmissionType={setEmissionType}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          candidateDrivers={candidateDrivers}
          driverState={driverState}
          onDispatchDriver={handleDispatchDriver}
          onToggleSimulation={handleToggleSimulation}
          isLoadingRoutes={isLoadingRoutes}
          errorMessage={errorMessage}
          onAutocompleteError={setErrorMessage}
        />

        <RideshareMap
          pickup={pickup}
          dropoff={dropoff}
          routeComparison={routeComparison}
          selectedRouteKind={selectedRouteKind}
          onSelectRoute={setSelectedRouteKind}
          candidateDrivers={candidateDrivers}
          driverState={driverState}
          hasApiKey={hasApiKey}
        />
      </main>
    </div>
  );
}

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasApiKey =
    apiKey.length > 0 && apiKey !== 'your_google_maps_api_key_here';

  if (!hasApiKey) {
    return <RideshareWorkspace hasApiKey={false} />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}
      language="en"
      region="US"
    >
      <RideshareWorkspace hasApiKey={true} />
    </APIProvider>
  );
}

export default App;
