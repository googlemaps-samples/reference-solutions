import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ArrowUpDown,
  Bike,
  Car,
  Clock,
  Footprints,
  Leaf,
  Mountain,
  Route as RouteIcon,
  ShieldAlert,
  TrainFront,
} from 'lucide-react';
import type {
  ElevationPoint,
  ElevationProfileSummary,
  ModeRouteBundle,
  PlacePoint,
  RouteModifiersState,
  TravelModeId,
} from '../types/routing';
import {
  SEEDED_DESTINATION_QUERY,
  SEEDED_ORIGIN_QUERY,
} from '../utils/geo';
import {
  computeRoutesForMode,
  fetchElevationProfileForRoute,
  searchSeededPlace,
} from '../services/mapsService';
import { PlacePicker } from './PlacePicker';
import { RouteMap } from './RouteMap';
import { ElevationProfileChart } from './ElevationProfileChart';

const TRAVEL_MODES: Array<{
  id: TravelModeId;
  btnId: string;
  label: string;
  Icon: typeof Bike;
}> = [
  { id: 'DRIVING', btnId: 'mode-drive-btn', label: 'Driving', Icon: Car },
  { id: 'BICYCLING', btnId: 'mode-bicycle-btn', label: 'Cycling', Icon: Bike },
  { id: 'WALKING', btnId: 'mode-walk-btn', label: 'Walking', Icon: Footprints },
  { id: 'TRANSIT', btnId: 'mode-transit-btn', label: 'Transit', Icon: TrainFront },
];

function createEmptyBundles(): Record<TravelModeId, ModeRouteBundle> {
  return {
    DRIVING: { mode: 'DRIVING', routes: [], isLoading: false },
    BICYCLING: { mode: 'BICYCLING', routes: [], isLoading: false },
    WALKING: { mode: 'WALKING', routes: [], isLoading: false },
    TRANSIT: { mode: 'TRANSIT', routes: [], isLoading: false },
  };
}

export function RouteComparatorApp() {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const elevationLib = useMapsLibrary('elevation');

  const [origin, setOrigin] = useState<PlacePoint | null>(null);
  const [destination, setDestination] = useState<PlacePoint | null>(null);
  const [isResolvingSeed, setIsResolvingSeed] = useState<boolean>(true);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Cycling is initialized as the active map & elevation mode on load
  const [activeMode, setActiveMode] = useState<TravelModeId>('BICYCLING');
  const [selectedRouteByMode, setSelectedRouteByMode] = useState<Record<TravelModeId, number>>({
    DRIVING: 0,
    BICYCLING: 0,
    WALKING: 0,
    TRANSIT: 0,
  });

  const [modifiers, setModifiers] = useState<RouteModifiersState>({
    avoidTolls: false,
    avoidHighways: false,
    ecoFriendly: true,
  });

  const [bundles, setBundles] = useState<Record<TravelModeId, ModeRouteBundle>>(
    createEmptyBundles,
  );

  const [elevationProfile, setElevationProfile] =
    useState<ElevationProfileSummary | null>(null);
  const [isLoadingElevation, setIsLoadingElevation] = useState<boolean>(false);
  const [elevationError, setElevationError] = useState<string | undefined>(undefined);
  const [hoveredElevationPoint, setHoveredElevationPoint] =
    useState<ElevationPoint | null>(null);

  const seedInitRef = useRef(false);
  const routeSeqRef = useRef(0);
  const elevSeqRef = useRef(0);

  // Resolve seeded Denver -> Boulder endpoints via Places API (New)
  useEffect(() => {
    if (!placesLib || seedInitRef.current) return;
    seedInitRef.current = true;

    let cancelled = false;
    setIsResolvingSeed(true);
    setSeedError(null);

    Promise.all([
      searchSeededPlace(placesLib, SEEDED_ORIGIN_QUERY),
      searchSeededPlace(placesLib, SEEDED_DESTINATION_QUERY),
    ])
      .then(([resolvedOrigin, resolvedDest]) => {
        if (cancelled) return;
        setOrigin(resolvedOrigin);
        setDestination(resolvedDest);
        setIsResolvingSeed(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to resolve seeded Denver and Boulder locations.';
        setSeedError(message);
        setIsResolvingSeed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib]);

  // Compute routes across all 4 travel modes when origin, destination, or modifiers change
  useEffect(() => {
    if (!routesLib || !origin || !destination) return;

    const seq = ++routeSeqRef.current;

    setBundles((prev) => ({
      DRIVING: { ...prev.DRIVING, isLoading: true, error: undefined },
      BICYCLING: { ...prev.BICYCLING, isLoading: true, error: undefined },
      WALKING: { ...prev.WALKING, isLoading: true, error: undefined },
      TRANSIT: { ...prev.TRANSIT, isLoading: true, error: undefined },
    }));

    const modes: TravelModeId[] = ['DRIVING', 'BICYCLING', 'WALKING', 'TRANSIT'];

    Promise.allSettled(
      modes.map((mode) =>
        computeRoutesForMode(routesLib, origin, destination, mode, modifiers),
      ),
    ).then((results) => {
      if (seq !== routeSeqRef.current) return;

      const nextBundles = createEmptyBundles();
      modes.forEach((mode, idx) => {
        const res = results[idx];
        if (res.status === 'fulfilled') {
          nextBundles[mode] = {
            mode,
            routes: res.value,
            isLoading: false,
            error:
              res.value.length === 0
                ? `No ${mode.toLowerCase()} routes available for this pair.`
                : undefined,
          };
        } else {
          const reason =
            res.reason instanceof Error
              ? res.reason.message
              : `Could not compute ${mode.toLowerCase()} route.`;
          nextBundles[mode] = {
            mode,
            routes: [],
            isLoading: false,
            error: reason,
          };
        }
      });

      setBundles(nextBundles);
      setSelectedRouteByMode({
        DRIVING: 0,
        BICYCLING: 0,
        WALKING: 0,
        TRANSIT: 0,
      });
    });
  }, [routesLib, origin, destination, modifiers]);

  const activeBundle = bundles[activeMode];
  const activeRouteIndex = selectedRouteByMode[activeMode] ?? 0;
  const activeRoute =
    activeBundle.routes[activeRouteIndex] ?? activeBundle.routes[0] ?? null;

  // Query Elevation API along active cycling or walking route
  useEffect(() => {
    setHoveredElevationPoint(null);

    if (activeMode !== 'BICYCLING' && activeMode !== 'WALKING') {
      setElevationProfile(null);
      setElevationError(undefined);
      setIsLoadingElevation(false);
      return;
    }

    if (!elevationLib || !activeRoute || activeRoute.path.length < 2) {
      setElevationProfile(null);
      return;
    }

    const seq = ++elevSeqRef.current;
    setIsLoadingElevation(true);
    setElevationError(undefined);

    fetchElevationProfileForRoute(elevationLib, activeRoute, 64)
      .then((summary) => {
        if (seq !== elevSeqRef.current) return;
        setElevationProfile(summary);
        setIsLoadingElevation(false);
      })
      .catch((err: unknown) => {
        if (seq !== elevSeqRef.current) return;
        setElevationError(
          err instanceof Error ? err.message : 'Elevation API request failed.',
        );
        setElevationProfile(null);
        setIsLoadingElevation(false);
      });
  }, [elevationLib, activeMode, activeRoute]);

  const handleSwapLocations = useCallback(() => {
    setOrigin((prevOrigin) => {
      setDestination(prevOrigin);
      return destination;
    });
  }, [destination]);

  const handleSelectRoute = useCallback(
    (index: number) => {
      setSelectedRouteByMode((prev) => ({
        ...prev,
        [activeMode]: index,
      }));
    },
    [activeMode],
  );

  const toggleModifier = useCallback((key: keyof RouteModifiersState) => {
    setModifiers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const isTrailBetaMode = activeMode === 'BICYCLING' || activeMode === 'WALKING';

  const headerKpis = useMemo(() => {
    if (!activeRoute) return null;
    return {
      eta: activeRoute.durationText,
      distance: activeRoute.distanceText,
      gain:
        isTrailBetaMode && elevationProfile
          ? `+${Math.round(elevationProfile.totalGainMeters)} m`
          : null,
    };
  }, [activeRoute, isTrailBetaMode, elevationProfile]);

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-brand">
          <div className="brand-icon">
            <RouteIcon size={18} />
          </div>
          <div>
            <h1 className="app-title">
              Multi-Modal Commute Comparator &amp; Trail Elevation Tracker
            </h1>
            <div className="header-subrow">
              <span className="corridor-badge">Denver–Boulder Front Range</span>
              {isTrailBetaMode && (
                <span className="beta-advisory-pill" role="status">
                  <AlertTriangle size={12} />
                  Beta: Walking/cycling routes may lack clear sidewalks or bike paths.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="header-kpis">
          {headerKpis ? (
            <>
              <div className="kpi-pill">
                <Clock size={14} />
                <span>ETA:</span>
                <strong>{headerKpis.eta}</strong>
              </div>
              <div className="kpi-pill">
                <RouteIcon size={14} />
                <span>Distance:</span>
                <strong>{headerKpis.distance}</strong>
              </div>
              {headerKpis.gain && (
                <div className="kpi-pill kpi-pill-accent">
                  <Mountain size={14} />
                  <span>Elev Gain:</span>
                  <strong>{headerKpis.gain}</strong>
                </div>
              )}
            </>
          ) : (
            <div className="kpi-pill">
              <span>Computing Front Range routes...</span>
            </div>
          )}
        </div>
      </header>

      <main className="workspace-split">
        <aside className="sidebar-panel" aria-label="Route Controls and Comparison">
          {seedError && (
            <div className="alert-banner alert-error" role="alert">
              <ShieldAlert size={16} />
              <span>{seedError}</span>
            </div>
          )}

          <section className="sidebar-section">
            <div className="section-header-row">
              <h2 className="section-heading">Route Endpoints</h2>
              <button
                id="swap-locations-btn"
                type="button"
                className="swap-btn"
                onClick={handleSwapLocations}
                disabled={!origin || !destination}
                title="Swap origin and destination"
              >
                <ArrowUpDown size={14} />
                Swap
              </button>
            </div>

            <div className="endpoints-stack">
              <PlacePicker
                id="origin-autocomplete-input"
                label="Origin"
                badgeText="A"
                badgeClassName="badge-origin"
                placeholder="Search Denver / Boulder origin..."
                selectedPlace={origin}
                isResolvingSeed={isResolvingSeed}
                onPlaceSelect={setOrigin}
              />
              <PlacePicker
                id="destination-autocomplete-input"
                label="Destination"
                badgeText="B"
                badgeClassName="badge-destination"
                placeholder="Search Denver / Boulder destination..."
                selectedPlace={destination}
                isResolvingSeed={isResolvingSeed}
                onPlaceSelect={setDestination}
              />
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="section-heading">Travel Mode Comparison</h2>
            <div className="mode-grid" role="tablist" aria-label="Travel Modes">
              {TRAVEL_MODES.map(({ id, btnId, label, Icon }) => {
                const bundle = bundles[id];
                const topRoute = bundle.routes[0];
                const isActive = activeMode === id;
                return (
                  <button
                    key={id}
                    id={btnId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`mode-btn ${isActive ? 'mode-btn-active' : ''}`}
                    onClick={() => setActiveMode(id)}
                  >
                    <div className="mode-btn-top">
                      <Icon size={16} />
                      <span>{label}</span>
                    </div>
                    <div className="mode-btn-eta">
                      {bundle.isLoading
                        ? '...'
                        : topRoute
                          ? topRoute.durationText
                          : 'N/A'}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sidebar-section">
            <div className="section-header-row">
              <h2 className="section-heading">Route Preferences (Driving)</h2>
              <span className="section-note">Routes API v2</span>
            </div>
            <div className="modifiers-row">
              <button
                id="avoid-tolls-toggle"
                type="button"
                aria-pressed={modifiers.avoidTolls}
                className={`modifier-chip ${modifiers.avoidTolls ? 'modifier-chip-active' : ''}`}
                onClick={() => toggleModifier('avoidTolls')}
              >
                Avoid Tolls
              </button>
              <button
                id="avoid-highways-toggle"
                type="button"
                aria-pressed={modifiers.avoidHighways}
                className={`modifier-chip ${modifiers.avoidHighways ? 'modifier-chip-active' : ''}`}
                onClick={() => toggleModifier('avoidHighways')}
              >
                Avoid Highways
              </button>
              <button
                id="eco-friendly-toggle"
                type="button"
                aria-pressed={modifiers.ecoFriendly}
                className={`modifier-chip modifier-chip-eco ${
                  modifiers.ecoFriendly ? 'modifier-chip-eco-active' : ''
                }`}
                onClick={() => toggleModifier('ecoFriendly')}
              >
                <Leaf size={13} />
                Eco-Friendly
              </button>
            </div>
          </section>

          <section className="sidebar-section route-list-section">
            <div className="section-header-row">
              <h2 className="section-heading">
                {TRAVEL_MODES.find((m) => m.id === activeMode)?.label} Routes
              </h2>
              <span className="section-note">
                {activeBundle.routes.length}{' '}
                {activeBundle.routes.length === 1 ? 'option' : 'options'}
              </span>
            </div>

            {activeBundle.isLoading ? (
              <div className="route-status-card">
                Computing {activeMode.toLowerCase()} routes via Routes API...
              </div>
            ) : activeBundle.error && activeBundle.routes.length === 0 ? (
              <div className="route-status-card route-status-warn">
                {activeBundle.error}
              </div>
            ) : (
              <div id="route-cards-list" className="route-cards-list">
                {activeBundle.routes.map((route, idx) => {
                  const isSelected = idx === activeRouteIndex;
                  const isEco = route.routeLabels.includes('FUEL_EFFICIENT');
                  return (
                    <button
                      key={route.id}
                      id={`route-card-${idx}`}
                      type="button"
                      className={`route-card ${isSelected ? 'route-card-selected' : ''}`}
                      onClick={() => handleSelectRoute(idx)}
                      style={{
                        borderLeftColor: route.color,
                      }}
                    >
                      <div className="route-card-top">
                        <div className="route-label-wrap">
                          <span
                            className="route-color-dot"
                            style={{ backgroundColor: route.color }}
                          />
                          <span className="route-card-label">{route.label}</span>
                        </div>
                        <span className="route-card-duration">{route.durationText}</span>
                      </div>

                      <div className="route-card-meta">
                        <span>{route.distanceText}</span>
                        {route.transitSummary && (
                          <span className="route-transit-tag">{route.transitSummary}</span>
                        )}
                      </div>

                      <div className="route-card-badges">
                        {isEco && (
                          <span className="route-badge badge-eco">
                            <Leaf size={11} />
                            FUEL_EFFICIENT
                          </span>
                        )}
                        {typeof route.fuelLiters === 'number' && (
                          <span className="route-badge badge-fuel">
                            ~{route.fuelLiters.toFixed(2)} L fuel
                          </span>
                        )}
                        {route.hasTolls && (
                          <span className="route-badge badge-toll">
                            Tolls {route.tollEstimateText ? `(${route.tollEstimateText})` : 'apply'}
                          </span>
                        )}
                      </div>

                      {route.warnings.length > 0 && (
                        <p className="route-card-warning">{route.warnings[0]}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        <section className="right-stage" aria-label="Interactive Map and Elevation Workspace">
          <RouteMap
            origin={origin}
            destination={destination}
            activeMode={activeMode}
            routes={activeBundle.routes}
            selectedRouteIndex={activeRouteIndex}
            hoveredElevationPoint={hoveredElevationPoint}
            onSelectRoute={handleSelectRoute}
          />

          <ElevationProfileChart
            activeMode={activeMode}
            profile={elevationProfile}
            isLoading={isLoadingElevation}
            error={elevationError}
            hoveredPoint={hoveredElevationPoint}
            onHoverPointChange={setHoveredElevationPoint}
            onSwitchToCycling={() => setActiveMode('BICYCLING')}
          />
        </section>
      </main>
    </div>
  );
}
