'use client';

import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { ResolvedPlace } from '@/types/rideshare';

interface PlaceAutocompleteInputProps {
  testId: string;
  label: string;
  placeholder: string;
  selectedPlace: ResolvedPlace | null;
  fallbackText: string;
  accentColor: 'emerald' | 'rose';
  hasApiKey: boolean;
  onPlaceSelect: (place: ResolvedPlace) => void;
}

function LivePlaceAutocompleteElement({
  placeholder,
  selectedPlace,
  fallbackText,
  label,
  onPlaceSelect,
}: {
  placeholder: string;
  selectedPlace: ResolvedPlace | null;
  fallbackText: string;
  label: string;
  onPlaceSelect: (place: ResolvedPlace) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: { lat: 34.0522, lng: -118.2437 },
        radius: 50000,
      },
    });

    const el = autocomplete as unknown as HTMLElement & {
      placeholder?: string;
      value?: string;
    };
    el.placeholder = placeholder;
    el.style.width = '100%';
    el.style.display = 'block';
    el.style.colorScheme = 'light';

    container.replaceChildren(autocomplete);
    autocompleteRef.current = autocomplete;

    const handleSelect = async (event: Event) => {
      const selectEvent =
        event as unknown as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        if (!place.location) return;

        onPlaceSelectRef.current({
          id: place.id || `${place.location.lat()},${place.location.lng()}`,
          name:
            place.displayName ||
            place.formattedAddress ||
            'Selected Los Angeles Location',
          formattedAddress: place.formattedAddress || place.displayName || '',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch (err) {
        console.error('Error fetching selected place fields:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocompleteRef.current = null;
      container.replaceChildren();
    };
  }, [placesLib, placeholder]);

  useEffect(() => {
    const autocomplete = autocompleteRef.current as
      | (google.maps.places.PlaceAutocompleteElement & { value?: string })
      | null;
    if (!autocomplete) return;

    const displayValue = selectedPlace?.name || fallbackText;
    if (displayValue && autocomplete.value !== displayValue) {
      autocomplete.value = displayValue;
    }
  }, [selectedPlace, fallbackText]);

  return (
    <div ref={containerRef} className="min-h-[42px] w-full">
      {!placesLib && (
        <input
          type="text"
          readOnly
          value={selectedPlace?.name || fallbackText}
          aria-label={label}
          className="h-[42px] w-full rounded-xl bg-white px-3 text-sm font-medium text-slate-700 outline-none"
        />
      )}
    </div>
  );
}

export function PlaceAutocompleteInput({
  testId,
  label,
  placeholder,
  selectedPlace,
  fallbackText,
  accentColor,
  hasApiKey,
  onPlaceSelect,
}: PlaceAutocompleteInputProps) {
  const dotClass =
    accentColor === 'emerald'
      ? 'bg-emerald-500 ring-emerald-100'
      : 'bg-rose-500 ring-rose-100';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ring-4 ${dotClass}`}
          />
          {label}
        </label>
        {selectedPlace && (
          <span className="max-w-[190px] truncate text-[11px] font-medium text-slate-400">
            Places API (New)
          </span>
        )}
      </div>

      <div
        data-testid={testId}
        className="autocomplete-host rounded-xl border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      >
        {hasApiKey ? (
          <LivePlaceAutocompleteElement
            placeholder={placeholder}
            selectedPlace={selectedPlace}
            fallbackText={fallbackText}
            label={label}
            onPlaceSelect={onPlaceSelect}
          />
        ) : (
          <input
            type="text"
            readOnly
            value={selectedPlace?.name || fallbackText}
            aria-label={label}
            className="h-[42px] w-full rounded-xl bg-white px-3 text-sm font-medium text-slate-700 outline-none"
          />
        )}
      </div>

      {selectedPlace?.formattedAddress && (
        <p className="truncate pl-1 text-xs text-slate-500">
          {selectedPlace.formattedAddress}
        </p>
      )}
    </div>
  );
}
