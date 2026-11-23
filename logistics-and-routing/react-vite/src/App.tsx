import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Layers, Radio, ShieldAlert } from 'lucide-react';
import { DispatchMapOverlays } from './components/DispatchMapOverlays';
import { PlaceSearchBar } from './components/PlaceSearchBar';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { VehicleMarkers } from './components/VehicleMarkers';
import { DALLAS_CENTER, INITIAL_FLEET_VEHICLES } from './data/dallasFleet';
import { snapVehicleBreadcrumbs } from './services/roadsService';
import {
  computeDispatchRouteAndMatrix,
  discoverDallasHubs,
} from './services/routingService';
import type {
  DispatchRouteResult,
  FleetVehicle,
  LogisticsHub,
  RoadSnapResult,
  StatusFilter,
} from './types/logistics';

function DispatchConsole({ hasApiKey }: { hasApiKey: boolean }) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');

  const [vehicles, setVehicles] = useState<FleetVehicle[]>(INITIAL_FLEET_VEHICLES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('DAL-104');
  const [trafficEnabled, setTrafficEnabled] = useState<boolean>(true);
  const [showRoadSnapComparison, setShowRoadSnapComparison] = useState<boolean>(true);

  const [depot, setDepot] = useState<LogisticsHub | null>(null);
  const [stops, setStops] = useState<LogisticsHub[]>([]);
  const [hubsLoading, setHubsLoading] = useState<boolean>(false);
  const [hubsError, setHubsError] = useState<string | null>(null);

  const [optimizeOrder, setOptimizeOrder] = useState<boolean>(true);
  const [dispatchResult, setDispatchResult] = useState<DispatchRouteResult | null>(null);
  const [isComputingDispatch, setIsComputingDispatch] = useState<boolean>(false);

  const [roadSnapCache, setRoadSnapCache] = useState<Record<string, RoadSnapResult>>({});
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  const initialHubDiscoveryDone = useRef(false);

  const statusCounts = useMemo(() => {
    const counts = {
      all: vehicles.length,
      'en-route': 0,
      delayed: 0,
      idle: 0,
    };
    for (const v of vehicles) {
      counts[v.status] += 1;
    }
    return counts;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'all') return vehicles;
    return vehicles.filter((v) => v.status === statusFilter);
  }, [vehicles, statusFilter]);

  useEffect(() => {
    if (
      filteredVehicles.length > 0 &&
      !filteredVehicles.some((v) => v.id === selectedVehicleId)
    ) {
      setSelectedVehicleId(filteredVehicles[0].id);
    }
  }, [filteredVehicles, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0],
    [vehicles, selectedVehicleId],
  );

  // Discover live Dallas logistics hubs on load via Places API (New)
  useEffect(() => {
    if (!placesLib || initialHubDiscoveryDone.current) return;
    initialHubDiscoveryDone.current = true;

    let cancelled = false;
    setHubsLoading(true);

    void discoverDallasHubs(placesLib).then((res) => {
      if (cancelled) return;
      setHubsLoading(false);
      setHubsError(res.error);

      if (res.depot) {
        setDepot(res.depot);
        setStops(res.stops);

        // Link active en-route/delayed vehicles' nextStop labels to live Dallas hubs
        if (res.stops.length > 0) {
          setVehicles((prev) =>
            prev.map((v, idx) => {
              if (v.status === 'idle') return v;
              const targetHub = res.stops[idx % res.stops.length];
              return {
                ...v,
                nextStop: targetHub.name,
              };
            }),
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placesLib]);

  const runDispatchCalculation = useCallback(
    async (targetDepot: LogisticsHub | null, targetStops: LogisticsHub[], shouldOptimize: boolean) => {
      if (!routesLib || !targetDepot || targetStops.length === 0) return;
      setIsComputingDispatch(true);
      try {
        const result = await computeDispatchRouteAndMatrix(
          routesLib,
          targetDepot,
          targetStops,
          shouldOptimize,
        );
        setDispatchResult(result);
        setFitBoundsTrigger((n) => n + 1);

        // Update vehicle ETAs from live matrix calculations where applicable
        if (result.matrixEntries.length > 0) {
          setVehicles((prev) =>
            prev.map((v, idx) => {
              if (v.status === 'idle') return v;
              const matrixMatch = result.matrixEntries[idx % result.matrixEntries.length];
              return matrixMatch
                ? { ...v, etaText: matrixMatch.durationText }
                : v;
            }),
          );
        }
      } catch {
        setHubsError('Unable to compute multi-stop route with the current API key.');
      } finally {
        setIsComputingDispatch(false);
      }
    },
    [routesLib],
  );

  // Auto-compute dispatch corridor + route matrix when hubs load or optimizeOrder toggles
  useEffect(() => {
    if (!routesLib || !depot || stops.length === 0) return;
    void runDispatchCalculation(depot, stops, optimizeOrder);
  }, [routesLib, depot, stops, optimizeOrder, runDispatchCalculation]);

  // Snap selected vehicle's noisy GPS breadcrumbs via Roads API v1/snapToRoads
  useEffect(() => {
    if (!selectedVehicle || !hasApiKey) return;
    if (roadSnapCache[selectedVehicle.id]) return;

    let cancelled = false;
    setIsSnapping(true);

    void snapVehicleBreadcrumbs(selectedVehicle, geometryLib, routesLib).then(
      (result) => {
        if (cancelled) return;
        setRoadSnapCache((prev) => ({
          ...prev,
          [selectedVehicle.id]: result,
        }));
        setIsSnapping(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [selectedVehicle, geometryLib, routesLib, roadSnapCache, hasApiKey]);

  const handleHubSelected = useCallback(
    (hub: LogisticsHub) => {
      setHubsError(null);
      if (!depot) {
        setDepot({ ...hub, isDepot: true });
      } else {
        setStops((prev) => {
          const filtered = prev.filter((s) => s.id !== hub.id);
          return [...filtered, hub].slice(0, 6);
        });
      }
      map?.panTo(hub.position);
    },
    [depot, map],
  );

  const orderedStops = useMemo(() => {
    if (!dispatchResult?.orderedStopIds.length) return stops;
    const stopLookup: Record<string, LogisticsHub> = {};
    for (const s of stops) {
      stopLookup[s.id] = s;
    }
    const ordered = dispatchResult.orderedStopIds
      .map((id) => stopLookup[id])
      .filter(Boolean);
    return ordered.length === stops.length ? ordered : stops;
  }, [stops, dispatchResult]);

  const activeSnapResult = selectedVehicle
    ? roadSnapCache[selectedVehicle.id] ?? null
    : null;

  return (
    <div className="dispatch-shell">
      {/* Compact Top Command Bar (56px) */}
      <header className="top-command-bar">
        <div className="brand-cluster">
          <span className="brand-pulse" aria-hidden="true">
            <Radio size={15} />
          </span>
          <div>
            <h1 className="brand-title">Dallas Fleet Ops</h1>
            <span className="brand-subtitle">Telematics &amp; Dispatch Console</span>
          </div>
        </div>

        <div className="filter-pills" role="group" aria-label="Filter fleet by status">
          <button
            type="button"
            data-testid="status-filter-all"
            onClick={() => setStatusFilter('all')}
            className={`filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
          >
            All <span className="pill-count">{statusCounts.all}</span>
          </button>
          <button
            type="button"
            data-testid="status-filter-en-route"
            onClick={() => setStatusFilter('en-route')}
            className={`filter-pill is-en-route ${statusFilter === 'en-route' ? 'is-active' : ''}`}
          >
            En Route <span className="pill-count">{statusCounts['en-route']}</span>
          </button>
          <button
            type="button"
            data-testid="status-filter-delayed"
            onClick={() => setStatusFilter('delayed')}
            className={`filter-pill is-delayed ${statusFilter === 'delayed' ? 'is-active' : ''}`}
          >
            Delayed <span className="pill-count">{statusCounts.delayed}</span>
          </button>
          <button
            type="button"
            data-testid="status-filter-idle"
            onClick={() => setStatusFilter('idle')}
            className={`filter-pill is-idle ${statusFilter === 'idle' ? 'is-active' : ''}`}
          >
            Idle <span className="pill-count">{statusCounts.idle}</span>
          </button>
        </div>

        <div className="command-actions">
          <button
            type="button"
            data-testid="traffic-layer-toggle"
            onClick={() => setTrafficEnabled((prev) => !prev)}
            className={`traffic-btn ${trafficEnabled ? 'is-active' : ''}`}
            aria-pressed={trafficEnabled}
          >
            <Layers size={14} />
            <span>Traffic {trafficEnabled ? 'On' : 'Off'}</span>
          </button>

          {hasApiKey ? (
            <PlaceSearchBar onHubSelected={handleHubSelected} />
          ) : (
            <div
              data-testid="place-autocomplete-container"
              className="place-autocomplete-placeholder"
            >
              Places Search (Set API Key)
            </div>
          )}
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="workspace-main">
        <TelemetrySidebar
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicle.id}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            const target = vehicles.find((v) => v.id === id);
            if (target && map) {
              map.panTo(target.position);
            }
          }}
          showRoadSnapComparison={showRoadSnapComparison}
          onToggleRoadSnapComparison={() =>
            setShowRoadSnapComparison((prev) => !prev)
          }
          roadSnapResult={activeSnapResult}
          isSnapping={isSnapping}
          depot={depot}
          orderedStops={orderedStops}
          optimizeOrder={optimizeOrder}
          onToggleOptimizeOrder={() => setOptimizeOrder((prev) => !prev)}
          onComputeDispatch={() =>
            void runDispatchCalculation(depot, stops, optimizeOrder)
          }
          isComputingDispatch={isComputingDispatch}
          dispatchResult={dispatchResult}
          hubsLoading={hubsLoading}
          hubsError={hubsError}
        />

        <section className="map-stage" data-testid="map-container">
          {hasApiKey ? (
            <GoogleMap
              id="dallas-dispatch-map"
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
              defaultCenter={DALLAS_CENTER}
              defaultZoom={12}
              clickableIcons={false}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={false}
              className="google-map-canvas"
            >
              <DispatchMapOverlays
                trafficEnabled={trafficEnabled}
                showRoadSnapComparison={showRoadSnapComparison}
                rawTracePath={selectedVehicle.rawBreadcrumbs}
                snappedTracePath={activeSnapResult?.snappedPath ?? []}
                dispatchRoutePath={dispatchResult?.path ?? []}
                fitBoundsTrigger={fitBoundsTrigger}
              />

              <VehicleMarkers
                vehicles={filteredVehicles}
                selectedVehicleId={selectedVehicle.id}
                onSelectVehicle={setSelectedVehicleId}
                depot={depot}
                orderedStops={orderedStops}
              />
            </GoogleMap>
          ) : (
            <div className="missing-key-overlay">
              <div className="missing-key-card">
                <ShieldAlert size={28} />
                <h2>Google Maps API Key Required</h2>
                <p>
                  Create a <code>.env.local</code> file in this project directory with{' '}
                  <code>VITE_GOOGLE_MAPS_API_KEY=your_key</code> to initialize the
                  Dallas vector map, Places API (New), Routes API, and Roads API
                  snap-to-roads overlay.
                </p>
                <p className="missing-key-hint">
                  Need a free prototyping key? Visit{' '}
                  <a
                      href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Maps Demo Key Quickstart
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Interactive Map Legend */}
          <div className="map-legend" aria-label="Map legend">
            <div className="legend-row">
              <span className="legend-dot is-en-route" /> En Route
              <span className="legend-dot is-delayed" /> Delayed
              <span className="legend-dot is-idle" /> Idle
            </div>
            <div className="legend-row">
              <span className="legend-line is-raw" /> Raw GPS
              <span className="legend-line is-snapped" /> Snapped Road
              <span className="legend-line is-dispatch" /> Dispatch Route
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasApiKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

  if (!hasApiKey) {
    return <DispatchConsole hasApiKey={false} />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}
      language="en"
      region="US"
    >
      <DispatchConsole hasApiKey={true} />
    </APIProvider>
  );
}

export default App;
