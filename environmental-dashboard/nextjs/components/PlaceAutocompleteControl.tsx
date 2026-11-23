'use client';

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';

export interface SelectedAutocompletePlace {
  lat: number;
  lng: number;
  name: string;
  formattedAddress: string;
  placeId?: string;
  viewport?: google.maps.LatLngBounds | null;
}

interface PlaceAutocompleteControlProps {
  hasApiKey: boolean;
  onPlaceSelect: (place: SelectedAutocompletePlace) => void;
}

interface PlacePredictionLike {
  toPlace: () => google.maps.places.Place;
}

interface GmpSelectEvent extends Event {
  placePrediction?: PlacePredictionLike;
}

export function PlaceAutocompleteControl({
  hasApiKey,
  onPlaceSelect,
}: PlaceAutocompleteControlProps) {
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({});
    autocomplete.setAttribute('aria-label', 'Search any address or city');
    container.replaceChildren(autocomplete);

    const handleSelect = async (rawEvent: Event) => {
      const event = rawEvent as GmpSelectEvent;
      const place = event.placePrediction?.toPlace();
      if (!place) return;

      try {
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
        });

        if (!place.location) return;

        const lat = place.location.lat();
        const lng = place.location.lng();
        const displayName =
          typeof place.displayName === 'string' && place.displayName.trim()
            ? place.displayName
            : place.formattedAddress || 'Selected Location';

        onPlaceSelectRef.current({
          lat,
          lng,
          name: displayName,
          formattedAddress:
            place.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          placeId: place.id,
          viewport: place.viewport ?? null,
        });
      } catch (err) {
        console.error('Failed to fetch selected place details:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLibrary]);

  return (
    <div data-testid="places-autocomplete-container" className="header-search-wrap">
      {hasApiKey ? (
        <div ref={containerRef} className="autocomplete-host" />
      ) : (
        <div className="autocomplete-fallback">
          <Search size={14} />
          <span>Configure API key to enable Places search</span>
        </div>
      )}
    </div>
  );
}
