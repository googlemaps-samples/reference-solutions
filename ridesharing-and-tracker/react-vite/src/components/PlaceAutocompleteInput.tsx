import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { ResolvedPlace } from '../types/rideshare';

interface PlaceAutocompleteInputProps {
  testId: string;
  label: string;
  placeholder: string;
  value: string;
  dotColor: string;
  onPlaceSelect: (place: ResolvedPlace) => void;
  onError?: (message: string) => void;
}

export function PlaceAutocompleteInput({
  testId,
  label,
  placeholder,
  value,
  dotColor,
  onPlaceSelect,
  onError,
}: PlaceAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(
    null
  );
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onErrorRef = useRef(onError);

  onPlaceSelectRef.current = onPlaceSelect;
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!placesLib || !host) {
      return;
    }

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: { lat: 34.0522, lng: -118.2437 },
        radius: 50000,
      },
      placeholder,
      requestedLanguage: 'en',
      requestedRegion: 'us',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    autocomplete.className = 'gmp-autocomplete-widget';
    if (value) {
      autocomplete.value = value;
    }

    const handleSelect = async (
      event: google.maps.places.PlacePredictionSelectEvent
    ) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        if (!place.location) {
          return;
        }
        onPlaceSelectRef.current({
          id: place.id,
          name: place.displayName ?? place.formattedAddress ?? 'Selected Place',
          address: place.formattedAddress ?? place.displayName ?? '',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch (err) {
        onErrorRef.current?.(
          err instanceof Error ? err.message : 'Failed to load place details.'
        );
      }
    };

    const handleError = () => {
      onErrorRef.current?.(
        'Places Autocomplete could not connect. Verify API key permissions.'
      );
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('gmp-error', handleError);

    host.replaceChildren(autocomplete);
    elementRef.current = autocomplete;

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocomplete.removeEventListener('gmp-error', handleError);
      host.replaceChildren();
      elementRef.current = null;
    };
  }, [placesLib, placeholder]);

  useEffect(() => {
    if (elementRef.current && value !== undefined) {
      elementRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="autocomplete-field">
      <div className="autocomplete-label-row">
        <span
          className="location-dot"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        <span className="autocomplete-label">{label}</span>
      </div>
      <div
        ref={hostRef}
        data-testid={testId}
        className="autocomplete-host"
        aria-label={label}
      >
        {!placesLib && (
          <input
            type="text"
            className="autocomplete-fallback-input"
            value={value}
            placeholder={placeholder}
            readOnly
            aria-label={label}
          />
        )}
      </div>
    </div>
  );
}
