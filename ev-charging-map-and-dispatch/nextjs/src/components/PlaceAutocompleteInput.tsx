'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLngLiteral } from '@/lib/types';

interface PlaceAutocompleteInputProps {
  onPlaceSelect: (selection: {
    location: LatLngLiteral;
    address: string;
    shortLabel: string;
  }) => void;
}

export function PlaceAutocompleteInput({
  onPlaceSelect,
}: PlaceAutocompleteInputProps) {
  const map = useMap('dispatch-map');
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
    });
    autocomplete.setAttribute(
      'placeholder',
      'Search Seattle street, landmark, or breakdown address...'
    );

    container.replaceChildren(autocomplete);

    const syncBias = () => {
      if (!map) return;
      const bounds = map.getBounds();
      if (bounds) {
        autocomplete.locationBias = bounds.toJSON();
      }
    };

    syncBias();
    const boundsListener = map
      ? map.addListener('bounds_changed', syncBias)
      : null;

    const handleSelect = (rawEvent: Event) => {
      const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
      if (!event.placePrediction) return;
      const place = event.placePrediction.toPlace();

      void place
        .fetchFields({
          fields: ['location', 'viewport', 'displayName', 'formattedAddress'],
        })
        .then(() => {
          if (!place.location) return;
          const location: LatLngLiteral = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          const address =
            place.formattedAddress ||
            place.displayName ||
            `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
          const shortLabel =
            place.displayName || address.split(',').slice(0, 2).join(', ');

          if (map) {
            if (place.viewport) {
              map.fitBounds(place.viewport);
            } else {
              map.panTo(location);
              map.setZoom(13);
            }
          }

          onPlaceSelectRef.current({
            location,
            address,
            shortLabel,
          });
        })
        .catch((err: unknown) => {
          console.error('PlaceAutocomplete fetchFields failed:', err);
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
    <div
      id="autocomplete-container"
      ref={containerRef}
      className="autocomplete-wrapper"
      aria-label="Search breakdown or pickup address"
    />
  );
}
