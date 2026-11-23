'use client';

import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import type { PlaceEndpoint } from '@/types/travel';

interface PlacePickerProps {
  id: string;
  label: string;
  badgeLetter: 'A' | 'B';
  badgeColorClass: string;
  placeholder: string;
  selectedPlace: PlaceEndpoint | null;
  isResolvingSeed: boolean;
  onPlaceSelected: (place: PlaceEndpoint) => void;
}

interface PlaceSelectEvent extends Event {
  placePrediction?: {
    toPlace: () => google.maps.places.Place;
  };
}

type PlaceAutocompleteElementInstance = HTMLElement & {
  locationBias?: google.maps.LatLngBoundsLiteral;
  includedRegionCodes?: string[];
  placeholder?: string;
};

export default function PlacePicker({
  id,
  label,
  badgeLetter,
  badgeColorClass,
  placeholder,
  selectedPlace,
  isResolvingSeed,
  onPlaceSelected,
}: PlacePickerProps) {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onPlaceSelected);

  useEffect(() => {
    onSelectRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const PlaceAutocompleteCtor = (
      placesLib as unknown as {
        PlaceAutocompleteElement?: new (
          options?: Record<string, unknown>
        ) => PlaceAutocompleteElementInstance;
      }
    ).PlaceAutocompleteElement;

    if (!PlaceAutocompleteCtor) return;

    const element = new PlaceAutocompleteCtor({});
    element.id = id;
    element.setAttribute('data-testid', id);
    element.setAttribute('aria-label', label);
    // Assign complex properties imperatively (avoid React JSX prop stringification)
    element.locationBias = {
      north: 40.15,
      south: 39.55,
      east: -104.75,
      west: -105.45,
    };
    element.includedRegionCodes = ['us'];
    element.placeholder = placeholder;

    const handleSelect = async (event: Event) => {
      const selectEvent = event as PlaceSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        if (!place.location) return;

        onSelectRef.current({
          id: place.id || '',
          displayName:
            place.displayName || place.formattedAddress || 'Selected location',
          formattedAddress:
            place.formattedAddress || place.displayName || 'Selected location',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch (err) {
        console.error('Failed to fetch selected place details:', err);
      }
    };

    element.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(element);

    return () => {
      element.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib, id, label, placeholder]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${badgeColorClass}`}
          >
            {badgeLetter}
          </span>
          {label}
        </label>
        {selectedPlace && (
          <span className="font-mono text-[10px] text-slate-400">
            {selectedPlace.location.lat.toFixed(3)}, {selectedPlace.location.lng.toFixed(3)}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="gmp-autocomplete-host min-h-[40px] w-full"
      >
        <div className="flex h-10 w-full items-center rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
          {placeholder}
        </div>
      </div>

      <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 border border-slate-200/80">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />
        {isResolvingSeed && !selectedPlace ? (
          <span className="text-slate-400">Resolving location via Places API...</span>
        ) : selectedPlace ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">
              {selectedPlace.displayName}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {selectedPlace.formattedAddress}
            </p>
          </div>
        ) : (
          <span className="text-slate-400">Search or select a Front Range location</span>
        )}
      </div>
    </div>
  );
}
