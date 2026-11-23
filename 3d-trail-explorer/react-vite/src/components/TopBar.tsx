import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapMode } from '@vis.gl/react-google-maps/3d';
import { Compass, Layers, Mountain, Navigation, Search } from 'lucide-react';
import type { CameraTelemetry } from '../types/explorer';

interface TopBarProps {
  telemetry: CameraTelemetry;
  mapMode: MapMode;
  onToggleMapMode: () => void;
  onSearchQuery: (query: string) => Promise<void>;
  onSelectPlace: (place: google.maps.places.Place) => Promise<void>;
  isSearching: boolean;
  searchError: string | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  telemetry,
  mapMode,
  onToggleMapMode,
  onSearchQuery,
  onSelectPlace,
  isSearching,
  searchError
}) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocompleteMountRef = useRef<HTMLDivElement | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;

  // Imperatively mount Google Maps PlaceAutocompleteElement Web Component
  useEffect(() => {
    const container = autocompleteMountRef.current;
    if (!placesLib || !container) return;

    const element = new placesLib.PlaceAutocompleteElement({
      locationBias: {
        center: { lat: 38.9542, lng: -120.1103 },
        radius: 50000
      },
      requestedRegion: 'us',
      requestedLanguage: 'en'
    });
    element.placeholder = 'Search Places...';
    element.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
    element.className = 'gmp-autocomplete-widget';

    const handleSelect = async (event: Event) => {
      const selectEvent =
        event as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;
      const place = selectEvent.placePrediction.toPlace();
      await onSelectPlaceRef.current(place);
    };

    element.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(element);

    return () => {
      element.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib]);

  // Fetch programmatic AutocompleteSuggestion predictions as user types
  useEffect(() => {
    if (!placesLib || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const { suggestions: rawSuggestions } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query.trim(),
            sessionToken: sessionTokenRef.current,
            locationBias: {
              center: { lat: 38.9542, lng: -120.1103 },
              radius: 50000
            },
            region: 'us',
            language: 'en'
          });
        if (!cancelled) {
          const predictions = rawSuggestions
            .map((s) => s.placePrediction)
            .filter(
              (p): p is google.maps.places.PlacePrediction => p !== null
            )
            .slice(0, 5);
          setSuggestions(predictions);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    await onSearchQuery(query.trim());
  };

  const handleSuggestionPick = async (
    prediction: google.maps.places.PlacePrediction
  ) => {
    setQuery(prediction.text.text);
    setShowDropdown(false);
    setSuggestions([]);
    const place = prediction.toPlace();
    await onSelectPlace(place);
    sessionTokenRef.current = null;
  };

  const formatRange = (rangeM: number) => {
    if (rangeM >= 1000) {
      return `${(rangeM / 1000).toFixed(2)} km`;
    }
    return `${Math.round(rangeM)} m`;
  };

  const normalizedHeading = ((Math.round(telemetry.heading) % 360) + 360) % 360;

  return (
    <header className="top-bar">
      <div className="brand-block">
        <div className="brand-icon" aria-hidden="true">
          <Mountain size={20} />
        </div>
        <div className="brand-copy">
          <h1 className="brand-title">Lake Tahoe 3D Trail Explorer</h1>
          <p className="brand-subtitle">
            Emerald Bay &amp; Rubicon Ridge · Photorealistic 3D
          </p>
        </div>
      </div>

      <div className="search-cluster">
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              data-testid="landmark-search-input"
              className="search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                window.setTimeout(() => setShowDropdown(false), 180);
              }}
              placeholder="Search Lake Tahoe landmark (e.g. Vikingsholm, Rubicon Peak)..."
              aria-label="Search Lake Tahoe landmark"
            />
            {showDropdown && suggestions.length > 0 && (
              <ul className="autocomplete-dropdown" role="listbox">
                {suggestions.map((prediction) => (
                  <li key={prediction.placeId}>
                    <button
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        void handleSuggestionPick(prediction);
                      }}
                    >
                      <span className="autocomplete-main">
                        {prediction.mainText?.text ?? prediction.text.text}
                      </span>
                      {prediction.secondaryText?.text && (
                        <span className="autocomplete-sub">
                          {prediction.secondaryText.text}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            data-testid="landmark-search-submit"
            className="search-submit-btn"
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? 'Flying...' : 'Fly To'}
          </button>
        </form>

        <div
          ref={autocompleteMountRef}
          className="gmp-autocomplete-host"
          aria-label="Google Places Autocomplete Widget"
        />

        {searchError && (
          <span className="search-error-pill" role="status">
            {searchError}
          </span>
        )}
      </div>

      <div className="telemetry-cluster">
        <button
          type="button"
          className="mode-toggle-btn"
          onClick={onToggleMapMode}
          title="Toggle 3D Map Mode between Satellite and Hybrid"
        >
          <Layers size={14} />
          <span>{mapMode === MapMode.HYBRID ? 'Hybrid 3D' : 'Satellite 3D'}</span>
        </button>

        <div
          data-testid="camera-telemetry-badge"
          className="telemetry-badge"
          aria-label="3D Camera Telemetry"
        >
          <div className="telemetry-metric">
            <Compass size={13} className="telemetry-icon" />
            <span className="telemetry-label">HDG</span>
            <span className="telemetry-value">{normalizedHeading}°</span>
          </div>
          <span className="telemetry-divider" aria-hidden="true" />
          <div className="telemetry-metric">
            <Navigation size={13} className="telemetry-icon" />
            <span className="telemetry-label">TILT</span>
            <span className="telemetry-value">{Math.round(telemetry.tilt)}°</span>
          </div>
          <span className="telemetry-divider" aria-hidden="true" />
          <div className="telemetry-metric">
            <span className="telemetry-label">RNG</span>
            <span className="telemetry-value">{formatRange(telemetry.range)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
