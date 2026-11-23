import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Building2, RotateCcw } from 'lucide-react';
import type { LatLngPoint, PropertyFilters, PropertyType } from '../types';

interface TopSearchBarProps {
  filters: PropertyFilters;
  onFiltersChange: (next: PropertyFilters) => void;
  totalMatching: number;
  hasPolygonFilter: boolean;
  searchedLocationLabel: string | null;
  onLocationSelected: (
    location: LatLngPoint,
    viewport: google.maps.LatLngBoundsLiteral | null,
    label: string
  ) => void;
  onResetSearchView: () => void;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  filters,
  onFiltersChange,
  totalMatching,
  hasPolygonFilter,
  searchedLocationLabel,
  onLocationSelected,
  onResetSearchView,
}) => {
  const placesLib = useMapsLibrary('places');
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
  const onLocationSelectedRef = useRef(onLocationSelected);

  useEffect(() => {
    onLocationSelectedRef.current = onLocationSelected;
  }, [onLocationSelected]);

  useEffect(() => {
    const host = autocompleteHostRef.current;
    if (!placesLib || !host) return;

    // Mount PlaceAutocompleteElement imperatively to avoid React JSX prop stringification (CF8)
    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        north: 37.82,
        south: 37.7,
        east: -122.35,
        west: -122.52,
      },
      placeholder: 'Search SF neighborhood or address...',
    });

    autocomplete.setAttribute('aria-label', 'Search San Francisco neighborhood or address');
    autocomplete.style.width = '100%';
    autocomplete.style.display = 'block';

    const handleSelect = async (event: Event) => {
      const selectEvent = event as unknown as {
        placePrediction?: google.maps.places.PlacePrediction;
      };
      if (!selectEvent.placePrediction) return;

      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });

        if (!place.location) return;

        const location: LatLngPoint = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const viewport = place.viewport ? place.viewport.toJSON() : null;
        const label =
          place.displayName || place.formattedAddress || 'Selected San Francisco location';

        onLocationSelectedRef.current(location, viewport, label);
      } catch (err) {
        console.error('Failed to resolve autocomplete selection:', err);
      }
    };

    const handleError = (event: Event) => {
      console.warn('PlaceAutocompleteElement error event:', event);
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('gmp-error', handleError);
    host.replaceChildren(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocomplete.removeEventListener('gmp-error', handleError);
      host.replaceChildren();
    };
  }, [placesLib]);

  return (
    <header className="top-search-bar" id="top-search-bar">
      <div className="brand-block">
        <div className="brand-icon" aria-hidden="true">
          <Building2 size={18} />
        </div>
        <div className="brand-text">
          <span className="brand-title">BayParcel</span>
          <span className="brand-subtitle">San Francisco Homes &amp; Lots</span>
        </div>
      </div>

      <div className="search-controls-row">
        <div className="location-search-wrap">
          <div
            ref={autocompleteHostRef}
            id="location-search-input"
            data-testid="location-search-input"
            className="place-autocomplete-host"
          />
          {searchedLocationLabel && (
            <button
              type="button"
              className="reset-view-chip"
              onClick={onResetSearchView}
              title={`Centered on ${searchedLocationLabel} — reset to San Francisco`}
            >
              <RotateCcw size={12} />
              <span>Reset SF</span>
            </button>
          )}
        </div>

        <label className="filter-select-wrap" aria-label="Maximum Price">
          <span className="filter-label">Max Price</span>
          <select
            id="filter-max-price"
            data-testid="filter-max-price"
            className="filter-select"
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Any Price</option>
            <option value="1500000">Up to $1.5M</option>
            <option value="2000000">Up to $2.0M</option>
            <option value="2750000">Up to $2.75M</option>
            <option value="3500000">Up to $3.5M</option>
          </select>
        </label>

        <label className="filter-select-wrap" aria-label="Minimum Bedrooms">
          <span className="filter-label">Beds</span>
          <select
            id="filter-min-beds"
            data-testid="filter-min-beds"
            className="filter-select"
            value={filters.minBeds ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minBeds: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Any Beds</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
          </select>
        </label>

        <label className="filter-select-wrap" aria-label="Property Type">
          <span className="filter-label">Type</span>
          <select
            id="filter-property-type"
            data-testid="filter-property-type"
            className="filter-select"
            value={filters.propertyType}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                propertyType: e.target.value as PropertyType | 'ALL',
              })
            }
          >
            <option value="ALL">All Types</option>
            <option value="Single Family">Single Family</option>
            <option value="Condo">Condo</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Multi-Family">Multi-Family</option>
          </select>
        </label>

        <span
          id="results-count"
          data-testid="results-count"
          className={`results-count-badge ${hasPolygonFilter ? 'area-active' : ''}`}
        >
          {totalMatching} {totalMatching === 1 ? 'home' : 'homes'}
          {hasPolygonFilter ? ' in drawn area' : ''}
        </span>
      </div>
    </header>
  );
};
