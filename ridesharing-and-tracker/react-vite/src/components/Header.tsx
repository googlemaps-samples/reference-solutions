import { Car, Navigation, Sparkles } from 'lucide-react';
import type { DriverSimulationPhase, ResolvedPlace } from '../types/rideshare';

interface HeaderProps {
  pickup: ResolvedPlace | null;
  dropoff: ResolvedPlace | null;
  driverPhase: DriverSimulationPhase;
  isPaused: boolean;
}

const PHASE_META: Record<
  DriverSimulationPhase,
  { label: string; className: string }
> = {
  idle: { label: 'Ready to Dispatch', className: 'status-idle' },
  en_route_pickup: { label: 'Driver En Route', className: 'status-enroute' },
  arrived_pickup: { label: 'Arrived at Pickup', className: 'status-arrived' },
  in_trip: { label: 'Trip in Progress', className: 'status-intrip' },
  completed: { label: 'Arrived at Destination', className: 'status-done' },
};

export function Header({
  pickup,
  dropoff,
  driverPhase,
  isPaused,
}: HeaderProps) {
  const phaseMeta = PHASE_META[driverPhase];

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon" aria-hidden="true">
          <Car size={18} />
        </div>
        <div className="brand-copy">
          <span className="brand-title">LA RideFlow</span>
          <span className="brand-subtitle">
            Eco Dispatch &amp; Live Fare Estimator
          </span>
        </div>
      </div>

      <div className="header-trip-pill" title="Active Los Angeles Route">
        <Navigation size={14} className="trip-pill-icon" />
        <span className="trip-pill-text">
          {pickup ? pickup.name : 'Union Station'} →{' '}
          {dropoff ? dropoff.name : 'Santa Monica Pier'}
        </span>
      </div>

      <div className="header-right">
        <span className={`dispatch-badge ${phaseMeta.className}`}>
          <span className="dispatch-dot" />
          {isPaused ? `${phaseMeta.label} (Paused)` : phaseMeta.label}
        </span>
        <span className="eco-chip">
          <Sparkles size={13} />
          Los Angeles Metro
        </span>
      </div>
    </header>
  );
}
