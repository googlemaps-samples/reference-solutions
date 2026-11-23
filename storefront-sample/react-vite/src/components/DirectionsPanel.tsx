import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { OriginLocation, RouteSummaryData, TravelModeKey } from '../types';
import {
  COVERAGE_RADIUS_METERS,
  DEFAULT_SF_CENTER,
  SEED_ORIGIN_QUERY,
  formatDistanceMeters,
} from '../utils/geo';

interface DirectionsPanelProps {
  origin: OriginLocation | null;
  onOriginChange: (next: OriginLocation) => void;
  onResetOrigin: () => void;
  travelMode: TravelModeKey;
  onTravelModeChange: (mode: TravelModeKey) => void;
  routeSummary: RouteSummaryData | null;
  routeLoading: boolean;
  routeError: string | null;
  straightLineDistanceMeters: number | null;
}

const TRAVEL_MODES: Array<{
  key: TravelModeKey;
  id: string;
  label: string;
  icon: string;
}> = [
  { key: 'DRIVING', id: 'travel-mode-drive', label: 'Driving', icon: '🚗' },
  { key: 'TRANSIT', id: 'travel-mode-transit', label: 'Transit', icon: '🚇' },
  { key: 'WALKING', id: 'travel-mode-walk', label: 'Walking', icon: '🚶' },
];

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  origin,
  onOriginChange,
  onResetOrigin,
  travelMode,
  onTravelModeChange,
  routeSummary,
  routeLoading,
  routeError,
  straightLineDistanceMeters,
}) => {
  const placesLib = useMapsLibrary('places');
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
  const onOriginChangeRef = useRef(onOriginChange);

  useEffect(() => {
    onOriginChangeRef.current = onOriginChange;
  }, [onOriginChange]);

  useEffect(() => {
    const host = autocompleteHostRef.current;
    if (!placesLib || !host) return;

    // CF8: Imperatively mount PlaceAutocompleteElement so complex objects & events bind to DOM directly.
    const autocompleteEl = new placesLib.PlaceAutocompleteElement();
    autocompleteEl.setAttribute(
      'internal-usage-attribution-ids',
      'gmp_git_agentsamples_v1.0.0'
    );
    autocompleteEl.includedRegionCodes = ['us'];
    autocompleteEl.locationBias = {
      center: DEFAULT_SF_CENTER,
      radius: 15000,
    };
    autocompleteEl.placeholder = origin?.address ?? SEED_ORIGIN_QUERY;
    autocompleteEl.setAttribute('aria-label', 'Visitor origin address search');

    const handleSelect = async (rawEvent: Event) => {
      const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        if (!place.location) return;

        onOriginChangeRef.current({
          id: place.id,
          name:
            place.displayName ??
            place.formattedAddress ??
            'Selected Origin',
          address:
            place.formattedAddress ??
            place.displayName ??
            'San Francisco, CA',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          isSeedDefault: false,
        });
      } catch (err) {
        console.error('Failed to resolve selected origin place:', err);
      }
    };

    autocompleteEl.addEventListener('gmp-select', handleSelect);
    host.replaceChildren(autocompleteEl);

    return () => {
      autocompleteEl.removeEventListener('gmp-select', handleSelect);
      host.replaceChildren();
    };
  }, [placesLib]);

  const withinCoverage =
    straightLineDistanceMeters != null &&
    straightLineDistanceMeters <= COVERAGE_RADIUS_METERS;

  return (
    <section className="card" aria-label="Get Directions to Clinic">
      <div className="card-header">
        <h2 className="card-title">Get Directions</h2>
        <span className="card-badge">Routes API</span>
      </div>

      <label
        className="origin-field-label"
        htmlFor="origin-autocomplete-input"
      >
        Your Starting Location
      </label>

      <div className="origin-seed-pill">
        <span>
          Origin:{' '}
          <strong>
            {origin ? origin.name : SEED_ORIGIN_QUERY}
          </strong>
        </span>
        {origin && !origin.isSeedDefault && (
          <button
            type="button"
            className="reset-origin-btn"
            onClick={onResetOrigin}
          >
            Reset to Ferry Building
          </button>
        )}
      </div>

      <div
        id="origin-autocomplete-input"
        data-testid="origin-autocomplete-input"
        data-seeded-origin={SEED_ORIGIN_QUERY}
        ref={autocompleteHostRef}
        className="autocomplete-host"
      />

      <div
        className="travel-mode-group"
        role="group"
        aria-label="Select travel mode"
      >
        {TRAVEL_MODES.map((mode) => (
          <button
            key={mode.key}
            id={mode.id}
            data-testid={mode.id}
            type="button"
            className={`mode-pill ${travelMode === mode.key ? 'active' : ''}`}
            aria-pressed={travelMode === mode.key}
            onClick={() => onTravelModeChange(mode.key)}
          >
            <span aria-hidden="true">{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      <div
        id="route-summary"
        data-testid="route-summary"
        className="route-summary-card"
        aria-live="polite"
      >
        {routeLoading ? (
          <span className="muted-note">
            Computing live {travelMode.toLowerCase()} route...
          </span>
        ) : routeError ? (
          <div className="error-inline">{routeError}</div>
        ) : routeSummary ? (
          <>
            <div className="route-metrics">
              <span className="route-duration">{routeSummary.durationText}</span>
              <span className="route-distance">{routeSummary.distanceText}</span>
            </div>
            <div className="route-subtext">
              <div>
                <strong>{travelMode}</strong> from{' '}
                {origin?.address ?? SEED_ORIGIN_QUERY}
                {routeSummary.description ? ` via ${routeSummary.description}` : ''}
              </div>
              {straightLineDistanceMeters != null && (
                <div style={{ marginTop: 4 }}>
                  Straight-line distance:{' '}
                  {formatDistanceMeters(straightLineDistanceMeters)} (
                  {withinCoverage
                    ? 'inside 5 km home-visit radius'
                    : 'outside 5 km home-visit radius'}
                  )
                </div>
              )}
              {routeSummary.warnings.length > 0 && (
                <div style={{ marginTop: 4, color: '#92400e' }}>
                  Note: {routeSummary.warnings[0]}
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="muted-note">
            Select an origin and travel mode to view live route duration and distance.
          </span>
        )}
      </div>
    </section>
  );
};
