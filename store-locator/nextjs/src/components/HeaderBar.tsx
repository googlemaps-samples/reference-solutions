'use client';

import { useEffect, useRef, useState } from 'react';
import { NYC_ORIGIN_PRESETS } from '@/lib/classify';
import type {
  AutocompleteSuggestionItem,
  OriginLocation,
  TravelMode,
} from '@/types/locator';

interface HeaderBarProps {
  origin: OriginLocation;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  suggestions: AutocompleteSuggestionItem[];
  isSearchingSuggestions: boolean;
  onSelectSuggestion: (item: AutocompleteSuggestionItem) => void;
  onSubmitSearchText: (query: string) => void;
  onSelectPresetOrigin: (preset: OriginLocation) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  onRouteToFastest: () => void;
  canRouteToFastest: boolean;
  isComputingRoute: boolean;
}

export function HeaderBar({
  origin,
  searchQuery,
  onSearchQueryChange,
  suggestions,
  isSearchingSuggestions,
  onSelectSuggestion,
  onSubmitSearchText,
  onSelectPresetOrigin,
  travelMode,
  onTravelModeChange,
  onRouteToFastest,
  canRouteToFastest,
  isComputingRoute,
}: HeaderBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showSuggestions =
    isDropdownOpen &&
    (suggestions.length > 0 ||
      isSearchingSuggestions ||
      searchQuery.trim().length < 2);

  return (
    <header className="app-header" data-testid="app-header">
      <div className="brand-group">
        <div className="brand-logo" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        </div>
        <div>
          <div className="brand-title">MetroGrid NYC Locator</div>
          <div className="brand-subtitle">
            Flagships, Express Kiosks &amp; 24/7 ATMs
          </div>
        </div>
      </div>

      <div className="header-controls">
        <div className="search-box-wrap" ref={searchWrapRef}>
          <form
            className="search-input-inner"
            onSubmit={(e) => {
              e.preventDefault();
              if (suggestions.length > 0) {
                onSelectSuggestion(suggestions[0]);
              } else if (searchQuery.trim().length > 0) {
                onSubmitSearchText(searchQuery.trim());
              }
              setIsDropdownOpen(false);
            }}
          >
            <span className="search-icon" aria-hidden="true">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              className="origin-search-input"
              data-testid="origin-search-input"
              aria-label="Search NYC starting location"
              placeholder="Search NYC starting address or landmark..."
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setIsDropdownOpen(true);
              }}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                className="search-clear-btn"
                aria-label="Clear search"
                onClick={() => {
                  onSearchQueryChange('');
                  setIsDropdownOpen(true);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </form>

          {showSuggestions && (
            <div
              className="autocomplete-dropdown"
              data-testid="autocomplete-dropdown"
              role="listbox"
            >
              {isSearchingSuggestions && (
                <div className="autocomplete-item">
                  <span className="autocomplete-secondary">
                    Searching NYC locations...
                  </span>
                </div>
              )}

              {!isSearchingSuggestions && suggestions.length > 0 && (
                <>
                  <div className="autocomplete-section-label">
                    Places Autocomplete (NYC)
                  </div>
                  {suggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      className="autocomplete-item"
                      role="option"
                      aria-selected="false"
                      onClick={() => {
                        onSelectSuggestion(item);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="autocomplete-primary">
                        {item.primaryText}
                      </span>
                      {item.secondaryText && (
                        <span className="autocomplete-secondary">
                          {item.secondaryText}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {!isSearchingSuggestions && suggestions.length === 0 && (
                <>
                  <div className="autocomplete-section-label">
                    Quick NYC Starting Origins
                  </div>
                  {NYC_ORIGIN_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="autocomplete-item"
                      onClick={() => {
                        onSelectPresetOrigin(preset);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="autocomplete-primary">
                        {preset.label}
                      </span>
                      <span className="autocomplete-secondary">
                        {preset.address}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <select
          className="preset-select"
          aria-label="Quick NYC origin preset"
          value={
            NYC_ORIGIN_PRESETS.some((p) => p.label === origin.label)
              ? origin.label
              : ''
          }
          onChange={(e) => {
            const matched = NYC_ORIGIN_PRESETS.find(
              (p) => p.label === e.target.value
            );
            if (matched) {
              onSelectPresetOrigin(matched);
            }
          }}
        >
          <option value="" disabled>
            NYC Presets
          </option>
          {NYC_ORIGIN_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label}
            </option>
          ))}
        </select>

        <select
          className="travel-mode-select"
          data-testid="travel-mode-select"
          aria-label="Travel mode"
          value={travelMode}
          onChange={(e) => onTravelModeChange(e.target.value as TravelMode)}
        >
          <option value="DRIVE">Drive</option>
          <option value="WALK">Walk</option>
          <option value="TRANSIT">Transit</option>
        </select>

        <button
          type="button"
          className="route-fastest-btn"
          data-testid="route-fastest-button"
          onClick={onRouteToFastest}
          disabled={!canRouteToFastest || isComputingRoute}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          {isComputingRoute ? 'Routing...' : 'Route to Fastest'}
        </button>
      </div>
    </header>
  );
}
