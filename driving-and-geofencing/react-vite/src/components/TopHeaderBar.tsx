import { ShieldCheck, ShieldAlert, MapPin, Route as RouteIcon } from 'lucide-react';
import type { GeofenceZone, OptimizedRouteSummary } from '../types/geofencing';
import { formatDistance, formatDuration } from '../utils/formatters';

interface TopHeaderBarProps {
  activeZoneCount: number;
  matchedZone: GeofenceZone | null;
  routeSummary: OptimizedRouteSummary | null;
}

export function TopHeaderBar({
  activeZoneCount,
  matchedZone,
  routeSummary,
}: TopHeaderBarProps) {
  const isInside = matchedZone !== null;

  return (
    <header className="top-header">
      <div className="header-brand">
        <div className="header-logo">
          <MapPin size={18} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="header-title">
            Field Workforce Geofenced Attendance &amp; Site Audit Router
          </h1>
        </div>
        <span className="district-badge">Austin, TX · District 04</span>
      </div>

      <div className="header-metrics">
        <span className="metric-pill metric-pill-neutral">
          {activeZoneCount} Active {activeZoneCount === 1 ? 'Zone' : 'Zones'}
        </span>

        <span
          className={`metric-pill ${
            isInside ? 'metric-pill-unlocked' : 'metric-pill-locked'
          }`}
        >
          {isInside ? (
            <>
              <ShieldCheck size={14} />
              Clock-In Unlocked
            </>
          ) : (
            <>
              <ShieldAlert size={14} />
              Clock-In Locked
            </>
          )}
        </span>

        <span id="route-summary" className="metric-pill metric-pill-route">
          <RouteIcon size={14} />
          {routeSummary
            ? `${routeSummary.orderedStops.length} stops · ${formatDuration(
                routeSummary.totalDurationMillis,
              )} · ${formatDistance(routeSummary.totalDistanceMeters)}`
            : 'Route pending'}
        </span>
      </div>
    </header>
  );
}
