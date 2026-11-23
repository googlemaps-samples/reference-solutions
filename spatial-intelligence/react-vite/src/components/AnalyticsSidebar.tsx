import React from 'react';
import {
  Activity,
  Building2,
  MapPin,
  Mountain,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import type {
  CivicHubPlace,
  DistrictFeature,
  ElevationSummary,
  SensorSector,
  ZoneAnalyticsSummary
} from '../types/gis';

interface AnalyticsSidebarProps {
  analytics: ZoneAnalyticsSummary;
  elevation: ElevationSummary;
  districts: DistrictFeature[];
  selectedDistrictId: string | null;
  civicHubs: CivicHubPlace[];
  civicHubsLoading: boolean;
  civicHubsError: string | null;
  selectedCivicHubId: string | null;
  hasApiKey: boolean;
  onSelectDistrict: (districtId: string) => void;
  onResetCitywide: () => void;
  onSampleElevation: () => void;
  onSelectCivicHub: (hub: CivicHubPlace) => void;
}

const SECTOR_ORDER: SensorSector[] = ['power', 'transit', 'telecom', 'water'];

function renderElevationSparkline(elevation: ElevationSummary) {
  const { samples } = elevation;
  if (!samples.length) return null;

  const width = 310;
  const height = 56;
  const padX = 6;
  const padY = 6;

  const values = samples.map((s) => s.elevation);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.5, max - min);

  const points = samples.map((sample, idx) => {
    const x =
      samples.length === 1
        ? width / 2
        : padX + (idx / (samples.length - 1)) * (width - padX * 2);
    const y = height - padY - ((sample.elevation - min) / span) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePoints = points.join(' ');
  const areaPoints = `${padX},${height - padY} ${polylinePoints} ${width - padX},${height - padY}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Terrain elevation profile across sampled vertices"
    >
      <defs>
        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#elevGrad)" />
      <polyline
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
    </svg>
  );
}

export const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({
  analytics,
  elevation,
  districts,
  selectedDistrictId,
  civicHubs,
  civicHubsLoading,
  civicHubsError,
  selectedCivicHubId,
  hasApiKey,
  onSelectDistrict,
  onResetCitywide,
  onSampleElevation,
  onSelectCivicHub
}) => {
  const maxSectorCount = Math.max(
    1,
    ...SECTOR_ORDER.map((s) => analytics.sectorBreakdown[s] ?? 0)
  );

  return (
    <aside className="analytics-sidebar" aria-label="Spatial Analytics Sidebar">
      {/* 1. Zone Analytics KPI Card */}
      <section className="panel-card" data-testid="zone-analytics-panel">
        <div className="panel-header">
          <span className="panel-title">
            <Activity size={14} />
            Zone Analytics
          </span>
          <span className={`scope-badge ${analytics.scopeType}`}>
            {analytics.scopeType === 'terradraw'
              ? 'Custom Terra Draw'
              : analytics.scopeType === 'district'
                ? 'District Focus'
                : 'Citywide Baseline'}
          </span>
        </div>

        <h2 className="scope-title">{analytics.scopeLabel}</h2>

        <div className="kpi-grid">
          <div className="kpi-tile">
            <div className="kpi-label">Filtered Sensors</div>
            <div className="kpi-value">{analytics.sensorCount.toLocaleString()}</div>
            <div className="kpi-sub">of {analytics.totalSensors.toLocaleString()} NYC nodes</div>
          </div>

          <div className="kpi-tile">
            <div className="kpi-label">Avg Capacity Load</div>
            <div className="kpi-value">{analytics.avgCapacityLoad.toFixed(1)}%</div>
            <div className="kpi-sub">Peak {analytics.peakCapacityLoad.toFixed(1)}%</div>
          </div>

          <div className="kpi-tile">
            <div className="kpi-label">Critical Alerts</div>
            <div className="kpi-value" style={{ color: analytics.criticalCount > 0 ? '#f87171' : '#34d399' }}>
              {analytics.criticalCount.toLocaleString()}
            </div>
            <div className="kpi-sub">&ge; 84% load threshold</div>
          </div>

          <div className="kpi-tile">
            <div className="kpi-label">Study Zone Area</div>
            <div className="kpi-value">{analytics.areaKm2.toFixed(2)} km²</div>
            <div className="kpi-sub">Geodesic footprint</div>
          </div>
        </div>

        <div className="sector-bars">
          {SECTOR_ORDER.map((sector) => {
            const count = analytics.sectorBreakdown[sector] ?? 0;
            const pct = Math.round((count / maxSectorCount) * 100);
            return (
              <div className="sector-row" key={sector}>
                <span className="sector-name">{sector}</span>
                <div className="sector-track">
                  <div className="sector-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="sector-count">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Terrain Elevation Inspector */}
      <section className="panel-card" data-testid="elevation-inspector-card">
        <div className="panel-header">
          <span className="panel-title">
            <Mountain size={14} />
            Terrain Elevation
          </span>
          <button
            type="button"
            className="btn-action"
            data-testid="sample-elevation-btn"
            disabled={!hasApiKey || elevation.status === 'loading'}
            onClick={onSampleElevation}
          >
            <RefreshCw size={12} />
            <span>{elevation.status === 'loading' ? 'Sampling...' : 'Sample Terrain'}</span>
          </button>
        </div>

        <div className="elevation-stats-row">
          <div className="kpi-tile">
            <div className="kpi-label">Min Elev</div>
            <div className="kpi-value" style={{ fontSize: 15 }}>
              {elevation.minMeters !== null ? `${elevation.minMeters.toFixed(1)} m` : '—'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Mean Elev</div>
            <div className="kpi-value" style={{ fontSize: 15 }}>
              {elevation.meanMeters !== null ? `${elevation.meanMeters.toFixed(1)} m` : '—'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-label">Max Elev</div>
            <div className="kpi-value" style={{ fontSize: 15 }}>
              {elevation.maxMeters !== null ? `${elevation.maxMeters.toFixed(1)} m` : '—'}
            </div>
          </div>
        </div>

        {elevation.samples.length > 0 ? (
          <div className="elevation-chart-wrap">
            {renderElevationSparkline(elevation)}
            <div className="elevation-meta">
              <span>{elevation.sourceLabel}</span>
              <span>
                {elevation.samples.length} pts
                {elevation.resolutionMeters !== null
                  ? ` • ±${elevation.resolutionMeters.toFixed(1)}m res`
                  : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="places-status-note">
            {!hasApiKey
              ? 'Configure VITE_GOOGLE_MAPS_API_KEY to query live Elevation API terrain profiles.'
              : elevation.errorMessage
                ? elevation.errorMessage
                : 'Select a district, draw a Terra Draw polygon, or click Sample Terrain.'}
          </div>
        )}
      </section>

      {/* 3. NYC District Capacity Directory */}
      <section className="panel-card" data-testid="district-selector-list">
        <div className="panel-header">
          <span className="panel-title">
            <Building2 size={14} />
            NYC District Directory
          </span>
          {selectedDistrictId && (
            <button type="button" className="btn-ghost" onClick={onResetCitywide}>
              <RotateCcw size={11} />
              <span>Citywide</span>
            </button>
          )}
        </div>

        <div className="district-list">
          {districts.map((district) => {
            const props = district.properties;
            const isSelected = props.districtId === selectedDistrictId;
            return (
              <button
                key={props.districtId}
                type="button"
                className={`district-item ${isSelected ? 'selected' : ''}`}
                data-testid={`district-item-${props.districtId}`}
                onClick={() => onSelectDistrict(props.districtId)}
              >
                <div className="district-item-top">
                  <span className="district-name">{props.name}</span>
                  <span className={`capacity-pill ${props.tier}`}>{props.capacityPct}%</span>
                </div>
                <div className="district-meta">
                  <span>{props.borough}</span>
                  <span>
                    {props.capacityMw.toLocaleString()} MW • {props.substationCount} substations
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Live NYC Civic Reference Hubs */}
      <section className="panel-card" data-testid="live-places-panel">
        <div className="panel-header">
          <span className="panel-title">
            <MapPin size={14} />
            NYC Civic Transit Hubs
          </span>
          <span className="scope-badge">Places API (New)</span>
        </div>

        {!hasApiKey ? (
          <div className="places-status-note">
            Live civic reference anchors load automatically via <code>Place.searchByText</code> when{' '}
            <code>VITE_GOOGLE_MAPS_API_KEY</code> is set.
          </div>
        ) : civicHubsLoading ? (
          <div className="places-status-note">Querying live NYC civic transit hubs...</div>
        ) : civicHubsError ? (
          <div className="places-status-note">{civicHubsError}</div>
        ) : civicHubs.length === 0 ? (
          <div className="places-status-note">No civic hub results returned for this viewport.</div>
        ) : (
          <div className="places-list">
            {civicHubs.map((hub) => (
              <button
                key={hub.id}
                type="button"
                className={`place-card-btn ${selectedCivicHubId === hub.id ? 'selected' : ''}`}
                onClick={() => onSelectCivicHub(hub)}
              >
                <div className="place-name">{hub.displayName}</div>
                <div className="place-address">{hub.formattedAddress}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
};
