import {
  ArrowUpDown,
  Clock,
  Fuel,
  Leaf,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import {
  calculateEcoSavings,
  calculateFareEstimates,
  formatCountdown,
  formatCurrency,
  formatDuration,
  formatFuelMetric,
  formatMiles,
  LA_TRIP_PRESETS,
} from '../data/drivers';
import type {
  CandidateDriver,
  DriverLiveState,
  EmissionType,
  ResolvedPlace,
  RideTierId,
  RouteComparisonResult,
  RouteKind,
} from '../types/rideshare';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface SidebarProps {
  pickupText: string;
  dropoffText: string;
  onPickupSelect: (place: ResolvedPlace) => void;
  onDropoffSelect: (place: ResolvedPlace) => void;
  onSwapLocations: () => void;
  onSelectPreset: (pickupQuery: string, dropoffQuery: string) => void;
  routeComparison: RouteComparisonResult | null;
  selectedRouteKind: RouteKind;
  onSelectRoute: (kind: RouteKind) => void;
  emissionType: EmissionType;
  onChangeEmissionType: (type: EmissionType) => void;
  selectedTier: RideTierId;
  onSelectTier: (tier: RideTierId) => void;
  candidateDrivers: CandidateDriver[];
  driverState: DriverLiveState;
  onDispatchDriver: () => void;
  onToggleSimulation: () => void;
  isLoadingRoutes: boolean;
  errorMessage: string | null;
  onAutocompleteError: (msg: string) => void;
}

export function Sidebar({
  pickupText,
  dropoffText,
  onPickupSelect,
  onDropoffSelect,
  onSwapLocations,
  onSelectPreset,
  routeComparison,
  selectedRouteKind,
  onSelectRoute,
  emissionType,
  onChangeEmissionType,
  selectedTier,
  onSelectTier,
  candidateDrivers,
  driverState,
  onDispatchDriver,
  onToggleSimulation,
  isLoadingRoutes,
  errorMessage,
  onAutocompleteError,
}: SidebarProps) {
  const fastest = routeComparison?.fastest ?? null;
  const eco = routeComparison?.eco ?? null;
  const isSameRoute = routeComparison?.isSameRoute ?? false;

  const activeRoute =
    selectedRouteKind === 'eco' ? (eco ?? fastest) : (fastest ?? eco);

  const ecoSavings =
    fastest && eco
      ? calculateEcoSavings(fastest, eco, emissionType, isSameRoute)
      : null;

  const fares = calculateFareEstimates(activeRoute, ecoSavings);

  const phaseText: Record<DriverLiveState['phase'], string> = {
    idle: 'Standing by near pickup',
    en_route_pickup: 'En route to pickup',
    arrived_pickup: 'Arrived at pickup',
    in_trip: 'On trip to destination',
    completed: 'Trip completed',
  };

  return (
    <aside className="sidebar" aria-label="Rideshare Controls and Telemetry">
      {errorMessage && (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      )}

      {/* 1. Trip Planner */}
      <section className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <MapPin size={16} />
            Trip Planner
          </h2>
          <button
            type="button"
            data-testid="swap-locations-btn"
            className="icon-btn"
            onClick={onSwapLocations}
            title="Swap pickup and drop-off"
            aria-label="Swap pickup and drop-off locations"
          >
            <ArrowUpDown size={14} />
            <span>Swap</span>
          </button>
        </div>

        <div className="trip-inputs-stack">
          <PlaceAutocompleteInput
            testId="pickup-autocomplete"
            label="Pickup Location"
            placeholder="Search Los Angeles pickup..."
            value={pickupText}
            dotColor="#2563EB"
            onPlaceSelect={onPickupSelect}
            onError={onAutocompleteError}
          />
          <PlaceAutocompleteInput
            testId="dropoff-autocomplete"
            label="Drop-off Destination"
            placeholder="Search Los Angeles destination..."
            value={dropoffText}
            dotColor="#DC2626"
            onPlaceSelect={onDropoffSelect}
            onError={onAutocompleteError}
          />
        </div>

        <div className="presets-row">
          {LA_TRIP_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="preset-chip"
              onClick={() =>
                onSelectPreset(preset.pickupQuery, preset.dropoffQuery)
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Fastest vs. Eco-Friendly Route Comparison */}
      <section className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <Leaf size={16} />
            Route &amp; Eco Comparison
          </h2>
          <label className="emission-select-wrap">
            <span className="sr-only">Vehicle emission type</span>
            <select
              data-testid="emission-type-select"
              className="emission-select"
              value={emissionType}
              onChange={(e) =>
                onChangeEmissionType(e.target.value as EmissionType)
              }
              aria-label="Vehicle emission type"
            >
              <option value="GASOLINE">Gasoline</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ELECTRIC">Electric (EV)</option>
            </select>
          </label>
        </div>

        {isLoadingRoutes && !routeComparison ? (
          <div className="skeleton-box">
            Computing live LA traffic &amp; eco routes...
          </div>
        ) : (
          <div className="route-cards-grid">
            <button
              type="button"
              data-testid="route-option-fastest"
              className={`route-card ${selectedRouteKind === 'fastest' ? 'route-card-active-fast' : ''}`}
              onClick={() => onSelectRoute('fastest')}
            >
              <div className="route-card-top">
                <span className="route-badge route-badge-fast">
                  <Zap size={12} />
                  Fastest
                </span>
                <span className="route-duration">
                  {fastest ? fastest.durationText : '—'}
                </span>
              </div>
              <div className="route-metrics">
                <span>{fastest ? fastest.distanceText : '—'}</span>
                <span>·</span>
                <span>
                  {fastest
                    ? formatFuelMetric(
                        fastest.fuelConsumptionMicroliters,
                        emissionType
                      )
                    : '—'}
                </span>
              </div>
              <div className="route-corridor">
                {fastest?.description ?? 'Traffic-aware optimal'}
              </div>
            </button>

            <button
              type="button"
              data-testid="route-option-eco"
              className={`route-card ${selectedRouteKind === 'eco' ? 'route-card-active-eco' : ''}`}
              onClick={() => onSelectRoute('eco')}
            >
              <div className="route-card-top">
                <span className="route-badge route-badge-eco">
                  <Leaf size={12} />
                  Eco-Friendly
                </span>
                <span className="route-duration">
                  {eco ? eco.durationText : '—'}
                </span>
              </div>
              <div className="route-metrics">
                <span>{eco ? eco.distanceText : '—'}</span>
                <span>·</span>
                <span>
                  {eco
                    ? formatFuelMetric(
                        eco.fuelConsumptionMicroliters,
                        emissionType
                      )
                    : '—'}
                </span>
              </div>
              <div className="route-corridor">
                {eco?.description ?? 'Fuel-efficient route'}
              </div>
            </button>
          </div>
        )}

        <div className="eco-savings-banner" data-testid="eco-savings-banner">
          <Fuel size={16} className="eco-banner-icon" />
          <div className="eco-banner-copy">
            {ecoSavings && ecoSavings.hasFuelData ? (
              ecoSavings.isSameRoute || ecoSavings.percentSaved < 0.5 ? (
                <span>
                  <strong>Optimal Eco Alignment:</strong> The fastest corridor
                  is already the most energy-efficient route (
                  {formatFuelMetric(
                    eco?.fuelConsumptionMicroliters ?? null,
                    emissionType
                  )}
                  ).
                </span>
              ) : (
                <span>
                  <strong>
                    {ecoSavings.percentSaved.toFixed(1)}% energy saved
                  </strong>{' '}
                  ({ecoSavings.energySavedText} ·{' '}
                  {ecoSavings.co2SavedKg.toFixed(2)} kg CO₂ avoided)
                  {ecoSavings.timeDeltaMinutes > 0
                    ? ` for +${ecoSavings.timeDeltaMinutes} min`
                    : ' with zero time penalty'}
                  .
                </span>
              )
            ) : (
              <span>
                Comparing traffic-aware vs. fuel-efficient energy telemetry for{' '}
                {emissionType.toLowerCase()} vehicles.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. Transparent Fare Estimator */}
      <section className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <ShieldCheck size={16} />
            Transparent Fare Estimate
          </h2>
          <span className="panel-sub-pill">
            {activeRoute ? formatMiles(activeRoute.distanceMeters) : '—'}
          </span>
        </div>

        <div className="fare-tiers-list">
          {fares.map((tier) => {
            const isSelected = selectedTier === tier.tierId;
            return (
              <button
                key={tier.tierId}
                type="button"
                data-testid={`fare-tier-${tier.tierId}`}
                className={`fare-card ${isSelected ? 'fare-card-selected' : ''}`}
                onClick={() => onSelectTier(tier.tierId)}
              >
                <div className="fare-card-main">
                  <div>
                    <div className="fare-title-row">
                      <span className="fare-name">{tier.name}</span>
                      {tier.badge && (
                        <span
                          className={`fare-badge ${tier.tierId === 'green' ? 'fare-badge-green' : ''}`}
                        >
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    <div className="fare-subtitle">{tier.subtitle}</div>
                    {tier.ecoTag && (
                      <div className="fare-eco-tag">
                        <Leaf size={11} />
                        <span>{tier.ecoTag}</span>
                      </div>
                    )}
                  </div>
                  <div className="fare-price-col">
                    <span className="fare-total">
                      {formatCurrency(tier.totalFare)}
                    </span>
                    <span className="fare-eta">
                      <Clock size={11} /> {tier.etaMinutes} min trip
                    </span>
                  </div>
                </div>

                <div className="fare-breakdown">
                  <span>Base {formatCurrency(tier.baseFare)}</span>
                  <span>+ Dist {formatCurrency(tier.distanceFare)}</span>
                  <span>+ Time {formatCurrency(tier.timeFare)}</span>
                  <span>+ Fee {formatCurrency(tier.bookingFee)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Live Driver Dispatch & ETA Tracker */}
      <section className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <Clock size={16} />
            Live Driver Dispatch
          </h2>
          <span className="panel-sub-pill">
            {candidateDrivers.length} nearby
          </span>
        </div>

        <div className="driver-eta-card" data-testid="driver-live-eta">
          {driverState.driver ? (
            <>
              <div className="driver-top-row">
                <div>
                  <div className="driver-name-row">
                    <span className="driver-name">
                      {driverState.driver.name}
                    </span>
                    <span className="driver-rating">
                      <Star size={12} fill="#F59E0B" stroke="#F59E0B" />
                      {driverState.driver.rating.toFixed(2)}
                    </span>
                  </div>
                  <div className="driver-vehicle">
                    {driverState.driver.vehicle} · {driverState.driver.plate}
                  </div>
                </div>
                <div className="driver-eta-pill">
                  <span className="driver-eta-value">
                    {driverState.phase === 'completed'
                      ? 'Arrived'
                      : formatCountdown(driverState.remainingSeconds)}
                  </span>
                  <span className="driver-eta-dist">
                    {formatMiles(driverState.remainingMeters)}
                  </span>
                </div>
              </div>

              <div className="driver-phase-row">
                <span className="driver-phase-label">
                  {phaseText[driverState.phase]}
                </span>
                <span className="driver-progress-pct">
                  {Math.round(driverState.progressPct)}%
                </span>
              </div>

              <div className="driver-progress-track">
                <div
                  className="driver-progress-fill"
                  style={{ width: `${Math.min(100, driverState.progressPct)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="driver-empty-state">
              {candidateDrivers[0] && candidateDrivers[0].etaMillis
                ? `Closest driver: ${candidateDrivers[0].name} (${formatDuration(candidateDrivers[0].etaMillis)} away)`
                : 'Select pickup & drop-off to rank closest LA drivers via RouteMatrix.'}
            </div>
          )}
        </div>

        <div className="dispatch-actions">
          <button
            type="button"
            data-testid="dispatch-driver-btn"
            className="btn-primary"
            onClick={onDispatchDriver}
            disabled={!activeRoute}
          >
            <RotateCcw size={14} />
            <span>
              {driverState.driver ? 'Restart Dispatch' : 'Dispatch Closest Driver'}
            </span>
          </button>

          <button
            type="button"
            data-testid="toggle-simulation-btn"
            className="btn-secondary"
            onClick={onToggleSimulation}
            disabled={!driverState.driver || driverState.phase === 'completed'}
          >
            {driverState.isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{driverState.isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </section>
    </aside>
  );
}
