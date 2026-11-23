'use client';

import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

export interface SelectedPlaceJump {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface PlaceSearchBoxProps {
  onPlaceSelect: (place: SelectedPlaceJump) => void;
}

export const PlaceSearchBox: React.FC<PlaceSearchBoxProps> = ({
  onPlaceSelect,
}) => {
  const map = useMap();
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
    autocomplete.style.width = '100%';
    autocomplete.style.display = 'block';
    container.replaceChildren(autocomplete);

    let boundsListener: google.maps.MapsEventListener | null = null;
    const syncBounds = () => {
      if (!map) return;
      const bounds = map.getBounds();
      if (bounds) {
        autocomplete.locationBias = bounds.toJSON();
      }
    };

    if (map) {
      syncBounds();
      boundsListener = map.addListener('bounds_changed', syncBounds);
    }

    const handlePlaceSelect = (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;

      const place = selectEvent.placePrediction.toPlace();
      void place
        .fetchFields({
          fields: ['id', 'location', 'viewport', 'displayName', 'formattedAddress'],
        })
        .then(() => {
          if (map) {
            if (place.viewport) {
              map.fitBounds(place.viewport);
            } else if (place.location) {
              map.panTo(place.location);
              map.setZoom(14);
            }
          }

          if (place.location) {
            onPlaceSelectRef.current({
              id: place.id || `jump-${Date.now()}`,
              displayName: place.displayName || 'Selected NYC Location',
              formattedAddress: place.formattedAddress || 'New York, NY',
              location: {
                lat: place.location.lat(),
                lng: place.location.lng(),
              },
            });
          }
        })
        .catch(() => {
          // Non-fatal field fetch failure
        });
    };

    autocomplete.addEventListener('gmp-select', handlePlaceSelect);

    return () => {
      boundsListener?.remove();
      autocomplete.removeEventListener('gmp-select', handlePlaceSelect);
      container.replaceChildren();
    };
  }, [map, placesLibrary]);

  return (
    <div
      className="place-search-wrapper"
      data-testid="place-autocomplete-container"
      aria-label="Jump to NYC location"
    >
      <div ref={containerRef} className="place-search-host" />
    </div>
  );
};
