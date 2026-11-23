'use client';

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLngPoint } from '@/types/hazard';

interface PlaceAutocompleteBoxProps {
  onPlaceSelected: (point: LatLngPoint, label: string) => void;
}

export function PlaceAutocompleteBox({
  onPlaceSelected,
}: PlaceAutocompleteBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const callbackRef = useRef(onPlaceSelected);
  callbackRef.current = onPlaceSelected;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !placesLib?.PlaceAutocompleteElement) {
      return;
    }

    container.replaceChildren();

    const autocompleteEl = new placesLib.PlaceAutocompleteElement({
      locationBias: {
        north: 25.86,
        south: 25.71,
        east: -80.12,
        west: -80.32,
      },
      includedRegionCodes: ['us'],
    });
    autocompleteEl.setAttribute(
      'internal-usage-attribution-ids',
      'gmp_git_agentsamples_v1.0.0'
    );
    autocompleteEl.placeholder = 'Jump to Miami address or landmark...';
    autocompleteEl.style.width = '100%';

    const handleSelect = async (event: Event) => {
      try {
        const selectEvent = event as unknown as {
          placePrediction?: google.maps.places.PlacePrediction;
        };
        if (!selectEvent.placePrediction) return;

        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          const label =
            place.formattedAddress ||
            place.displayName ||
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          callbackRef.current({ lat, lng }, label);
        }
      } catch {
        // Ignore transient autocomplete selection errors gracefully
      }
    };

    autocompleteEl.addEventListener('gmp-select', handleSelect);
    container.appendChild(autocompleteEl);

    return () => {
      autocompleteEl.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib]);

  return (
    <div
      ref={containerRef}
      className="place-autocomplete-wrapper"
      aria-label="Search Miami address using Place Autocomplete"
    />
  );
}
