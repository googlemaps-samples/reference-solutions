'use client';

import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LatLngLiteral } from '@/lib/types';

interface PlaceAutocompleteInputProps {
  onPlaceSelected: (selection: {
    name: string;
    formattedAddress: string;
    location: LatLngLiteral;
    viewport?: google.maps.LatLngBounds | null;
  }) => void;
}

interface PlaceSelectEventLike extends Event {
  placePrediction?: {
    toPlace: () => google.maps.places.Place;
  };
}

export default function PlaceAutocompleteInput({
  onPlaceSelected
}: PlaceAutocompleteInputProps) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['gb']
    });
    autocomplete.id = 'neighborhood-autocomplete-input';
    autocomplete.setAttribute(
      'aria-label',
      'Search Central London address or neighborhood'
    );

    container.replaceChildren(autocomplete);

    let boundsListener: google.maps.MapsEventListener | null = null;
    const syncBias = () => {
      if (!map) return;
      const bounds = map.getBounds();
      if (bounds) {
        autocomplete.locationBias = bounds.toJSON();
      }
    };

    if (map) {
      syncBias();
      boundsListener = map.addListener('bounds_changed', syncBias);
    }

    const handleSelect = (rawEvent: Event) => {
      const event = rawEvent as PlaceSelectEventLike;
      const prediction = event.placePrediction;
      if (!prediction) return;

      const place = prediction.toPlace();
      void place
        .fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport']
        })
        .then(() => {
          if (!place.location) return;
          const loc = {
            lat: place.location.lat(),
            lng: place.location.lng()
          };
          onPlaceSelectedRef.current({
            name: place.displayName ?? place.formattedAddress ?? 'Selected Area',
            formattedAddress: place.formattedAddress ?? '',
            location: loc,
            viewport: place.viewport ?? null
          });
        })
        .catch((err: unknown) => {
          console.error('Autocomplete fetchFields failed:', err);
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      if (boundsListener) {
        google.maps.event.removeListener(boundsListener);
      }
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [map, placesLibrary]);

  return (
    <div className="autocomplete-wrapper">
      <div
        ref={containerRef}
        className="autocomplete-host"
        data-testid="neighborhood-autocomplete-input"
      />
    </div>
  );
}
