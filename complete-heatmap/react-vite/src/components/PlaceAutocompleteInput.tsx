import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLngPoint } from '../types/hazard';

interface PlaceAutocompleteInputProps {
  onSelectLocation: (location: LatLngPoint, label: string) => void;
}

export function PlaceAutocompleteInput({ onSelectLocation }: PlaceAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !placesLib?.PlaceAutocompleteElement) return undefined;

    container.replaceChildren();

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        north: 25.92,
        south: 25.66,
        east: -80.11,
        west: -80.35,
      },
    });
    autocomplete.setAttribute('aria-label', 'Jump to a Miami address or intersection');
    autocomplete.style.width = '100%';

    const handleSelect = async (event: Event) => {
      const selectEvent = event as unknown as {
        placePrediction?: {
          toPlace: () => google.maps.places.Place;
        };
      };
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['location', 'formattedAddress', 'displayName'],
        });
        if (place.location) {
          onSelectLocation(
            {
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
            place.formattedAddress ?? place.displayName ?? 'Selected Miami Location'
          );
        }
      } catch {
        // Ignore transient autocomplete selection errors cleanly
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.appendChild(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib, onSelectLocation]);

  return (
    <div
      ref={containerRef}
      className="place-autocomplete-host"
      aria-label="Miami address locator"
    />
  );
}
