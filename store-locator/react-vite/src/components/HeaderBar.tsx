import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  NYC_CENTER,
  NYC_ORIGIN_PRESETS,
  type OriginPoint,
  type TravelModeOption,
} from '../types/locator';
import {
  BrandPinIcon,
  RouteBoltIcon,
  SearchIcon,
  TravelModeIcon,
} from './Icons';

interface HeaderBarProps {
  origin: OriginPoint;
  onOriginChange: (origin: OriginPoint) => void;
  travelMode: TravelModeOption;
  onTravelModeChange: (mode: TravelModeOption) => void;
  onRouteToFastest: () => void;
  hasFastestBranch: boolean;
  isRouting: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  origin,
  onOriginChange,
  travelMode,
  onTravelModeChange,
  onRouteToFastest,
  hasFastestBranch,
  isRouting,
}) => {
  const placesLibrary = useMapsLibrary('places');
  const geocodingLibrary = useMapsLibrary('geocoding');

  const [inputValue, setInputValue] = useState(origin.label);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setInputValue(origin.label);
  }, [origin.label]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getOrCreateSessionToken = useCallback(() => {
    if (!placesLibrary) return undefined;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, [placesLibrary]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!placesLibrary || trimmed.length < 2) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      try {
        const sessionToken = getOrCreateSessionToken();
        const { suggestions: nextSuggestions } =
          await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken,
            locationBias: {
              center: NYC_CENTER,
              radius: 20000,
            },
            origin: origin.location,
            includedRegionCodes: ['us'],
            language: 'en-US',
            region: 'us',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          });

        setSuggestions(nextSuggestions);
        setDropdownOpen(nextSuggestions.length > 0);
      } catch (err) {
        setSearchError(
          err instanceof Error
            ? err.message
            : 'Unable to fetch autocomplete suggestions.'
        );
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [placesLibrary, getOrCreateSessionToken, origin.location]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSearchError(null);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (val.trim().length < 2) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(val);
    }, 220);
  };

  const handleSelectPrediction = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    setDropdownOpen(false);
    setIsSearching(true);
    setSearchError(null);

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress', 'id'],
      });
      // Session token is consumed on fetchFields; reset for next search session.
      sessionTokenRef.current = null;

      if (!place.location) {
        setSearchError('Selected place has no map coordinates.');
        return;
      }

      const label =
        place.displayName ||
        prediction.mainText?.text ||
        prediction.text.text;
      const address =
        place.formattedAddress || prediction.text.text || label;

      setInputValue(label);
      setSuggestions([]);
      onOriginChange({
        label,
        address,
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
        placeId: place.id,
      });
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Failed to load place location.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (suggestions.length > 0 && dropdownOpen) {
      await handleSelectPrediction(suggestions[0]);
      return;
    }

    if (!geocodingLibrary) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const geocoder = new geocodingLibrary.Geocoder();
      const response = await geocoder.geocode({
        address: trimmed.toLowerCase().includes('new york')
          ? trimmed
          : `${trimmed}, New York, NY`,
        region: 'US',
      });
      const firstResult = response.results?.[0];
      if (!firstResult?.geometry?.location) {
        setSearchError('No matching NYC location found.');
        return;
      }
      const loc = firstResult.geometry.location;
      const label =
        firstResult.formatted_address.split(',')[0] || trimmed;
      setInputValue(label);
      setDropdownOpen(false);
      onOriginChange({
        label,
        address: firstResult.formatted_address,
        location: { lat: loc.lat(), lng: loc.lng() },
        placeId: firstResult.place_id,
      });
    } catch {
      setSearchError('Could not geocode that starting address.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        let address = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
        let label = 'Current Location';

        if (geocodingLibrary) {
          try {
            const geocoder = new geocodingLibrary.Geocoder();
            const res = await geocoder.geocode({ location: coords });
            if (res.results?.[0]) {
              address = res.results[0].formatted_address;
              label = address.split(',')[0] || 'Current Location';
            }
          } catch {
            // Keep coordinate fallback
          }
        }

        setInputValue(label);
        setDropdownOpen(false);
        onOriginChange({ label, address, location: coords });
        setIsLocating(false);
      },
      () => {
        setSearchError('Location permission denied. Using NYC origin.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  return (
    <header className="app-header" data-testid="app-header">
      <div className="brand-block">
        <div className="brand-mark">
          <BrandPinIcon size={18} />
        </div>
        <div className="brand-text">
          <span className="brand-title">MetroRetail NYC</span>
          <span className="brand-subtitle">Store, Kiosk &amp; ATM Locator</span>
        </div>
      </div>

      <div className="header-controls">
        <div className="origin-search-wrapper" ref={wrapperRef}>
          <form className="origin-search-form" onSubmit={handleSearchSubmit}>
            <span className="search-icon-wrap">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              className="origin-search-input"
              data-testid="origin-search-input"
              aria-label="Starting NYC location"
              placeholder="Search NYC address, landmark, or station..."
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setDropdownOpen(true);
              }}
            />
            {isSearching && (
              <span className="search-spinner" aria-label="Searching" />
            )}
          </form>

          {dropdownOpen && suggestions.length > 0 && (
            <ul
              className="autocomplete-dropdown"
              data-testid="autocomplete-dropdown"
              role="listbox"
            >
              {suggestions.map((suggestion, idx) => {
                const pred = suggestion.placePrediction;
                if (!pred) return null;
                const main = pred.mainText?.text ?? pred.text.text;
                const secondary = pred.secondaryText?.text ?? '';
                return (
                  <li key={`${pred.placeId}-${idx}`} role="option">
                    <button
                      type="button"
                      className="autocomplete-item"
                      onClick={() => void handleSelectPrediction(suggestion)}
                    >
                      <span className="autocomplete-main">{main}</span>
                      {secondary && (
                        <span className="autocomplete-secondary">
                          {secondary}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {searchError && (
            <div className="search-error-toast" role="alert">
              {searchError}
            </div>
          )}
        </div>

        <div className="origin-presets" aria-label="Quick NYC origins">
          {NYC_ORIGIN_PRESETS.slice(0, 3).map((preset) => {
            const isActive = origin.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                className={`preset-pill ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setInputValue(preset.label);
                  setDropdownOpen(false);
                  setSearchError(null);
                  onOriginChange(preset);
                }}
              >
                {preset.label.split(',')[0]}
              </button>
            );
          })}
          <button
            type="button"
            className="preset-pill"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            title="Use browser geolocation"
          >
            {isLocating ? 'Locating…' : 'Near Me'}
          </button>
        </div>

        <div className="travel-mode-wrap">
          <span className="travel-mode-icon">
            <TravelModeIcon mode={travelMode} size={15} />
          </span>
          <select
            className="travel-mode-select"
            data-testid="travel-mode-select"
            aria-label="Travel mode"
            value={travelMode}
            onChange={(e) =>
              onTravelModeChange(e.target.value as TravelModeOption)
            }
          >
            <option value="DRIVE">Drive</option>
            <option value="WALK">Walk</option>
            <option value="TRANSIT">Transit</option>
          </select>
        </div>

        <button
          type="button"
          className="route-fastest-btn"
          data-testid="route-fastest-button"
          onClick={onRouteToFastest}
          disabled={!hasFastestBranch || isRouting}
        >
          <RouteBoltIcon size={15} />
          <span>{isRouting ? 'Routing…' : 'Route to Fastest'}</span>
        </button>
      </div>
    </header>
  );
};
