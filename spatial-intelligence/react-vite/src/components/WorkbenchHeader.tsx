import React from 'react';
import { Globe2, Hexagon, Layers, Map as MapIcon, Mountain, Satellite, Sparkles } from 'lucide-react';
import type { BasemapType, DeckGlLayerMode } from '../types/gis';
import { PlaceAutocompleteControl } from './PlaceAutocompleteControl';
import type { CivicHubPlace } from '../types/gis';

interface WorkbenchHeaderProps {
  hasApiKey: boolean;
  basemap: BasemapType;
  onBasemapChange: (mode: BasemapType) => void;
  deckMode: DeckGlLayerMode;
  onDeckModeChange: (mode: DeckGlLayerMode) => void;
  showGeoJson: boolean;
  onToggleGeoJson: () => void;
  onAutocompleteSelect: (place: CivicHubPlace) => void;
}

const BASEMAP_OPTIONS: Array<{
  id: BasemapType;
  label: string;
  testId: string;
  icon: React.ReactNode;
}> = [
  { id: 'roadmap', label: 'Roadmap', testId: 'basemap-btn-roadmap', icon: <MapIcon size={13} /> },
  {
    id: 'satellite',
    label: 'Satellite',
    testId: 'basemap-btn-satellite',
    icon: <Satellite size={13} />
  },
  { id: 'hybrid', label: 'Hybrid', testId: 'basemap-btn-hybrid', icon: <Layers size={13} /> },
  { id: 'terrain', label: 'Terrain', testId: 'basemap-btn-terrain', icon: <Mountain size={13} /> }
];

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  hasApiKey,
  basemap,
  onBasemapChange,
  deckMode,
  onDeckModeChange,
  showGeoJson,
  onToggleGeoJson,
  onAutocompleteSelect
}) => {
  return (
    <header className="workbench-header" data-testid="workbench-header">
      <div className="header-brand">
        <div className="brand-icon" aria-hidden="true">
          <Globe2 size={18} />
        </div>
        <div className="brand-text">
          <span className="brand-title">NYC Spatial Intelligence Workbench</span>
          <span className="brand-subtitle">GeoJSON Districts • deck.gl Telemetry • Terra Draw</span>
        </div>
      </div>

      <div className="header-controls">
        <PlaceAutocompleteControl hasApiKey={hasApiKey} onSelectPlace={onAutocompleteSelect} />

        <div
          className="segmented-control"
          role="group"
          aria-label="Basemap switcher"
          data-testid="basemap-switcher"
        >
          {BASEMAP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={opt.testId}
              className={`seg-btn ${basemap === opt.id ? 'active' : ''}`}
              aria-pressed={basemap === opt.id}
              onClick={() => onBasemapChange(opt.id)}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <div
          className="segmented-control"
          role="group"
          aria-label="Spatial layer controls"
          data-testid="deckgl-layer-controls"
        >
          <button
            type="button"
            data-testid="deckgl-mode-scatterplot"
            className={`seg-btn ${deckMode === 'scatterplot' ? 'active' : ''}`}
            aria-pressed={deckMode === 'scatterplot'}
            onClick={() => onDeckModeChange('scatterplot')}
          >
            <Sparkles size={13} />
            <span>Scatter</span>
          </button>
          <button
            type="button"
            data-testid="deckgl-mode-hexagon"
            className={`seg-btn ${deckMode === 'hexagon' ? 'active' : ''}`}
            aria-pressed={deckMode === 'hexagon'}
            onClick={() => onDeckModeChange('hexagon')}
          >
            <Hexagon size={13} />
            <span>Hexagon</span>
          </button>
          <button
            type="button"
            data-testid="toggle-geojson-btn"
            className={`seg-btn ${showGeoJson ? 'active-emerald' : ''}`}
            aria-pressed={showGeoJson}
            onClick={onToggleGeoJson}
          >
            <Layers size={13} />
            <span>Districts</span>
          </button>
        </div>
      </div>
    </header>
  );
};
