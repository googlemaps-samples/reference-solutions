'use client';

import {
  CloudRain,
  Flame,
  Layers,
  Menu,
  Navigation,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { WeatherTelemetry } from '@/types/hazard';

interface HeaderBarProps {
  miamiWeather: WeatherTelemetry | null;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showPolygons: boolean;
  onTogglePolygons: () => void;
  onFindSafeShelter: () => void;
  isSearchingShelters: boolean;
  incidentCount: number;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export function HeaderBar({
  miamiWeather,
  showHeatmap,
  onToggleHeatmap,
  showPolygons,
  onTogglePolygons,
  onFindSafeShelter,
  isSearchingShelters,
  incidentCount,
  mobileSidebarOpen,
  onToggleMobileSidebar,
}: HeaderBarProps) {
  const weatherLabel = miamiWeather
    ? `${miamiWeather.conditionText} · ${
        miamiWeather.temperatureC !== null ? `${miamiWeather.temperatureC}°C` : '--'
      } · Wind ${
        miamiWeather.windSpeedKmh !== null ? `${miamiWeather.windSpeedKmh} km/h` : '--'
      }`
    : 'Miami Weather Telemetry Loading…';

  return (
    <header className="civic-header">
      <div className="civic-header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label={mobileSidebarOpen ? 'Close control panel' : 'Open control panel'}
        >
          {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="brand-mark">
          <ShieldAlert size={20} className="brand-icon" />
          <div>
            <h1 className="brand-title">Miami StormWatch &amp; Safe Shelter Router</h1>
          </div>
        </div>

        <div className="weather-status-pill" title="Live Weather API telemetry for Miami, FL">
          <CloudRain size={14} />
          <span>{weatherLabel}</span>
        </div>
      </div>

      <div className="civic-header-actions">
        <button
          id="layer-toggle-heatmap"
          data-testid="layer-toggle-heatmap"
          type="button"
          aria-pressed={showHeatmap}
          onClick={onToggleHeatmap}
          className={`layer-toggle-btn ${showHeatmap ? 'is-active-heat' : ''}`}
        >
          <Flame size={15} />
          <span>Heatmap ({incidentCount})</span>
        </button>

        <button
          id="layer-toggle-polygons"
          data-testid="layer-toggle-polygons"
          type="button"
          aria-pressed={showPolygons}
          onClick={onTogglePolygons}
          className={`layer-toggle-btn ${showPolygons ? 'is-active-poly' : ''}`}
        >
          <Layers size={15} />
          <span>Flood Zones</span>
        </button>

        <button
          id="find-shelter-btn"
          data-testid="find-shelter-btn"
          type="button"
          onClick={onFindSafeShelter}
          disabled={isSearchingShelters}
          className="find-shelter-cta"
        >
          <Navigation size={15} />
          <span>{isSearchingShelters ? 'Routing…' : 'Find Safe Shelter'}</span>
        </button>
      </div>
    </header>
  );
}
