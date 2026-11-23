'use client';

import {
  Compass,
  Layers,
  Map as MapIcon,
  RotateCcw,
  SunMedium,
  Thermometer,
} from 'lucide-react';
import { ActiveLocation, MapLayerType, UnitsSystem } from '@/types/environment';
import {
  PlaceAutocompleteControl,
  SelectedAutocompletePlace,
} from './PlaceAutocompleteControl';

interface TopHeaderProps {
  hasApiKey: boolean;
  activeLocation: ActiveLocation;
  units: UnitsSystem;
  showAqiLayer: boolean;
  mapType: MapLayerType;
  onPlaceSelect: (place: SelectedAutocompletePlace) => void;
  onResetPhoenix: () => void;
  onToggleUnits: () => void;
  onToggleAqiLayer: () => void;
  onToggleMapType: () => void;
}

export function TopHeader({
  hasApiKey,
  activeLocation,
  units,
  showAqiLayer,
  mapType,
  onPlaceSelect,
  onResetPhoenix,
  onToggleUnits,
  onToggleAqiLayer,
  onToggleMapType,
}: TopHeaderProps) {
  return (
    <header className="top-header">
      <div className="brand-group">
        <div className="brand-icon" aria-hidden="true">
          <SunMedium size={20} />
        </div>
        <div>
          <h1 className="brand-title">EnviroPulse</h1>
          <p className="brand-subtitle">Weather, AQI, Pollen &amp; Solar</p>
        </div>
      </div>

      <PlaceAutocompleteControl hasApiKey={hasApiKey} onPlaceSelect={onPlaceSelect} />

      <div className="header-controls">
        <div data-testid="active-location-badge" className="location-badge" title={activeLocation.formattedAddress}>
          <Compass size={14} style={{ flexShrink: 0, color: '#0f766e' }} />
          <span className="location-badge-name">{activeLocation.name}</span>
          <span className="location-badge-coords">
            {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)}
          </span>
        </div>

        <button
          type="button"
          data-testid="reset-phoenix-btn"
          className="ctrl-btn"
          onClick={onResetPhoenix}
          title="Reset to Phoenix City Hall"
        >
          <RotateCcw size={14} />
          <span>Phoenix</span>
        </button>

        <button
          type="button"
          data-testid="units-toggle-btn"
          className="ctrl-btn"
          onClick={onToggleUnits}
          title="Toggle Imperial / Metric units"
        >
          <Thermometer size={14} />
          <span>{units === 'IMPERIAL' ? '°F / Imperial' : '°C / Metric'}</span>
        </button>

        <button
          type="button"
          data-testid="aqi-layer-toggle"
          aria-pressed={showAqiLayer}
          className={`ctrl-btn ${showAqiLayer ? 'ctrl-btn-active' : ''}`}
          onClick={onToggleAqiLayer}
          title="Toggle US AQI heatmap tile overlay"
        >
          <Layers size={14} />
          <span>AQI Overlay</span>
        </button>

        <button
          type="button"
          data-testid="map-type-toggle"
          aria-pressed={mapType === 'hybrid'}
          className={`ctrl-btn ${mapType === 'hybrid' ? 'ctrl-btn-active' : ''}`}
          onClick={onToggleMapType}
          title="Switch between Roadmap and Satellite Hybrid view"
        >
          <MapIcon size={14} />
          <span>{mapType === 'hybrid' ? 'Satellite' : 'Roadmap'}</span>
        </button>
      </div>
    </header>
  );
}
