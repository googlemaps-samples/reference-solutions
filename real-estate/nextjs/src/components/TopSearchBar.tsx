'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Building2, Search } from 'lucide-react';
import type { LatLngPoint, PropertyFilters, PropertyType } from '@/types/real-estate';

interface TopSearchBarProps {
  filters: PropertyFilters;
  onFiltersChange: (next: PropertyFilters) => void;
  totalCount: number;
  filteredCount: number;
  hasActiveAreaFilter: boolean;
  onLocationSelect: (selection: {
    center: LatLngPoint;
    viewport?: google.maps.LatLngBoundsLiteral;
    label: string;
  }) => void;
}

export default function TopSearchBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  hasActiveAreaFilter,
  onLocationSelect,
}: TopSearchBarProps) {
  const placesLib = useMapsLibrary('places');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [autocompleteReady, setAutocompleteReady] = useState(false);
  const [fallbackQuery, setFallbackQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    if (!placesLib || !hostRef.current) return;

    const container = hostRef.current;
    container.replaceChildren();

    const PlaceAutocompleteCtor = placesLib.PlaceAutocompleteElement;
    if (!PlaceAutocompleteCtor) {
      setAutocompleteReady(false);
      return;
    }

    const autocomplete = new PlaceAutocompleteCtor({
      includedRegionCodes: ['us'],
      locationBias: {
        center: { lat: 37.7749, lng: -122.4194 },
        radius: 25000,
      },
    });
    autocomplete.setAttribute('internal-usage-attribution-ids', 'gmp_git_agentsamples_v1.0.0');
    autocomplete.setAttribute('aria-label', 'Search San Francisco neighborhood or address');

    const handleSelect = async (event: Event) => {
      const selectEvent = event as unknown as {
        placePrediction?: {
          toPlace: () => google.maps.places.Place;
        };
      };
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        if (!place.location) return;

        const center: LatLngPoint = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const viewport = place.viewport ? place.viewport.toJSON() : undefined;
        const label =
          place.displayName || place.formattedAddress || 'Selected San Francisco location';

        onLocationSelectRef.current({ center, viewport, label });
      } catch (err) {
        console.warn('Place selection fetchFields failed:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.appendChild(autocomplete);
    setAutocompleteReady(true);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
      setAutocompleteReady(false);
    };
  }, [placesLib]);

  const handleFallbackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = fallbackQuery.trim();
    if (!query) return;

    setSearching(true);
    try {
      const response = await fetch('/api/places/search-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: `${query}, San Francisco, CA`,
          biasCenter: { lat: 37.7749, lng: -122.4194 },
        }),
      });
      if (!response.ok) return;
      const data = await response.json();
      const first = data?.places?.[0];
      if (first?.location) {
        onLocationSelect({
          center: {
            lat: first.location.latitude,
            lng: first.location.longitude,
          },
          label: first.displayName?.text || first.formattedAddress || query,
        });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="top-bar">
      <div className="brand-group">
        <div className="brand-mark" aria-hidden="true">
          <Building2 size={18} />
        </div>
        <div>
          <h1 className="brand-title">BayParcel Explorer</h1>
          <div className="brand-subtitle">San Francisco Lots &amp; Commutes</div>
        </div>
      </div>

      <div className="search-controls-row">
        <div
          id="location-search-input"
          data-testid="location-search-input"
          className="location-search-wrapper"
        >
          <div
            ref={hostRef}
            className="location-search-host"
            style={{ display: autocompleteReady ? 'flex' : 'none' }}
          />
          {!autocompleteReady && (
            <form className="fallback-search-form" onSubmit={handleFallbackSearch}>
              <input
                type="text"
                className="text-input"
                placeholder="Search SF neighborhood or address..."
                aria-label="Search San Francisco neighborhood or address"
                value={fallbackQuery}
                onChange={(e) => setFallbackQuery(e.target.value)}
              />
              <button
                type="submit"
                className="primary-btn"
                disabled={searching}
                aria-label="Search location"
              >
                <Search size={14} />
              </button>
            </form>
          )}
        </div>

        <select
          id="filter-max-price"
          data-testid="filter-max-price"
          aria-label="Maximum price"
          className="filter-select"
          value={filters.maxPrice ?? ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              maxPrice: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">Max Price: Any</option>
          <option value="1500000">Up to $1.5M</option>
          <option value="2000000">Up to $2.0M</option>
          <option value="3000000">Up to $3.0M</option>
          <option value="4000000">Up to $4.0M</option>
          <option value="5500000">Up to $5.5M</option>
        </select>

        <select
          id="filter-min-beds"
          data-testid="filter-min-beds"
          aria-label="Minimum bedrooms"
          className="filter-select"
          value={filters.minBeds ?? ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minBeds: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">Beds: Any</option>
          <option value="1">1+ Beds</option>
          <option value="2">2+ Beds</option>
          <option value="3">3+ Beds</option>
          <option value="4">4+ Beds</option>
        </select>

        <select
          id="filter-property-type"
          data-testid="filter-property-type"
          aria-label="Property type"
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
      </div>

      <div id="results-count" data-testid="results-count" className="results-badge">
        {hasActiveAreaFilter
          ? `${filteredCount} of ${totalCount} in Area`
          : `${filteredCount} Homes`}
      </div>
    </header>
  );
}
