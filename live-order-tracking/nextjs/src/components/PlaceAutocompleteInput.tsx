'use client';

import React, { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { KITCHEN_HUB, LatLngLiteral } from '@/lib/delivery';

export interface AutocompleteSelection {
  formattedAddress: string;
  location: LatLngLiteral | null;
  placeId?: string;
}

interface PlaceAutocompleteInputProps {
  onPlaceSelected: (selection: AutocompleteSelection) => void;
  disabled?: boolean;
}

export function PlaceAutocompleteInput({
  onPlaceSelected,
  disabled = false,
}: PlaceAutocompleteInputProps) {
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: KITCHEN_HUB.location,
        radius: 22000,
      },
    });

    autocomplete.setAttribute('aria-label', 'Search Chicago delivery address');
    autocomplete.style.width = '100%';
    autocomplete.style.display = 'block';

    const handleSelect = (rawEvent: Event) => {
      const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      const place = event.placePrediction.toPlace();
      void place
        .fetchFields({
          fields: ['location', 'formattedAddress', 'displayName', 'id'],
        })
        .then(() => {
          const formatted =
            place.formattedAddress ||
            (typeof place.displayName === 'string' ? place.displayName : '') ||
            '';
          const loc = place.location
            ? { lat: place.location.lat(), lng: place.location.lng() }
            : null;

          onPlaceSelectedRef.current({
            formattedAddress: formatted,
            location: loc,
            placeId: place.id,
          });
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch place fields:', err);
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLibrary]);

  return (
    <div
      id="checkout-address-autocomplete"
      data-testid="checkout-address-autocomplete"
      className={`autocomplete-shell ${disabled ? 'is-disabled' : ''}`}
    >
      <div ref={containerRef} className="autocomplete-host" />
      {!placesLibrary && (
        <div className="autocomplete-loading">
          Loading Places Autocomplete (New)…
        </div>
      )}
    </div>
  );
}
