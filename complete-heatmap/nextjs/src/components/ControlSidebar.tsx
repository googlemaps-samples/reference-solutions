'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Compass,
  Hospital,
  MapPin,
  Mountain,
  Navigation,
  Search,
  ShieldCheck,
  Star,
  Wind,
} from 'lucide-react';
import { PlaceAutocompleteBox } from '@/components/PlaceAutocompleteBox';
import type {
  EnrichedLocationData,
  EvacuationRouteResult,
  HazardType,
  LatLngPoint,
  ShelterPlace,
} from '@/types/hazard';

interface ControlSidebarProps {
  mobileOpen: boolean;
  enrichedLocation: EnrichedLocationData;
  hazardType: HazardType;
  onHazardTypeChange: (type: HazardType) => void;
  hazardSeverity: number;
  onHazardSeverityChange: (weight: number) => void;
  hazardNotes: string;
  onHazardNotesChange: (notes: string) => void;
  onSubmitHazardReport: () => void;
  reportConfirmation: string | null;
  onAutocompleteSelect: (point: LatLngPoint, label: string) => void;
  avoidFloodZones: boolean;
  onToggleAvoidFloodZones: () => void;
  activeRoute: EvacuationRouteResult | null;
  routeLoading: boolean;
  routeError: string | null;
  shelterQuery: string;
  onShelterQueryChange: (q: string) => void;
  onSearchShelters: () => void;
  shelters: ShelterPlace[];
  sheltersLoading: boolean;
  sheltersError: string | null;
  selectedShelterId: string | null;
  onRouteToShelter: (shelter: ShelterPlace) => void;
}

const HAZARD_TYPES: HazardType[] = [
  'Flash Flooding',
  'Storm Surge',
  'Road Submersion',
  'Downed Power Line',
  'Wind Debris',
];

export function ControlSidebar({
  mobileOpen,
  enrichedLocation,
  hazardType,
  onHazardTypeChange,
  hazardSeverity,
  onHazardSeverityChange,
  hazardNotes,
  onHazardNotesChange,
  onSubmitHazardReport,
  reportConfirmation,
  onAutocompleteSelect,
  avoidFloodZones,
  onToggleAvoidFloodZones,
  activeRoute,
  routeLoading,
  routeError,
  shelterQuery,
  onShelterQueryChange,
  onSearchShelters,
  shelters,
  sheltersLoading,
  sheltersError,
  selectedShelterId,
  onRouteToShelter,
}: ControlSidebarProps) {
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const weather = enrichedLocation.weather;

  return (
    <aside className={`control-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`}>
      {/* [A] Civic Incident Reporter */}
      <section
        id="incident-report-panel"
        data-testid="incident-report-panel"
        className="panel-card"
      >
        <div className="panel-card-header">
          <div className="panel-title-row">
            <AlertTriangle size={16} className="icon-amber" />
            <h2>Civic Incident Reporter</h2>
          </div>
          <span className="coords-badge">
            {enrichedLocation.point.lat.toFixed(4)},{' '}
            {enrichedLocation.point.lng.toFixed(4)}
          </span>
        </div>

        <p className="panel-hint">
          Click anywhere on the map or search an address to auto-enrich elevation,
          street address, and live storm telemetry.
        </p>

        <PlaceAutocompleteBox onPlaceSelected={onAutocompleteSelect} />

        <div className="telemetry-grid">
          <div className="telemetry-item telemetry-item-wide">
            <div className="telemetry-label">
              <MapPin size={13} />
              <span>Reverse-Geocoded Address</span>
            </div>
            <div className="telemetry-value">
              {enrichedLocation.loading
                ? 'Resolving street address…'
                : enrichedLocation.address}
            </div>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-label">
              <Mountain size={13} />
              <span>Elevation</span>
            </div>
            <div className="telemetry-value">
              {enrichedLocation.loading
                ? 'Querying…'
                : enrichedLocation.elevationMeters !== null
                ? `${enrichedLocation.elevationMeters.toFixed(2)} m ASL`
                : 'Unavailable'}
            </div>
          </div>

          <div className="telemetry-item">
            <div className="telemetry-label">
              <Wind size={13} />
              <span>Wind / Gusts</span>
            </div>
            <div className="telemetry-value">
              {enrichedLocation.loading
                ? 'Querying…'
                : weather && weather.windSpeedKmh !== null
                ? `${weather.windSpeedKmh} km/h${
                    weather.windGustKmh ? ` (gust ${weather.windGustKmh})` : ''
                  }`
                : 'Unavailable'}
            </div>
          </div>

          <div className="telemetry-item telemetry-item-wide">
            <div className="telemetry-label">
              <CloudRain size={13} />
              <span>Live Storm &amp; Precipitation</span>
            </div>
            <div className="telemetry-value">
              {enrichedLocation.loading
                ? 'Fetching Weather API…'
                : weather
                ? `${weather.conditionText} · Rain prob ${
                    weather.precipitationPercent ?? 0
                  }% · QPF ${weather.precipitationQpfMm ?? 0} mm`
                : 'Weather telemetry unavailable'}
            </div>
          </div>
        </div>

        {enrichedLocation.insideFloodZone && (
          <div className="zone-alert-banner">
            <AlertTriangle size={14} />
            <span>
              Inside <strong>{enrichedLocation.insideFloodZone.name}</strong> (Est.
              surge {enrichedLocation.insideFloodZone.surgeEstimateMeters}m)
            </span>
          </div>
        )}

        <div className="reporter-form">
          <div className="form-row">
            <label htmlFor="incident-type-select">Hazard Category</label>
            <select
              id="incident-type-select"
              data-testid="incident-type-select"
              value={hazardType}
              onChange={(e) => onHazardTypeChange(e.target.value as HazardType)}
            >
              {HAZARD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="incident-severity-range">
              Severity Weight ({hazardSeverity}/10)
            </label>
            <input
              id="incident-severity-range"
              type="range"
              min={3}
              max={10}
              step={1}
              value={hazardSeverity}
              onChange={(e) => onHazardSeverityChange(Number(e.target.value))}
            />
          </div>

          <div className="form-row">
            <label htmlFor="incident-notes-input">Field Observation (optional)</label>
            <input
              id="incident-notes-input"
              type="text"
              placeholder="e.g., Curb-deep water blocking eastbound lane"
              value={hazardNotes}
              onChange={(e) => onHazardNotesChange(e.target.value)}
            />
          </div>

          <button
            id="incident-submit-btn"
            data-testid="incident-submit-btn"
            type="button"
            className="primary-report-btn"
            onClick={onSubmitHazardReport}
          >
            Log Hazard Report to Heatmap
          </button>

          {reportConfirmation && (
            <div className="confirmation-toast" role="status">
              <CheckCircle2 size={14} />
              <span>{reportConfirmation}</span>
            </div>
          )}
        </div>
      </section>

      {/* [B] Safe Shelter Evacuation Route Summary */}
      <section
        id="route-summary-card"
        data-testid="route-summary-card"
        className="panel-card"
      >
        <div className="panel-card-header">
          <div className="panel-title-row">
            <Compass size={16} className="icon-emerald" />
            <h2>Evacuation Route Summary</h2>
          </div>

          <label className="avoid-toggle-label">
            <input
              id="avoid-flood-toggle"
              data-testid="avoid-flood-toggle"
              type="checkbox"
              checked={avoidFloodZones}
              onChange={onToggleAvoidFloodZones}
            />
            <span>Avoid Flood Zones</span>
          </label>
        </div>

        {routeLoading && (
          <div className="route-loading-state">
            Computing flood-aware evacuation route via Routes API…
          </div>
        )}

        {routeError && !routeLoading && (
          <div className="route-error-state">{routeError}</div>
        )}

        {activeRoute && !routeLoading && (
          <div className="route-details">
            <div className="route-destination-name">
              Destination: <strong>{activeRoute.shelter.name}</strong>
            </div>

            <div className="route-metrics-row">
              <div className="route-metric">
                <span className="metric-label">ETA</span>
                <span className="metric-value">{activeRoute.durationText}</span>
              </div>
              <div className="route-metric">
                <span className="metric-label">Distance</span>
                <span className="metric-value">{activeRoute.distanceText}</span>
              </div>
            </div>

            <div
              className={`bypass-badge ${
                activeRoute.verificationStatus === 'VERIFIED_FLOOD_BYPASS' ||
                activeRoute.verificationStatus === 'CLEAR_DIRECT_ROUTE'
                  ? 'is-safe'
                  : 'is-caution'
              }`}
            >
              <ShieldCheck size={14} />
              <span>
                {activeRoute.verificationStatus === 'VERIFIED_FLOOD_BYPASS' &&
                  `Flood-Zone Bypass Verified (${activeRoute.bypassedFloodZones.length} zone${
                    activeRoute.bypassedFloodZones.length === 1 ? '' : 's'
                  } avoided)`}
                {activeRoute.verificationStatus === 'CLEAR_DIRECT_ROUTE' &&
                  'Clear Route — Zero Flood-Polygon Intersections'}
                {activeRoute.verificationStatus === 'PARTIAL_ZONE_PROXIMITY' &&
                  'Detour Applied — Origin/Destination Near Flood Boundary'}
                {activeRoute.verificationStatus === 'DIRECT_UNFILTERED' &&
                  (activeRoute.intersectsFloodZone
                    ? 'Direct Route Crosses Active Flood Zone'
                    : 'Direct Route Clear of Flood Zones')}
              </span>
            </div>

            {activeRoute.steps.length > 0 && (
              <div className="route-steps-container">
                <button
                  type="button"
                  className="steps-toggle-btn"
                  onClick={() => setStepsExpanded((prev) => !prev)}
                >
                  <span>
                    Turn-by-Turn Directions ({activeRoute.steps.length} steps)
                  </span>
                  {stepsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {stepsExpanded && (
                  <ol className="route-steps-list">
                    {activeRoute.steps.slice(0, 8).map((step, idx) => (
                      <li key={idx}>
                        <span>{step.instruction}</span>
                        <span className="step-dist">
                          {step.distanceMeters >= 1000
                            ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                            : `${step.distanceMeters} m`}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}

        {!activeRoute && !routeLoading && !routeError && (
          <p className="panel-hint">
            Select any shelter below or click <strong>Find Safe Shelter</strong> to
            calculate an evacuation route.
          </p>
        )}
      </section>

      {/* [C] Live Nearby Emergency Shelters List */}
      <section className="panel-card">
        <div className="panel-card-header">
          <div className="panel-title-row">
            <Hospital size={16} className="icon-blue" />
            <h2>Nearby Emergency Shelters</h2>
          </div>
          <span className="count-pill">{shelters.length}</span>
        </div>

        <form
          className="shelter-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchShelters();
          }}
        >
          <input
            id="shelter-search-input"
            data-testid="shelter-search-input"
            type="text"
            value={shelterQuery}
            onChange={(e) => onShelterQueryChange(e.target.value)}
            placeholder="Search hospitals or community centers..."
            aria-label="Search emergency shelters in Miami"
          />
          <button
            type="submit"
            className="search-icon-btn"
            disabled={sheltersLoading}
            aria-label="Search shelters"
          >
            <Search size={15} />
          </button>
        </form>

        {sheltersLoading && (
          <div className="route-loading-state">
            Searching Miami hospitals &amp; community centers via Places API (New)…
          </div>
        )}

        {sheltersError && !sheltersLoading && (
          <div className="route-error-state">{sheltersError}</div>
        )}

        <div id="shelter-list" data-testid="shelter-list" className="shelter-list">
          {shelters.map((shelter) => {
            const isSelected = shelter.id === selectedShelterId;
            return (
              <div
                key={shelter.id}
                className={`shelter-item ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="shelter-item-top">
                  <div>
                    <div className="shelter-name">{shelter.name}</div>
                    <div className="shelter-address">{shelter.address}</div>
                  </div>
                  <span
                    className={`category-badge ${
                      shelter.category === 'Hospital'
                        ? 'is-hospital'
                        : 'is-community'
                    }`}
                  >
                    {shelter.category}
                  </span>
                </div>

                <div className="shelter-item-footer">
                  <div className="shelter-meta">
                    {typeof shelter.rating === 'number' && (
                      <span className="shelter-rating">
                        <Star size={12} />
                        {shelter.rating.toFixed(1)}
                        {shelter.userRatingCount ? ` (${shelter.userRatingCount})` : ''}
                      </span>
                    )}
                    {shelter.businessStatus && (
                      <span className="status-tag">
                        {shelter.businessStatus === 'OPERATIONAL'
                          ? 'Operational'
                          : shelter.businessStatus}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="route-here-btn"
                    onClick={() => onRouteToShelter(shelter)}
                  >
                    <Navigation size={12} />
                    <span>{isSelected ? 'Active Route' : 'Route Here'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
