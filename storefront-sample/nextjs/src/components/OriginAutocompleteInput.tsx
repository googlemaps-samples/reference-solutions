'use client';

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_ORIGIN, SF_LOCATION_BIAS } from '@/lib/constants';
import type { OriginLocation } from '@/lib/types';

interface OriginAutocompleteInputProps {
  selectedLabel: string;
  onSelectOrigin: (origin: OriginLocation) => void;
}

export function OriginAutocompleteInput({
  selectedLabel,
  onSelectOrigin,
}: OriginAutocompleteInputProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onSelectRef = useRef(onSelectOrigin);
  onSelectRef.current = onSelectOrigin;

  const placesLibrary = useMapsLibrary('places');

  useEffect(() => {
    const container = hostRef.current;
    if (!container || !placesLibrary) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: SF_LOCATION_BIAS.center,
        radius: SF_LOCATION_BIAS.radius,
      },
    });

    autocomplete.placeholder = 'Enter San Francisco origin address...';
    autocomplete.value = DEFAULT_ORIGIN.label;
    autocomplete.style.width = '100%';
    autocomplete.style.colorScheme = 'light';
    autocomplete.style.borderRadius = '9px';
    autocomplete.style.border = '1px solid #c2d1d6';
    autocomplete.style.backgroundColor = '#ffffff';
    autocomplete.style.color = '#0f172a';
    autocomplete.style.fontSize = '13.5px';

    const handleSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });

        if (!place.location) return;

        const label =
          place.displayName || place.formattedAddress || 'Selected Origin';
        const address = place.formattedAddress || label;

        onSelectRef.current({
          label,
          address,
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch {
        // Ignore transient field fetch error; user can retry selection
      }
    };

    const handleError = () => {
      // Prevent uncaught custom element error bubbling
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    autocomplete.addEventListener('gmp-error', handleError);

    container.replaceChildren(autocomplete);
    elementRef.current = autocomplete;

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      autocomplete.removeEventListener('gmp-error', handleError);
      container.replaceChildren();
      elementRef.current = null;
    };
  }, [placesLibrary]);

  useEffect(() => {
    if (elementRef.current && selectedLabel === DEFAULT_ORIGIN.label) {
      elementRef.current.value = DEFAULT_ORIGIN.label;
    }
  }, [selectedLabel]);

  return (
    <div
      ref={hostRef}
      className="autocomplete-host"
      aria-label="Visitor origin address search"
    />
  );
}
