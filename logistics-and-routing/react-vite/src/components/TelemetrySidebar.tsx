import {
  Activity,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Truck,
} from 'lucide-react';
import type {
  DispatchRouteResult,
  FleetVehicle,
  LogisticsHub,
  RoadSnapResult,
} from '../types/logistics';

interface TelemetrySidebarProps {
  vehicles: FleetVehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  showRoadSnapComparison: boolean;
  onToggleRoadSnapComparison: () => void;
  roadSnapResult: RoadSnapResult | null;
  isSnapping: boolean;
  depot: LogisticsHub | null;
  orderedStops: LogisticsHub[];
  optimizeOrder: boolean;
  onToggleOptimizeOrder: () => void;
  onComputeDispatch: () => void;
  isComputingDispatch: boolean;
  dispatchResult: DispatchRouteResult | null;
  hubsLoading: boolean;
  hubsError: string | null;
}

const STATUS_LABEL: Record<FleetVehicle['status'], string> = {
  'en-route': 'En Route',
  delayed: 'Delayed',
  idle: 'Idle',
};

export function TelemetrySidebar({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  showRoadSnapComparison,
  onToggleRoadSnapComparison,
  roadSnapResult,
  isSnapping,
  depot,
  orderedStops,
  optimizeOrder,
  onToggleOptimizeOrder,
  onComputeDispatch,
  isComputingDispatch,
  dispatchResult,
  hubsLoading,
  hubsError,
}: TelemetrySidebarProps) {
  return (
    <aside className="telemetry-sidebar" aria-label="Fleet telematics and dispatch sidebar">
      {/* Section 1: Active Fleet Telemetry Cards */}
      <section className="sidebar-section">
        <div className="section-header">
          <div className="section-title-group">
            <Truck size={15} />
            <h2>Active Fleet Telemetry</h2>
          </div>
          <span className="section-count">{vehicles.length} units</span>
        </div>

        <div className="vehicle-list" data-testid="fleet-vehicle-list">
          {vehicles.length === 0 ? (
            <div className="empty-state">
              No fleet units match the active status filter.
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedVehicleId;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className={`vehicle-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="vehicle-card-top">
                    <div>
                      <span className="vehicle-id">{vehicle.label}</span>
                      <span className="vehicle-unit">{vehicle.unitType}</span>
                    </div>
                    <span className={`status-chip status-${vehicle.status}`}>
                      {STATUS_LABEL[vehicle.status]}
                    </span>
                  </div>

                  <div className="vehicle-metrics">
                    <span className="metric-item">
                      <Gauge size={13} />
                      <strong>{vehicle.speedMph} mph</strong>
                    </span>
                    <span className="metric-item">
                      <Clock size={13} />
                      ETA <strong>{vehicle.etaText}</strong>
                    </span>
                  </div>

                  <div className="vehicle-next-stop">
                    <Navigation size={12} />
                    <span>Next: {vehicle.nextStop}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Section 2: GPS Trace & Roads API Inspector */}
      <section className="sidebar-section" data-testid="raw-vs-snapped-panel">
        <div className="section-header">
          <div className="section-title-group">
            <Activity size={15} />
            <h2>GPS Trace &amp; Roads Snap</h2>
          </div>
          <button
            type="button"
            data-testid="snap-to-roads-toggle"
            onClick={onToggleRoadSnapComparison}
            className={`toggle-pill ${showRoadSnapComparison ? 'is-active' : ''}`}
            aria-pressed={showRoadSnapComparison}
          >
            {showRoadSnapComparison ? 'Trace Visible' : 'Trace Hidden'}
          </button>
        </div>

        <div className="snap-inspector-box">
          <div className="snap-source-row">
            <span className="snap-vehicle-tag">
              Unit: <strong>{roadSnapResult?.vehicleId ?? selectedVehicleId}</strong>
            </span>
            <span className="snap-source-badge">
              {isSnapping
                ? 'Snapping...'
                : roadSnapResult?.source === 'roads-api'
                  ? 'Roads API v1/snapToRoads'
                  : roadSnapResult?.source === 'routes-fallback'
                    ? 'Routes API Corridor Snap'
                    : 'Awaiting Snap'}
            </span>
          </div>

          <div className="snap-metrics-grid">
            <div className="snap-metric">
              <span className="snap-metric-label">Raw GPS Pts</span>
              <span className="snap-metric-value">
                {roadSnapResult?.rawPoints.length ?? 0}
              </span>
            </div>
            <div className="snap-metric">
              <span className="snap-metric-label">Snapped Pts</span>
              <span className="snap-metric-value">
                {roadSnapResult?.snappedPath.length ?? 0}
              </span>
            </div>
            <div className="snap-metric">
              <span className="snap-metric-label">Road Segments</span>
              <span className="snap-metric-value">
                {roadSnapResult?.uniqueRoadSegments ?? 0}
              </span>
            </div>
            <div className="snap-metric">
              <span className="snap-metric-label">Mean Drift</span>
              <span className="snap-metric-value">
                {roadSnapResult ? `${roadSnapResult.meanOffsetMeters} m` : '—'}
              </span>
            </div>
          </div>

          {roadSnapResult?.warningMessage && (
            <p className="snap-warning-note">{roadSnapResult.warningMessage}</p>
          )}
        </div>
      </section>

      {/* Section 3: Multi-Stop Dispatch & Route Matrix */}
      <section className="sidebar-section" data-testid="dispatch-matrix-panel">
        <div className="section-header">
          <div className="section-title-group">
            <RouteIcon size={15} />
            <h2>Multi-Stop Dispatch &amp; Matrix</h2>
          </div>
          {dispatchResult && (
            <span className="dispatch-totals">
              {dispatchResult.totalDurationText} &bull; {dispatchResult.totalDistanceText}
            </span>
          )}
        </div>

        <div className="dispatch-controls">
          <label className="optimize-toggle-label">
            <input
              type="checkbox"
              data-testid="optimize-waypoints-toggle"
              checked={optimizeOrder}
              onChange={onToggleOptimizeOrder}
            />
            <span>Optimize stop order</span>
          </label>

          <button
            type="button"
            data-testid="calculate-dispatch-route-btn"
            onClick={onComputeDispatch}
            disabled={isComputingDispatch || !depot || orderedStops.length === 0}
            className="primary-dispatch-btn"
          >
            {isComputingDispatch ? 'Computing...' : 'Compute Dispatch'}
          </button>
        </div>

        {hubsLoading && (
          <div className="hub-status-note">
            Discovering live Dallas logistics hubs via Places API (New)...
          </div>
        )}
        {hubsError && <div className="hub-status-note is-warn">{hubsError}</div>}

        {depot && (
          <div className="stop-sequence-list">
            <div className="stop-row is-depot">
              <span className="stop-badge is-depot">D</span>
              <div className="stop-info">
                <span className="stop-name">{depot.name}</span>
                <span className="stop-address">{depot.address}</span>
              </div>
            </div>

            {orderedStops.map((stop, idx) => {
              const leg = dispatchResult?.legs[idx];
              return (
                <div key={stop.id} className="stop-row">
                  <span className="stop-badge">{idx + 1}</span>
                  <div className="stop-info">
                    <span className="stop-name">{stop.name}</span>
                    <span className="stop-address">
                      <MapPin size={10} /> {stop.address}
                    </span>
                  </div>
                  {leg && (
                    <div className="stop-leg-eta">
                      <span>{leg.durationText}</span>
                      <small>{leg.distanceText}</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dispatchResult && dispatchResult.matrixEntries.length > 0 && (
          <div className="matrix-table-wrap">
            <div className="matrix-caption">Depot-to-Hub Route Matrix (Traffic Aware)</div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Drop-Off Hub</th>
                  <th>ETA</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {dispatchResult.matrixEntries.map((entry) => (
                  <tr key={entry.hubId}>
                    <td className="matrix-hub-name" title={entry.address}>
                      {entry.hubName}
                    </td>
                    <td>{entry.durationText}</td>
                    <td>{entry.distanceText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </aside>
  );
}
