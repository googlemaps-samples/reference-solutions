import type { FormEvent } from 'react';
import {
  CheckCircle2,
  Lock,
  Navigation,
  Pentagon,
  MousePointer,
  Trash2,
  Search,
  Route as RouteIcon,
  MapPin,
  X,
  Clock,
} from 'lucide-react';
import type {
  AuditSite,
  ClockInRecord,
  GeofenceZone,
  OptimizedRouteSummary,
  TerraDrawModeName,
  WorkerPreset,
} from '../types/geofencing';
import { formatDistance, formatDuration } from '../utils/formatters';
import { PlaceAutocompleteBox } from './PlaceAutocompleteBox';

interface OperationsSidebarProps {
  hasApiKey: boolean;
  presets: WorkerPreset[];
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  workerPosition: { lat: number; lng: number };
  workerAddress: string;
  isGeocoding: boolean;
  matchedZone: GeofenceZone | null;
  lastClockIn: ClockInRecord | null;
  onClockIn: () => void;
  allZones: GeofenceZone[];
  onFocusZone: (zone: GeofenceZone) => void;
  terraDrawReady: boolean;
  terraDrawMode: TerraDrawModeName;
  onSetTerraDrawMode: (mode: TerraDrawModeName) => void;
  onClearDrawnZones: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSites: () => void;
  isSearchingSites: boolean;
  onAddPlaceFromAutocomplete: (site: AuditSite) => void;
  auditSites: AuditSite[];
  onRemoveAuditSite: (siteId: string) => void;
  onFocusAuditSite: (site: AuditSite) => void;
  onOptimizeRoute: () => void;
  isComputingRoute: boolean;
  routeSummary: OptimizedRouteSummary | null;
  routeError: string | null;
}

export function OperationsSidebar({
  hasApiKey,
  presets,
  selectedPresetId,
  onSelectPreset,
  workerPosition,
  workerAddress,
  isGeocoding,
  matchedZone,
  lastClockIn,
  onClockIn,
  allZones,
  onFocusZone,
  terraDrawReady,
  terraDrawMode,
  onSetTerraDrawMode,
  onClearDrawnZones,
  searchQuery,
  onSearchQueryChange,
  onSearchSites,
  isSearchingSites,
  onAddPlaceFromAutocomplete,
  auditSites,
  onRemoveAuditSite,
  onFocusAuditSite,
  onOptimizeRoute,
  isComputingRoute,
  routeSummary,
  routeError,
}: OperationsSidebarProps) {
  const isInside = matchedZone !== null;
  const drawnCount = allZones.filter((z) => z.source === 'drawn').length;
  const displayStops = routeSummary ? routeSummary.orderedStops : auditSites;

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchSites();
  };

  return (
    <aside className="operations-sidebar" aria-label="Operations Sidebar">
      {/* Card 1: Worker GPS & Geofenced Attendance */}
      <section className="sidebar-card">
        <div className="card-header">
          <div className="card-title-row">
            <Navigation size={16} className="card-icon card-icon-blue" />
            <h2 className="card-title">Worker GPS &amp; Geofenced Attendance</h2>
          </div>
          <span
            id="geofence-status-badge"
            className={`status-pill ${
              isInside ? 'status-pill-inside' : 'status-pill-outside'
            }`}
          >
            {isInside ? 'Inside Geofence' : 'Outside Geofence'}
          </span>
        </div>

        <label htmlFor="worker-preset-select" className="field-label">
          Simulated Worker GPS Preset
        </label>
        <select
          id="worker-preset-select"
          className="select-input"
          value={selectedPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>

        <div className="telemetry-box">
          <div className="telemetry-row">
            <span className="telemetry-key">Coordinates</span>
            <span className="telemetry-val mono">
              {workerPosition.lat.toFixed(5)}, {workerPosition.lng.toFixed(5)}
            </span>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-key">Detected Zone</span>
            <span className="telemetry-val">
              {matchedZone ? matchedZone.name : 'No active perimeter'}
            </span>
          </div>
          <div className="telemetry-row telemetry-row-col">
            <span className="telemetry-key">Reverse-Geocoded Street Address</span>
            <span id="worker-address" className="telemetry-address">
              {isGeocoding ? 'Resolving Austin street address…' : workerAddress}
            </span>
          </div>
        </div>

        <div className="clockin-row">
          <div
            id="verified-clockin-badge"
            className={`clockin-badge ${
              isInside ? 'clockin-badge-unlocked' : 'clockin-badge-locked'
            }`}
          >
            {isInside ? (
              <>
                <CheckCircle2 size={15} />
                <span>Verified Clock-In Eligible</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Verified Clock-In Locked</span>
              </>
            )}
          </div>

          <button
            id="clockin-action-btn"
            type="button"
            className={`btn btn-sm ${isInside ? 'btn-emerald' : 'btn-disabled'}`}
            disabled={!isInside}
            onClick={onClockIn}
          >
            {isInside ? 'Clock In' : 'Locked'}
          </button>
        </div>

        {lastClockIn && (
          <div className="clockin-confirmation">
            <Clock size={13} />
            <span>
              Checked in at <strong>{lastClockIn.timestamp}</strong> ({lastClockIn.zoneName})
            </span>
          </div>
        )}
      </section>

      {/* Card 2: Geofence Zones & Terra Draw Controls */}
      <section className="sidebar-card">
        <div className="card-header">
          <div className="card-title-row">
            <Pentagon size={16} className="card-icon card-icon-amber" />
            <h2 className="card-title">Geofence Zones &amp; Terra Draw</h2>
          </div>
          <span className="count-badge">{allZones.length} zones</span>
        </div>

        <div className="terra-sync-controls">
          <button
            type="button"
            data-control="sidebar-draw-polygon"
            disabled={!terraDrawReady}
            className={`btn btn-xs ${
              terraDrawMode === 'polygon' ? 'btn-amber-active' : 'btn-outline'
            }`}
            onClick={() => onSetTerraDrawMode('polygon')}
          >
            <Pentagon size={13} />
            Draw Polygon
          </button>
          <button
            type="button"
            data-control="sidebar-select-mode"
            disabled={!terraDrawReady}
            className={`btn btn-xs ${
              terraDrawMode === 'select' ? 'btn-blue-active' : 'btn-outline'
            }`}
            onClick={() => onSetTerraDrawMode('select')}
          >
            <MousePointer size={13} />
            Select / Edit
          </button>
          <button
            type="button"
            data-control="sidebar-clear-drawn"
            disabled={!terraDrawReady || drawnCount === 0}
            className="btn btn-xs btn-outline-danger"
            onClick={onClearDrawnZones}
          >
            <Trash2 size={13} />
            Clear Drawn
          </button>
        </div>

        <ul id="geofence-list" className="zone-list">
          {allZones.map((zone) => {
            const isOccupied = matchedZone?.id === zone.id;
            return (
              <li key={zone.id}>
                <button
                  type="button"
                  className={`zone-item ${isOccupied ? 'zone-item-active' : ''}`}
                  onClick={() => onFocusZone(zone)}
                >
                  <span
                    className="zone-swatch"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="zone-meta">
                    <span className="zone-name">{zone.name}</span>
                    <span className="zone-sub">
                      {zone.district} · {zone.source === 'seeded' ? 'Pre-seeded' : 'Terra Draw'}
                    </span>
                  </span>
                  {isOccupied && <span className="zone-inside-tag">ACTIVE</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Card 3: Multi-Stop Audit Router */}
      <section className="sidebar-card">
        <div className="card-header">
          <div className="card-title-row">
            <RouteIcon size={16} className="card-icon card-icon-indigo" />
            <h2 className="card-title">Multi-Stop Audit Router</h2>
          </div>
          <span className="count-badge">{displayStops.length} stops</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="search-row">
          <input
            id="site-search-input"
            type="text"
            className="text-input"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search Austin audit sites…"
            aria-label="Search Austin audit sites"
          />
          <button
            id="site-search-btn"
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!hasApiKey || isSearchingSites}
          >
            <Search size={14} />
            {isSearchingSites ? 'Finding…' : 'Search'}
          </button>
        </form>

        {hasApiKey && (
          <div className="autocomplete-wrap">
            <PlaceAutocompleteBox onPlaceSelected={onAddPlaceFromAutocomplete} />
          </div>
        )}

        <div className="route-action-row">
          <button
            id="optimize-route-btn"
            type="button"
            className="btn btn-sm btn-indigo btn-full"
            disabled={!hasApiKey || auditSites.length < 2 || isComputingRoute}
            onClick={onOptimizeRoute}
          >
            <RouteIcon size={14} />
            {isComputingRoute ? 'Optimizing Route…' : 'Optimize Multi-Stop Route'}
          </button>
        </div>

        {routeError && <p className="inline-error">{routeError}</p>}

        <ol id="audit-stops-list" className="stops-list">
          {displayStops.map((stop, idx) => {
            const leg = routeSummary?.legs[idx];
            return (
              <li key={stop.id} className="stop-item">
                <button
                  type="button"
                  className="stop-focus-btn"
                  onClick={() => onFocusAuditSite(stop)}
                >
                  <span className="stop-number">{idx + 1}</span>
                  <span className="stop-details">
                    <span className="stop-name">{stop.name}</span>
                    <span className="stop-address">
                      <MapPin size={11} />
                      {stop.address}
                    </span>
                    {leg && (
                      <span className="stop-leg-meta">
                        Leg {idx + 1}: {formatDistance(leg.distanceMeters)} ·{' '}
                        {formatDuration(leg.durationMillis)}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className="stop-remove-btn"
                  title={`Remove ${stop.name}`}
                  aria-label={`Remove ${stop.name}`}
                  onClick={() => onRemoveAuditSite(stop.id)}
                >
                  <X size={13} />
                </button>
              </li>
            );
          })}
          {displayStops.length === 0 && (
            <li className="empty-stops">
              {hasApiKey
                ? 'Run a Places Text Search or add a stop via Autocomplete to plan your audit route.'
                : 'Configure VITE_GOOGLE_MAPS_API_KEY in .env.local to discover Austin retail audit sites.'}
            </li>
          )}
        </ol>

        {routeSummary && (
          <div className="route-totals-footer">
            <div>
              <span className="total-label">Total Distance</span>
              <strong className="total-value">
                {formatDistance(routeSummary.totalDistanceMeters)}
              </strong>
            </div>
            <div>
              <span className="total-label">Traffic-Aware ETA</span>
              <strong className="total-value">
                {formatDuration(routeSummary.totalDurationMillis)}
              </strong>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
