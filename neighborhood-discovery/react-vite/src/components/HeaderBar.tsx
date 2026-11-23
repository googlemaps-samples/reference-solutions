import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Compass,
  GitCompare,
  MapPin,
  Radar,
  Search,
} from 'lucide-react';
import {
  LONDON_PRESETS,
  LatLngPoint,
  NeighborhoodPreset,
  SEARCH_RADIUS_METERS,
} from '../types/neighborhood';

interface HeaderBarProps {
  searchCenter: LatLngPoint;
  activePresetId: string;
  showRadiusCircle: boolean;
  comparisonCount: number;
  isComparisonOpen: boolean;
  isGeocoding: boolean;
  onSelectAutocompletePlace: (place: google.maps.places.Place) => void;
  onForwardGeocode: (address: string) => void;
  onSelectPreset: (preset: NeighborhoodPreset) => void;
  onToggleRadiusCircle: () => void;
  onToggleComparison: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchCenter,
  activePresetId,
  showRadiusCircle,
  comparisonCount,
  isComparisonOpen,
  isGeocoding,
  onSelectAutocompletePlace,
  onForwardGeocode,
  onSelectPreset,
  onToggleRadiusCircle,
  onToggleComparison,
}) => {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteElRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [typedAddress, setTypedAddress] = useState<string>('');
  const onSelectPlaceRef = useRef(onSelectAutocompletePlace);
  const onForwardGeocodeRef = useRef(onForwardGeocode);

  useEffect(() => {
    onSelectPlaceRef.current = onSelectAutocompletePlace;
  }, [onSelectAutocompletePlace]);

  useEffect(() => {
    onForwardGeocodeRef.current = onForwardGeocode;
  }, [onForwardGeocode]);

  // Mount PlaceAutocompleteElement imperatively (CF8: avoids React prop stringification)
  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) {
      return;
    }

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['gb'],
      requestedLanguage: 'en',
      requestedRegion: 'GB',
      placeholder: 'Search London address or neighborhood...',
    });

    autocomplete.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
    autocomplete.setAttribute('data-testid', 'neighborhood-autocomplete-input');
    autocomplete.setAttribute(
      'aria-label',
      'Search London address or neighborhood'
    );
    autocomplete.className = 'gmp-autocomplete-host';

    const handleSelect = (evt: Event) => {
      const selectEvent = evt as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;
      const place = selectEvent.placePrediction.toPlace();
      onSelectPlaceRef.current(place);
    };

    const handleInput = () => {
      setTypedAddress(autocomplete.value ?? '');
    };

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Enter') {
        const currentVal = (autocomplete.value ?? '').trim();
        if (currentVal.length > 0) {
          setTypedAddress(currentVal);
        }
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('input', handleInput);
    autocomplete.addEventListener('keydown', handleKeyDown);

    container.replaceChildren(autocomplete);
    autocompleteElRef.current = autocomplete;

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocomplete.removeEventListener('input', handleInput);
      autocomplete.removeEventListener('keydown', handleKeyDown);
      if (container.contains(autocomplete)) {
        container.removeChild(autocomplete);
      }
      autocompleteElRef.current = null;
    };
  }, [placesLib]);

  // Update locationBias dynamically when search center moves
  useEffect(() => {
    const autocomplete = autocompleteElRef.current;
    if (!autocomplete) return;
    autocomplete.locationBias = {
      center: searchCenter,
      radius: SEARCH_RADIUS_METERS,
    };
  }, [searchCenter]);

  const handleGeocodeClick = () => {
    const liveValue = (
      autocompleteElRef.current?.value ??
      typedAddress ??
      ''
    ).trim();
    const targetQuery =
      liveValue.length > 0
        ? liveValue
        : `${LONDON_PRESETS.find((p) => p.id === activePresetId)?.label ?? 'Covent Garden'}, London, UK`;
    onForwardGeocodeRef.current(targetQuery);
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon" aria-hidden="true">
          <Compass size={20} strokeWidth={2.2} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">London Spot Mapper</h1>
          <span className="brand-subtitle">Hyperlocal Directory</span>
        </div>
      </div>

      <div className="header-search-group">
        <div
          ref={containerRef}
          className="autocomplete-wrapper"
          aria-label="Address and neighborhood autocomplete search"
        >
          {!placesLib && (
            <div className="autocomplete-loading-shell">
              <Search size={15} />
              <span>Loading Places Autocomplete…</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary geocode-btn"
          data-testid="address-geocode-button"
          onClick={handleGeocodeClick}
          disabled={isGeocoding}
          title="Geocode typed address or current neighborhood"
        >
          <MapPin size={15} />
          <span>{isGeocoding ? 'Locating…' : 'Geocode'}</span>
        </button>

        <div className="preset-select-wrap">
          <label htmlFor="neighborhood-preset-select" className="sr-only">
            Select Central London neighborhood
          </label>
          <select
            id="neighborhood-preset-select"
            data-testid="neighborhood-preset-select"
            className="preset-select"
            value={activePresetId}
            onChange={(e) => {
              const preset = LONDON_PRESETS.find(
                (p) => p.id === e.target.value
              );
              if (preset) {
                onSelectPreset(preset);
              }
            }}
          >
            {LONDON_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            {activePresetId === 'custom' && (
              <option value="custom">Custom Location</option>
            )}
          </select>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          data-testid="radius-toggle-circle"
          className={`btn btn-pill ${showRadiusCircle ? 'btn-pill-active' : ''}`}
          onClick={onToggleRadiusCircle}
          aria-pressed={showRadiusCircle}
          title="Toggle 5km search radius circle on map"
        >
          <Radar size={15} />
          <span>5 km radius</span>
        </button>

        <button
          type="button"
          data-testid="toggle-comparison-button"
          className={`btn btn-pill ${isComparisonOpen ? 'btn-pill-active' : ''}`}
          onClick={onToggleComparison}
          aria-pressed={isComparisonOpen}
        >
          <GitCompare size={15} />
          <span>Compare</span>
          <span className="count-badge">{comparisonCount}/3</span>
        </button>
      </div>
    </header>
  );
};
