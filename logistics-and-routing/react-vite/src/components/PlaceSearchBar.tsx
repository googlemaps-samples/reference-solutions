import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { DALLAS_CENTER } from '../data/dallasFleet';
import type { LogisticsHub } from '../types/logistics';

interface PlaceSearchBarProps {
  onHubSelected: (hub: LogisticsHub) => void;
}

export function PlaceSearchBar({ onHubSelected }: PlaceSearchBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const onHubSelectedRef = useRef(onHubSelected);
  onHubSelectedRef.current = onHubSelected;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !placesLib) return;

    const autocompleteEl = new placesLib.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: DALLAS_CENTER,
        radius: 30000,
      },
      placeholder: 'Add Dallas drop-off hub or facility...',
    });

    autocompleteEl.style.width = '100%';
    autocompleteEl.style.minWidth = '240px';

    const handleSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent.placePrediction;
      if (!prediction) return;

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        const loc = place.location;
        if (!loc) return;

        onHubSelectedRef.current({
          id: place.id,
          name: place.displayName ?? 'Dallas Dispatch Stop',
          address: place.formattedAddress ?? 'Dallas, TX',
          position: {
            lat: typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat),
            lng: typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng),
          },
          source: 'places-autocomplete',
        });
      } catch {
        // Ignore cancelled or incomplete place selection
      }
    };

    autocompleteEl.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(autocompleteEl);

    return () => {
      autocompleteEl.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib]);

  return (
    <div
      ref={containerRef}
      data-testid="place-autocomplete-container"
      className="place-autocomplete-host"
      aria-label="Search Dallas logistics hubs"
    />
  );
}
