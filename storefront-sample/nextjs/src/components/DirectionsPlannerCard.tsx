'use client';

import { Car, Footprints, Navigation, RotateCcw, TrainFront } from 'lucide-react';
import { DEFAULT_ORIGIN, TRAVEL_MODE_META } from '@/lib/constants';
import type { OriginLocation, RouteSummary, TravelMode } from '@/lib/types';
import { OriginAutocompleteInput } from './OriginAutocompleteInput';

interface DirectionsPlannerCardProps {
  hasApiKey: boolean;
  origin: OriginLocation;
  onSelectOrigin: (origin: OriginLocation) => void;
  travelMode: TravelMode;
  onSelectTravelMode: (mode: TravelMode) => void;
  route: RouteSummary | null;
  routeLoading: boolean;
  routeError: string | null;
  clinicName: string;
}

export function DirectionsPlannerCard({
  hasApiKey,
  origin,
  onSelectOrigin,
  travelMode,
  onSelectTravelMode,
  route,
  routeLoading,
  routeError,
  clinicName,
}: DirectionsPlannerCardProps) {
  const modeMeta = TRAVEL_MODE_META[travelMode];
  const isCustomOrigin = origin.label !== DEFAULT_ORIGIN.label;

  return (
    <section className="panel-card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Routes API &amp; Places Autocomplete</div>
          <h2 className="card-title">Get Directions to Clinic</h2>
        </div>
        <Navigation size={18} color="#0f766e" />
      </div>

      <div className="autocomplete-shell" data-testid="origin-autocomplete-container">
        <label className="form-label" style={{ fontSize: 12 }}>
          Starting Address (San Francisco)
        </label>

        {hasApiKey ? (
          <OriginAutocompleteInput
            selectedLabel={origin.label}
            onSelectOrigin={onSelectOrigin}
          />
        ) : (
          <input
            type="text"
            className="form-input"
            value={origin.label}
            readOnly
            aria-label="Pre-seeded San Francisco origin"
          />
        )}

        <div className="origin-active-bar">
          <span>
            <strong>Origin:</strong> {origin.label}
          </span>
          {isCustomOrigin && (
            <button
              type="button"
              className="reset-origin-btn"
              onClick={() => onSelectOrigin(DEFAULT_ORIGIN)}
            >
              <RotateCcw size={12} style={{ display: 'inline', marginRight: 3 }} />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="travel-modes-grid" role="group" aria-label="Travel mode">
        <button
          type="button"
          data-testid="travel-mode-driving"
          className={`mode-pill-btn ${travelMode === 'DRIVE' ? 'active' : ''}`}
          aria-pressed={travelMode === 'DRIVE'}
          onClick={() => onSelectTravelMode('DRIVE')}
        >
          <Car size={15} />
          <span>Drive</span>
        </button>

        <button
          type="button"
          data-testid="travel-mode-transit"
          className={`mode-pill-btn ${travelMode === 'TRANSIT' ? 'active' : ''}`}
          aria-pressed={travelMode === 'TRANSIT'}
          onClick={() => onSelectTravelMode('TRANSIT')}
        >
          <TrainFront size={15} />
          <span>Transit</span>
        </button>

        <button
          type="button"
          data-testid="travel-mode-walking"
          className={`mode-pill-btn ${travelMode === 'WALK' ? 'active' : ''}`}
          aria-pressed={travelMode === 'WALK'}
          onClick={() => onSelectTravelMode('WALK')}
        >
          <Footprints size={15} />
          <span>Walk</span>
        </button>
      </div>

      <div className="route-summary-card" data-testid="route-summary-card">
        {routeLoading ? (
          <div className="route-caption">
            Calculating live {modeMeta.label.toLowerCase()} route from {origin.label}...
          </div>
        ) : routeError ? (
          <div style={{ fontSize: 12.5, color: '#991b1b' }}>{routeError}</div>
        ) : route ? (
          <>
            <div className="route-metrics-row">
              <span className="route-duration">{route.durationText}</span>
              <span className="route-distance">{route.distanceText}</span>
            </div>
            <div className="route-caption">
              <strong>{modeMeta.label}</strong> from {origin.label} to {clinicName}
            </div>
          </>
        ) : (
          <div className="route-caption">
            Select a San Francisco origin address to view live travel time and distance.
          </div>
        )}
      </div>
    </section>
  );
}
