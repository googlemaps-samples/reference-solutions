'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { NYC_CENTER } from '@/lib/classify';
import type { OriginLocation } from '@/types/locator';

interface PlaceAutocompleteWidgetProps {
  onSelectOrigin: (origin: OriginLocation) => void;
}

interface PlacePredictionSelectEvent extends Event {
  placePrediction?: {
    toPlace: () => google.maps.places.Place;
  };
}

export function PlaceAutocompleteWidget({
  onSelectOrigin,
}: PlaceAutocompleteWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: NYC_CENTER,
        radius: 25000,
      },
    });

    autocomplete.style.width = '100%';
    autocomplete.style.minWidth = '240px';
    autocomplete.style.colorScheme = 'light';

    container.replaceChildren(autocomplete);

    const handleSelect = (rawEvent: Event) => {
      const event = rawEvent as PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      const place = event.placePrediction.toPlace();
      void place
        .fetchFields({
          fields: ['location', 'displayName', 'formattedAddress', 'id'],
        })
        .then(() => {
          if (!place.location) return;
          const coords = place.location.toJSON();
          const label =
            place.displayName || place.formattedAddress || 'Selected NYC Origin';

          if (map) {
            map.panTo(coords);
          }

          onSelectOrigin({
            label,
            address: place.formattedAddress ?? undefined,
            location: coords,
            placeId: place.id ?? undefined,
          });
        })
        .catch(() => {
          // Ignore transient fetch errors on canceled selections
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib, map, onSelectOrigin]);

  return (
    <div className="places-widget-overlay">
      <div className="places-widget-label">Places UI Widget (New)</div>
      <div ref={containerRef} />
    </div>
  );
}
