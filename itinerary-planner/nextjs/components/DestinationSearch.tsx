'use client';

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { DestinationState } from '@/types/itinerary';

interface DestinationSearchProps {
  hasApiKey: boolean;
  onSelectDestination: (destination: DestinationState) => void;
}

interface PlaceSelectEventLike extends Event {
  placePrediction?: {
    toPlace: () => google.maps.places.Place;
  };
  place?: google.maps.places.Place;
}

export function DestinationSearch({
  hasApiKey,
  onSelectDestination,
}: DestinationSearchProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onSelectDestination);
  callbackRef.current = onSelectDestination;

  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    const container = containerRef.current;
    if (!hasApiKey || !placesLib || !container) return;

    container.replaceChildren();

    const options: google.maps.places.PlaceAutocompleteElementOptions = {
      requestedLanguage: 'en',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    };
    const autocomplete = new placesLib.PlaceAutocompleteElement(options);
    autocomplete.setAttribute('placeholder', 'Search destination city or landmark...');
    autocomplete.style.width = '100%';

    const handleSelect = async (rawEvent: Event) => {
      const event = rawEvent as PlaceSelectEventLike;
      const place = event.placePrediction?.toPlace?.() ?? event.place;
      if (!place) return;

      try {
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'utcOffsetMinutes',
          ],
        });

        const loc = place.location;
        if (!loc) return;

        const name = place.displayName || 'Selected Destination';
        const formattedAddress = place.formattedAddress || name;

        callbackRef.current({
          name,
          formattedAddress,
          center: { lat: loc.lat(), lng: loc.lng() },
          zoom: 12,
          placeId: place.id,
          utcOffsetMinutes:
            typeof place.utcOffsetMinutes === 'number'
              ? place.utcOffsetMinutes
              : undefined,
        });
      } catch (err) {
        console.error('Failed to fetch fields for selected place:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.appendChild(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [hasApiKey, placesLib]);

  return (
    <div
      ref={containerRef}
      data-testid="destination-search-input"
      className="search-box-wrap"
      aria-label="Search destination city or landmark"
    >
      {!hasApiKey && (
        <span style={{ fontSize: 12, color: '#64748b', padding: '0 8px' }}>
          Destination search ready once API key is configured
        </span>
      )}
    </div>
  );
}
