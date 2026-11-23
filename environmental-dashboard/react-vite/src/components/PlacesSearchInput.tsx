import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { InspectedLocation } from '../types/environmental';

interface PlacesSearchInputProps {
  onPlaceSelected: (location: InspectedLocation) => void;
}

interface PlacePredictionSelectEvent extends Event {
  placePrediction?: {
    toPlace: () => google.maps.places.Place;
  };
}

export function PlacesSearchInput({ onPlaceSelected }: PlacesSearchInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      requestedLanguage: 'en',
      requestedRegion: 'us',
    });

    autocomplete.setAttribute(
      'placeholder',
      'Search any address, city, or landmark...'
    );
    autocomplete.style.width = '100%';

    const handleSelect = async (rawEvent: Event) => {
      const event = rawEvent as PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
      });

      if (!place.location) return;

      const lat = place.location.lat();
      const lng = place.location.lng();
      const name =
        place.displayName ||
        place.formattedAddress ||
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      onPlaceSelectedRef.current({
        name,
        formattedAddress: place.formattedAddress || name,
        coords: { lat, lng },
        placeId: place.id,
        source: 'autocomplete',
        viewport: place.viewport ?? null,
      });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib]);

  return (
    <div
      ref={containerRef}
      data-testid="places-autocomplete-container"
      className="places-autocomplete-container"
      aria-label="Search address or city"
    />
  );
}
