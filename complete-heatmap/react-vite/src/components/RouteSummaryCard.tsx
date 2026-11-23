import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react';
import type { EvacuationRouteState } from '../types/hazard';

interface RouteSummaryCardProps {
  route: EvacuationRouteState | null;
  routingLoading: boolean;
  routeError: string | null;
  avoidFloodEnabled: boolean;
  onToggleAvoidFlood: (enabled: boolean) => void;
}

export function RouteSummaryCard({
  route,
  routingLoading,
  routeError,
  avoidFloodEnabled,
  onToggleAvoidFlood,
}: RouteSummaryCardProps) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <section
      id="route-summary-card"
      data-testid="route-summary-card"
      className="sidebar-card"
      aria-labelledby="route-panel-heading"
    >
      <div className="card-header">
        <div className="card-title-row">
          <RouteIcon size={17} className="text-emerald" />
          <h2 id="route-panel-heading">Evacuation Route Summary</h2>
        </div>

        <label className="avoid-toggle-label" htmlFor="avoid-flood-toggle">
          <input
            id="avoid-flood-toggle"
            data-testid="avoid-flood-toggle"
            type="checkbox"
            checked={avoidFloodEnabled}
            onChange={(e) => onToggleAvoidFlood(e.target.checked)}
          />
          <span>Avoid Flood Zones</span>
        </label>
      </div>

      {routingLoading && (
        <div className="route-loading-box">
          Computing flood-zone-safe evacuation route via Routes API...
        </div>
      )}

      {routeError && !routingLoading && (
        <div className="route-error-box" role="alert">
          <AlertCircle size={15} />
          <span>{routeError}</span>
        </div>
      )}

      {route && !routingLoading ? (
        <div className="route-details">
          <div className="route-destination-name">{route.destination.displayName}</div>
          <div className="route-destination-addr">{route.destination.formattedAddress}</div>

          <div className="route-metrics-row">
            <div className="route-metric">
              <Clock size={14} className="text-sky" />
              <span>
                <strong>{route.durationText}</strong> ETA
              </span>
            </div>
            <div className="route-metric">
              <RouteIcon size={14} className="text-sky" />
              <span>
                <strong>{route.distanceText}</strong>
              </span>
            </div>
          </div>

          <div
            className={`route-safety-badge ${
              route.intersectsFloodZone ? 'is-warning' : 'is-safe'
            }`}
          >
            {route.intersectsFloodZone ? (
              <>
                <AlertCircle size={15} />
                <span>
                  Direct path crosses active flood zone — enable Avoid Flood Zones to detour.
                </span>
              </>
            ) : route.bypassedFloodZone ? (
              <>
                <ShieldCheck size={15} />
                <span>
                  Flood-Zone Bypass Verified ({route.bypassWaypoints.length} perimeter via-waypoint)
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>Clear Evacuation Corridor — No Flood Zone Intersections</span>
              </>
            )}
          </div>

          {route.steps.length > 0 && (
            <div className="route-steps-section">
              <button
                type="button"
                className="steps-toggle-btn"
                onClick={() => setShowSteps((prev) => !prev)}
              >
                <span>Turn-by-Turn Instructions ({route.steps.length})</span>
                {showSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showSteps && (
                <ol className="route-steps-list">
                  {route.steps.slice(0, 6).map((step, idx) => (
                    <li key={`step-${idx}`}>
                      <span className="step-text">{step.instruction}</span>
                      {step.distance && (
                        <span className="step-meta">
                          {step.distance} {step.duration ? `(${step.duration})` : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      ) : (
        !routingLoading &&
        !routeError && (
          <div className="empty-state-box">
            Click <strong>Find Safe Shelter</strong> or select a shelter below to calculate a flood-avoiding evacuation route.
          </div>
        )
      )}
    </section>
  );
}
