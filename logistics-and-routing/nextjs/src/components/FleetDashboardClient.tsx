'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map as GoogleMap } from '@vis.gl/react-google-maps';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Shuffle,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  DALLAS_CENTER,
  DALLAS_INITIAL_ZOOM,
  FALLBACK_DEPOT_HUB,
  INITIAL_FLEET_VEHICLES,
  SEED_PLACES_QUERY,
} from '@/lib/fleet-data';
import type {
  DispatchRouteResult,
  FleetVehicle,
  LogisticsHub,
  RoadsSnapResult,
  RouteMatrixCell,
  StatusFilter,
} from '@/lib/types';
import {
  EncodedRoutePolyline,
  HubMarker,
  PolylineOverlay,
  TrafficOverlay,
  VehicleMarker,
} from './MapOverlays';
import { PlaceAutocompleteBox } from './PlaceAutocompleteBox';

interface FleetDashboardClientProps {
  apiKey: string;
}

export function FleetDashboardClient({ apiKey }: FleetDashboardClientProps) {
  const hasApiKey = apiKey.trim().length > 0 && apiKey !== 'your_google_maps_api_key_here';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('DAL-104');
  const [openInfoVehicleId, setOpenInfoVehicleId] = useState<string | null>(null);

  const [showRawTrace, setShowRawTrace] = useState<boolean>(true);
  const [showSnappedTrace, setShowSnappedTrace] = useState<boolean>(true);

  const [depot, setDepot] = useState<LogisticsHub>(FALLBACK_DEPOT_HUB);
  const [dropoffHubs, setDropoffHubs] = useState<LogisticsHub[]>([]);
  const [placesStatus, setPlacesStatus] = useState<string>(
    hasApiKey
      ? 'Discovering live Dallas logistics hubs...'
      : 'Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to load live Dallas hubs.'
  );

  const [snapByVehicle, setSnapByVehicle] = useState<
    Record<string, RoadsSnapResult>
  >({});
  const [isSnapping, setIsSnapping] = useState<boolean>(false);

  const [optimizeOrder, setOptimizeOrder] = useState<boolean>(false);
  const [dispatchRoute, setDispatchRoute] =
    useState<DispatchRouteResult | null>(null);
  const [routeMatrix, setRouteMatrix] = useState<RouteMatrixCell[]>([]);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const initialAutoComputedRef = useRef<boolean>(false);

  // Assign live Places API hub labels to active moving vehicles
  const vehicles = useMemo<FleetVehicle[]>(() => {
    return INITIAL_FLEET_VEHICLES.map((v, idx) => {
      if (v.status === 'Idle') return v;
      if (dropoffHubs.length > 0) {
        const assignedHub = dropoffHubs[idx % dropoffHubs.length];
        return {
          ...v,
          nextStopHubId: assignedHub.id,
          nextStopLabel: assignedHub.name,
        };
      }
      return v;
    });
  }, [dropoffHubs]);

  const statusCounts = useMemo(() => {
    let enRoute = 0;
    let delayed = 0;
    let idle = 0;
    for (const v of vehicles) {
      if (v.status === 'En Route') enRoute += 1;
      else if (v.status === 'Delayed') delayed += 1;
      else idle += 1;
    }
    return {
      all: vehicles.length,
      enRoute,
      delayed,
      idle,
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'All') return vehicles;
    return vehicles.filter((v) => v.status === statusFilter);
  }, [vehicles, statusFilter]);

  const selectedVehicle = useMemo(() => {
    return (
      vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]
    );
  }, [vehicles, selectedVehicleId]);

  const activeSnapResult = snapByVehicle[selectedVehicle.id] ?? null;

  // Discover real Dallas logistics hubs via Places API (New) BFF endpoint
  useEffect(() => {
    if (!hasApiKey) return;

    let cancelled = false;
    async function loadDallasHubs() {
      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery: SEED_PLACES_QUERY,
            maxResultCount: 6,
          }),
        });
        const data = (await res.json()) as {
          places?: Array<{
            id: string;
            name: string;
            formattedAddress: string;
            location: { lat: number; lng: number };
          }>;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok || !data.places?.length) {
          setPlacesStatus(
            data.error ||
              'Live Places search returned no hubs; use autocomplete to add stops.'
          );
          return;
        }

        const [first, ...rest] = data.places;
        setDepot({
          id: first.id,
          placeId: first.id,
          name: first.name,
          address: first.formattedAddress,
          location: first.location,
          role: 'depot',
          source: 'places_api',
        });

        setDropoffHubs(
          rest.slice(0, 4).map((p) => ({
            id: p.id,
            placeId: p.id,
            name: p.name,
            address: p.formattedAddress,
            location: p.location,
            role: 'dropoff',
            source: 'places_api',
          }))
        );
        setPlacesStatus(
          `${data.places.length} live Dallas hubs loaded via Places API (New)`
        );
      } catch {
        if (!cancelled) {
          setPlacesStatus('Unable to reach /api/places/search BFF proxy.');
        }
      }
    }

    void loadDallasHubs();
    return () => {
      cancelled = true;
    };
  }, [hasApiKey]);

  // Snap noisy GPS breadcrumbs for a vehicle using Roads API BFF endpoint
  const snapVehicleTrace = useCallback(
    async (vehicle: FleetVehicle) => {
      if (!hasApiKey) return;
      setIsSnapping(true);
      try {
        const res = await fetch('/api/roads/snap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: vehicle.id,
            path: vehicle.rawGpsTrace,
            interpolate: true,
          }),
        });
        const data = (await res.json()) as Partial<RoadsSnapResult> & {
          error?: string;
        };

        if (!res.ok || !data.snappedPath?.length) {
          setSnapByVehicle((prev) => ({
            ...prev,
            [vehicle.id]: {
              vehicleId: vehicle.id,
              rawCount: vehicle.rawGpsTrace.length,
              snappedCount: 0,
              uniqueRoadSegments: 0,
              meanOffsetMeters: 0,
              snappedPath: [],
              snappedPoints: [],
              source: 'unavailable',
              errorMessage:
                data.error ||
                'Roads API Snap to Roads requires Roads API enabled on your API key.',
            },
          }));
          return;
        }

        setSnapByVehicle((prev) => ({
          ...prev,
          [vehicle.id]: {
            vehicleId: vehicle.id,
            rawCount: data.rawCount ?? vehicle.rawGpsTrace.length,
            snappedCount: data.snappedCount ?? data.snappedPath!.length,
            uniqueRoadSegments: data.uniqueRoadSegments ?? 0,
            meanOffsetMeters: data.meanOffsetMeters ?? 0,
            snappedPath: data.snappedPath ?? [],
            snappedPoints: data.snappedPoints ?? [],
            warningMessage: data.warningMessage,
            source: 'roads_api',
          },
        }));
      } catch {
        setSnapByVehicle((prev) => ({
          ...prev,
          [vehicle.id]: {
            vehicleId: vehicle.id,
            rawCount: vehicle.rawGpsTrace.length,
            snappedCount: 0,
            uniqueRoadSegments: 0,
            meanOffsetMeters: 0,
            snappedPath: [],
            snappedPoints: [],
            source: 'unavailable',
            errorMessage: 'Network error calling /api/roads/snap.',
          },
        }));
      } finally {
        setIsSnapping(false);
      }
    },
    [hasApiKey]
  );

  // Snap selected vehicle whenever selection changes and not yet cached
  useEffect(() => {
    if (!hasApiKey) return;
    if (!snapByVehicle[selectedVehicle.id]) {
      void snapVehicleTrace(selectedVehicle);
    }
  }, [hasApiKey, selectedVehicle, snapByVehicle, snapVehicleTrace]);

  // Compute multi-stop dispatch route + hub-to-stop travel-time matrix via Routes API BFF
  const handleComputeDispatch = useCallback(
    async (useOptimizedOrder: boolean) => {
      if (!hasApiKey || dropoffHubs.length === 0) return;

      setIsComputingRoute(true);
      setDispatchError(null);

      const finalDestination = dropoffHubs[dropoffHubs.length - 1];
      const intermediates = dropoffHubs.slice(0, -1);

      try {
        const [routeRes, matrixRes] = await Promise.all([
          fetch('/api/routes/compute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: {
                id: depot.id,
                name: depot.name,
                location: depot.location,
              },
              destination: {
                id: finalDestination.id,
                name: finalDestination.name,
                location: finalDestination.location,
              },
              intermediates: intermediates.map((h) => ({
                id: h.id,
                name: h.name,
                location: h.location,
              })),
              optimizeWaypointOrder: useOptimizedOrder,
            }),
          }),
          fetch('/api/routes/matrix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origins: [
                {
                  id: depot.id,
                  name: depot.name,
                  location: depot.location,
                },
              ],
              destinations: dropoffHubs.map((h) => ({
                id: h.id,
                name: h.name,
                location: h.location,
              })),
            }),
          }),
        ]);

        const routePayload = (await routeRes.json()) as Partial<DispatchRouteResult> & {
          error?: string;
        };
        const matrixPayload = (await matrixRes.json()) as {
          elements?: RouteMatrixCell[];
          error?: string;
        };

        if (!routeRes.ok || !routePayload.encodedPolyline) {
          setDispatchError(
            routePayload.error ||
              'Unable to compute multi-stop route via Routes API.'
          );
        } else {
          setDispatchRoute(routePayload as DispatchRouteResult);
        }

        if (matrixRes.ok && Array.isArray(matrixPayload.elements)) {
          setRouteMatrix(matrixPayload.elements);
        } else if (matrixPayload.error && !routePayload.error) {
          setDispatchError(matrixPayload.error);
        }
      } catch {
        setDispatchError('Failed to reach Routes API BFF proxies.');
      } finally {
        setIsComputingRoute(false);
      }
    },
    [hasApiKey, depot, dropoffHubs]
  );

  // Trigger initial dispatch route & matrix once live drop-off hubs arrive
  useEffect(() => {
    if (
      hasApiKey &&
      dropoffHubs.length > 0 &&
      !initialAutoComputedRef.current
    ) {
      initialAutoComputedRef.current = true;
      void handleComputeDispatch(optimizeOrder);
    }
  }, [hasApiKey, dropoffHubs, optimizeOrder, handleComputeDispatch]);

  const handleAddAutocompleteHub = useCallback((hub: LogisticsHub) => {
    setDropoffHubs((prev) => {
      if (prev.some((existing) => existing.id === hub.id)) {
        return prev;
      }
      return [...prev, hub];
    });
  }, []);

  const handleRemoveHub = useCallback((hubId: string) => {
    setDropoffHubs((prev) => prev.filter((h) => h.id !== hubId));
  }, []);

  const handleToggleRoadsOverlay = () => {
    const nextState = !(showRawTrace && showSnappedTrace);
    setShowRawTrace(nextState || true);
    setShowSnappedTrace((prev) => !prev);
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setOpenInfoVehicleId(vehicleId);
  };

  // Ordered stop display taking optimizedIntermediateWaypointIndex into account
  const orderedDropoffHubs = useMemo(() => {
    if (
      !dispatchRoute ||
      !dispatchRoute.optimizedIntermediateWaypointIndex?.length ||
      dropoffHubs.length <= 1
    ) {
      return dropoffHubs;
    }
    const intermediates = dropoffHubs.slice(0, -1);
    const last = dropoffHubs[dropoffHubs.length - 1];
    const reordered = dispatchRoute.optimizedIntermediateWaypointIndex
      .map((idx) => intermediates[idx])
      .filter(Boolean);
    if (reordered.length !== intermediates.length) return dropoffHubs;
    return [...reordered, last];
  }, [dispatchRoute, dropoffHubs]);

  const mapContent = (
    <div className="app-shell">
      {/* Top 56px Command Bar */}
      <header className="command-bar">
        <div className="brand-group">
          <div className="brand-badge">
            <Truck size={18} />
          </div>
          <div>
            <div className="brand-title">Dallas FleetOps</div>
            <div className="brand-subtitle">
              Telematics, Roads API Snap &amp; Dispatch
            </div>
          </div>
        </div>

        <div className="command-controls">
          <div className="filter-pills" role="group" aria-label="Fleet status filters">
            <button
              type="button"
              data-testid="status-filter-all"
              className={`filter-pill ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              <span>All</span>
              <span className="pill-count">{statusCounts.all}</span>
            </button>
            <button
              type="button"
              data-testid="status-filter-en-route"
              className={`filter-pill ${statusFilter === 'En Route' ? 'active-enroute' : ''}`}
              onClick={() => setStatusFilter('En Route')}
            >
              <span>En Route</span>
              <span className="pill-count">{statusCounts.enRoute}</span>
            </button>
            <button
              type="button"
              data-testid="status-filter-delayed"
              className={`filter-pill ${statusFilter === 'Delayed' ? 'active-delayed' : ''}`}
              onClick={() => setStatusFilter('Delayed')}
            >
              <span>Delayed</span>
              <span className="pill-count">{statusCounts.delayed}</span>
            </button>
            <button
              type="button"
              data-testid="status-filter-idle"
              className={`filter-pill ${statusFilter === 'Idle' ? 'active-idle' : ''}`}
              onClick={() => setStatusFilter('Idle')}
            >
              <span>Idle</span>
              <span className="pill-count">{statusCounts.idle}</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="traffic-layer-toggle"
            className={`traffic-toggle-btn ${showTraffic ? 'active' : ''}`}
            onClick={() => setShowTraffic((prev) => !prev)}
            aria-pressed={showTraffic}
          >
            <Layers size={14} />
            <span>{showTraffic ? 'Traffic On' : 'Traffic Layer'}</span>
          </button>

          <PlaceAutocompleteBox
            hasApiKey={hasApiKey}
            onHubSelected={handleAddAutocompleteHub}
          />
        </div>
      </header>

      {/* Split Workspace */}
      <div className="workspace-body">
        {/* Left Telemetry & Dispatch Sidebar */}
        <aside className="telemetry-sidebar">
          {/* 1. Active Fleet Telemetry Cards */}
          <section className="panel-card">
            <div className="panel-header">
              <div className="panel-title-wrap">
                <Activity size={15} color="#4f46e5" />
                <div>
                  <h2 className="panel-title">Active Fleet Telemetry</h2>
                  <div className="panel-subtitle">
                    {filteredVehicles.length} of {vehicles.length} Dallas units
                  </div>
                </div>
              </div>
            </div>

            <div className="vehicle-list" data-testid="fleet-vehicle-list">
              {filteredVehicles.map((vehicle) => {
                const isSelected = vehicle.id === selectedVehicle.id;
                const badgeClass =
                  vehicle.status === 'En Route'
                    ? 'en-route'
                    : vehicle.status === 'Delayed'
                      ? 'delayed'
                      : 'idle';

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    className={`vehicle-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVehicleSelect(vehicle.id)}
                  >
                    <div className="vehicle-card-top">
                      <div className="vehicle-id-group">
                        <span className="vehicle-id">{vehicle.id}</span>
                        <span className="vehicle-type">{vehicle.unitType}</span>
                      </div>
                      <span className={`status-badge ${badgeClass}`}>
                        {vehicle.status === 'En Route' && (
                          <CheckCircle2 size={11} />
                        )}
                        {vehicle.status === 'Delayed' && (
                          <AlertTriangle size={11} />
                        )}
                        {vehicle.status === 'Idle' && <Clock size={11} />}
                        {vehicle.status}
                      </span>
                    </div>

                    <div className="vehicle-metrics-grid">
                      <div className="metric-box">
                        <div className="metric-label">Speed</div>
                        <div className="metric-value">
                          {vehicle.speedMph} mph
                        </div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-label">Next ETA</div>
                        <div className="metric-value">
                          {vehicle.etaMinutes !== null
                            ? `${vehicle.etaMinutes} min`
                            : 'Standby'}
                        </div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-label">Load</div>
                        <div className="metric-value">
                          {vehicle.cargoLoadPct}%
                        </div>
                      </div>
                    </div>

                    <div className="vehicle-next-stop">
                      <MapPin size={12} color="#0284c7" />
                      <span>
                        <strong>Next:</strong> {vehicle.nextStopLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. GPS Trace & Roads API Inspector */}
          <section className="panel-card" data-testid="raw-vs-snapped-panel">
            <div className="panel-header">
              <div className="panel-title-wrap">
                <Navigation size={15} color="#0284c7" />
                <div>
                  <h2 className="panel-title">GPS Trace &amp; Roads API Snap</h2>
                  <div className="panel-subtitle">
                    Inspecting {selectedVehicle.id} ·{' '}
                    {selectedVehicle.corridorName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="snap-to-roads-toggle"
                className={`toggle-pill-btn ${showSnappedTrace ? 'active' : ''}`}
                onClick={handleToggleRoadsOverlay}
                aria-pressed={showSnappedTrace}
              >
                {showSnappedTrace ? 'Snapped On' : 'Snapped Off'}
              </button>
            </div>

            <div className="trace-legend-row">
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showRawTrace}
                  onChange={(e) => setShowRawTrace(e.target.checked)}
                />
                <span className="trace-swatch-raw" />
                Raw GPS ({selectedVehicle.rawGpsTrace.length})
              </label>
              <span>
                <span className="trace-swatch-snapped" />
                Snapped ({activeSnapResult?.snappedCount ?? 0})
              </span>
            </div>

            <div className="roads-stats-grid">
              <div className="roads-stat-cell">
                <div className="metric-label">Raw / Snapped Pts</div>
                <div className="metric-value">
                  {selectedVehicle.rawGpsTrace.length} /{' '}
                  {isSnapping
                    ? '...'
                    : activeSnapResult?.snappedCount ?? '—'}
                </div>
              </div>
              <div className="roads-stat-cell">
                <div className="metric-label">Road Segments</div>
                <div className="metric-value">
                  {isSnapping
                    ? '...'
                    : activeSnapResult?.uniqueRoadSegments ?? '—'}
                </div>
              </div>
              <div className="roads-stat-cell">
                <div className="metric-label">Mean Snap Offset</div>
                <div className="metric-value">
                  {activeSnapResult && activeSnapResult.source === 'roads_api'
                    ? `${activeSnapResult.meanOffsetMeters} m`
                    : '—'}
                </div>
              </div>
              <div className="roads-stat-cell">
                <div className="metric-label">Roads API Status</div>
                <div className="metric-value">
                  {isSnapping
                    ? 'Snapping...'
                    : activeSnapResult?.source === 'roads_api'
                      ? 'Interpolated'
                      : 'Raw Only'}
                </div>
              </div>
            </div>

            {activeSnapResult?.errorMessage && (
              <div className="notice-banner" style={{ marginTop: 8 }}>
                {activeSnapResult.errorMessage}
              </div>
            )}
          </section>

          {/* 3. Multi-Stop Dispatch & Route Matrix Panel */}
          <section className="panel-card" data-testid="dispatch-matrix-panel">
            <div className="panel-header">
              <div className="panel-title-wrap">
                <RouteIcon size={15} color="#4f46e5" />
                <div>
                  <h2 className="panel-title">
                    Multi-Stop Dispatch &amp; Matrix
                  </h2>
                  <div className="panel-subtitle">{placesStatus}</div>
                </div>
              </div>
            </div>

            <div className="hub-stop-list">
              <div className="hub-stop-row">
                <span className="hub-stop-badge depot">D</span>
                <div className="hub-stop-meta">
                  <div className="hub-stop-name">{depot.name}</div>
                  <div className="hub-stop-addr">{depot.address}</div>
                </div>
              </div>

              {orderedDropoffHubs.map((hub, idx) => (
                <div key={hub.id} className="hub-stop-row">
                  <span className="hub-stop-badge dropoff">{idx + 1}</span>
                  <div className="hub-stop-meta">
                    <div className="hub-stop-name">{hub.name}</div>
                    <div className="hub-stop-addr">{hub.address}</div>
                  </div>
                  {orderedDropoffHubs.length > 1 && (
                    <button
                      type="button"
                      className="remove-stop-btn"
                      onClick={() => handleRemoveHub(hub.id)}
                      title="Remove stop"
                      aria-label={`Remove ${hub.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="dispatch-actions-row">
              <button
                type="button"
                data-testid="optimize-waypoints-toggle"
                className={`secondary-btn ${optimizeOrder ? 'active' : ''}`}
                onClick={() => {
                  const next = !optimizeOrder;
                  setOptimizeOrder(next);
                  void handleComputeDispatch(next);
                }}
                aria-pressed={optimizeOrder}
              >
                <Shuffle size={13} />
                <span>{optimizeOrder ? 'Optimized' : 'Optimize Order'}</span>
              </button>

              <button
                type="button"
                data-testid="calculate-dispatch-route-btn"
                className="primary-btn"
                disabled={!hasApiKey || dropoffHubs.length === 0 || isComputingRoute}
                onClick={() => void handleComputeDispatch(optimizeOrder)}
              >
                <RouteIcon size={14} />
                <span>
                  {isComputingRoute ? 'Computing...' : 'Compute Dispatch'}
                </span>
              </button>
            </div>

            {dispatchError && (
              <div className="notice-banner" style={{ marginBottom: 8 }}>
                {dispatchError}
              </div>
            )}

            {dispatchRoute && (
              <div className="route-summary-banner">
                <div>
                  <div style={{ fontSize: 10, color: '#4338ca', fontWeight: 700, textTransform: 'uppercase' }}>
                    Corridor Total
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e1b4b' }}>
                    {dispatchRoute.totalDurationText} ·{' '}
                    {dispatchRoute.totalDistanceText}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#4338ca', fontWeight: 600 }}>
                  {dispatchRoute.legs.length} legs
                </span>
              </div>
            )}

            {routeMatrix.length > 0 && (
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Depot → Drop-off Hub</th>
                    <th>ETA</th>
                    <th>Dist</th>
                  </tr>
                </thead>
                <tbody>
                  {routeMatrix.map((cell) => (
                    <tr key={`${cell.originIndex}-${cell.destinationIndex}-${cell.hubId}`}>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cell.hubName}
                      </td>
                      <td className="mono">{cell.durationText}</td>
                      <td className="mono">{cell.distanceText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </aside>

        {/* Right Primary Map Canvas */}
        <main className="map-viewport" data-testid="map-container">
          {hasApiKey ? (
            <GoogleMap
              style={{ width: '100%', height: '100%' }}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
              defaultCenter={DALLAS_CENTER}
              defaultZoom={DALLAS_INITIAL_ZOOM}
              gestureHandling="greedy"
              clickableIcons={false}
              disableDefaultUI={false}
              streetViewControl={false}
              mapTypeControl={false}
            >
              <TrafficOverlay enabled={showTraffic} />

              {dispatchRoute?.encodedPolyline && (
                <EncodedRoutePolyline
                  encodedPolyline={dispatchRoute.encodedPolyline}
                />
              )}

              {showRawTrace && (
                <PolylineOverlay
                  path={selectedVehicle.rawGpsTrace}
                  strokeColor="#ef4444"
                  strokeWeight={3}
                  dashed={true}
                  zIndex={10}
                />
              )}

              {showSnappedTrace &&
                activeSnapResult?.snappedPath &&
                activeSnapResult.snappedPath.length > 1 && (
                  <PolylineOverlay
                    path={activeSnapResult.snappedPath}
                    strokeColor="#0284c7"
                    strokeWeight={5}
                    strokeOpacity={0.92}
                    zIndex={12}
                  />
                )}

              <HubMarker hub={depot} />
              {orderedDropoffHubs.map((hub, idx) => (
                <HubMarker key={hub.id} hub={hub} stopNumber={idx + 1} />
              ))}

              {filteredVehicles.map((vehicle) => (
                <VehicleMarker
                  key={vehicle.id}
                  vehicle={vehicle}
                  isSelected={vehicle.id === selectedVehicle.id}
                  isInfoOpen={openInfoVehicleId === vehicle.id}
                  onSelect={handleVehicleSelect}
                  onCloseInfo={() => setOpenInfoVehicleId(null)}
                />
              ))}
            </GoogleMap>
          ) : (
            <div className="missing-key-overlay">
              <div className="missing-key-card">
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>
                  Google Maps API Key Required
                </h2>
                <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
                  Add your key to <code>.env.local</code> as{' '}
                  <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> and restart the
                  server to render the live Dallas vector map, Advanced Markers,
                  Roads API GPS snapping, and Routes API dispatch matrix.
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                  Need a free prototyping key? Visit{' '}
                  <a
                      href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#38bdf8' }}
                  >
                    mapsplatform.google.com/maps-demo-key
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="map-legend">
            <div className="map-legend-title">Dallas Corridor Legend</div>
            <div className="map-legend-grid">
              <div>
                <span className="legend-dot" style={{ background: '#059669' }} />
                En Route
              </div>
              <div>
                <span className="legend-dot" style={{ background: '#d97706' }} />
                Delayed
              </div>
              <div>
                <span className="legend-dot" style={{ background: '#475569' }} />
                Idle
              </div>
              <div>
                <span className="legend-dot" style={{ background: '#1e3a8a' }} />
                Depot / Hubs
              </div>
              <div>
                <span className="trace-swatch-raw" />
                Raw GPS
              </div>
              <div>
                <span className="trace-swatch-snapped" />
                Roads Snapped
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
              <span className="trace-swatch-corridor" />
              Multi-Stop Dispatch Corridor · Powered by Google Maps Platform
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  if (!hasApiKey) {
    return mapContent;
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="US">
      {mapContent}
    </APIProvider>
  );
}
