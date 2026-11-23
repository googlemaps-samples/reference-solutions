import {
  CloudRain,
  Flame,
  Layers,
  Menu,
  Navigation,
  ShieldAlert,
  Wind,
  X,
} from 'lucide-react';
import type { WeatherSnapshot } from '../types/hazard';

interface HeaderBarProps {
  miamiWeather: WeatherSnapshot | null;
  showHeatmap: boolean;
  showPolygons: boolean;
  findingShelter: boolean;
  sidebarOpen: boolean;
  incidentCount: number;
  onToggleHeatmap: () => void;
  onTogglePolygons: () => void;
  onFindSafeShelter: () => void;
  onToggleSidebar: () => void;
}

export function HeaderBar({
  miamiWeather,
  showHeatmap,
  showPolygons,
  findingShelter,
  sidebarOpen,
  incidentCount,
  onToggleHeatmap,
  onTogglePolygons,
  onFindSafeShelter,
  onToggleSidebar,
}: HeaderBarProps) {
  return (
    <header className="portal-header">
      <div className="header-brand">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close control sidebar' : 'Open control sidebar'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="brand-icon" aria-hidden="true">
          <ShieldAlert size={20} />
        </div>
        <div className="brand-text">
          <h1>Miami FloodWatch &amp; Safe Shelter Router</h1>
          <span className="brand-subtitle">
            Civic Hazard Heatmap ({incidentCount} reports) &amp; Flood-Bypass Evacuation
          </span>
        </div>
      </div>

      <div className="header-controls">
        <div className="weather-status-pill" title="Live Miami Meteorological Telemetry (Weather API)">
          <CloudRain size={15} className="text-sky" />
          {miamiWeather && miamiWeather.temperatureC !== null ? (
            <span>
              <strong>{Math.round(miamiWeather.temperatureC)}°C</strong>{' '}
              {miamiWeather.conditionText}
              {miamiWeather.windSpeedKmh !== null && (
                <>
                  {' '}
                  • <Wind size={13} className="inline-icon" /> {Math.round(miamiWeather.windSpeedKmh)} km/h{' '}
                  {miamiWeather.windCardinal}
                </>
              )}
              {miamiWeather.precipPercent !== null && (
                <> • {miamiWeather.precipPercent}% precip</>
              )}
            </span>
          ) : (
            <span>Miami Telemetry Ready</span>
          )}
        </div>

        <div className="layer-toggle-group" role="group" aria-label="Map layer visibility">
          <button
            id="layer-toggle-heatmap"
            data-testid="layer-toggle-heatmap"
            type="button"
            aria-pressed={showHeatmap}
            className={`layer-toggle-btn ${showHeatmap ? 'is-active' : ''}`}
            onClick={onToggleHeatmap}
          >
            <Flame size={15} />
            <span>HeatmapLayer</span>
          </button>

          <button
            id="layer-toggle-polygons"
            data-testid="layer-toggle-polygons"
            type="button"
            aria-pressed={showPolygons}
            className={`layer-toggle-btn ${showPolygons ? 'is-active' : ''}`}
            onClick={onTogglePolygons}
          >
            <Layers size={15} />
            <span>Flood Zones</span>
          </button>
        </div>

        <button
          id="find-shelter-btn"
          data-testid="find-shelter-btn"
          type="button"
          className="cta-shelter-btn"
          onClick={onFindSafeShelter}
          disabled={findingShelter}
        >
          <Navigation size={15} />
          <span>{findingShelter ? 'Routing...' : 'Find Safe Shelter'}</span>
        </button>
      </div>
    </header>
  );
}
