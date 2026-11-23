import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import type { CivicHubPlace } from '../types/gis';

interface PlaceAutocompleteControlProps {
  hasApiKey: boolean;
  onSelectPlace: (place: CivicHubPlace) => void;
}

const NYC_BOUNDS_LITERAL: google.maps.LatLngBoundsLiteral = {
  north: 40.9176,
  south: 40.4774,
  east: -73.7004,
  west: -74.2591
};

export const PlaceAutocompleteControl: React.FC<PlaceAutocompleteControlProps> = ({
  hasApiKey,
  onSelectPlace
}) => {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;

  useEffect(() => {
    const container = containerRef.current;
    if (!hasApiKey || !placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement();
    autocomplete.locationBias = NYC_BOUNDS_LITERAL;
    autocomplete.includedRegionCodes = ['us'];
    container.replaceChildren(autocomplete);

    const handleSelect = (rawEvent: Event) => {
      const event = rawEvent as google.maps.places.PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      const place = event.placePrediction.toPlace();
      void place
        .fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport', 'types']
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
            onSelectPlaceRef.current({
              id: place.id ?? `place-${Date.now()}`,
              displayName: place.displayName ?? 'Selected NYC Location',
              formattedAddress: place.formattedAddress ?? 'New York, NY',
              location: {
                lat: place.location.lat(),
                lng: place.location.lng()
              },
              types: place.types ?? []
            });
          }
        })
        .catch(() => {
          // Graceful handling if place details fetch is interrupted
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [hasApiKey, placesLibrary, map]);

  if (!hasApiKey || !placesLibrary) {
    return (
      <div className="autocomplete-slot">
        <div className="autocomplete-placeholder" aria-label="Location search unavailable without API key">
          <Search size={13} />
          <span>NYC Location Jump</span>
        </div>
      </div>
    );
  }

  return (
    <div className="autocomplete-slot">
      <div ref={containerRef} className="autocomplete-host" />
    </div>
  );
};
