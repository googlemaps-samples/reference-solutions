'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import { DALLAS_CENTER } from '@/lib/fleet-data';
import type { LogisticsHub } from '@/lib/types';

interface PlaceAutocompleteBoxProps {
  onHubSelected: (hub: LogisticsHub) => void;
  hasApiKey: boolean;
}

export function PlaceAutocompleteBox({
  onHubSelected,
  hasApiKey,
}: PlaceAutocompleteBoxProps) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onHubSelectedRef = useRef(onHubSelected);
  onHubSelectedRef.current = onHubSelected;

  useEffect(() => {
    const host = containerRef.current;
    if (!hasApiKey || !placesLibrary || !host) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        center: DALLAS_CENTER,
        radius: 45000,
      } as unknown as google.maps.places.LocationBias,
    });

    autocomplete.setAttribute(
      'placeholder',
      'Add Dallas hub via Places Autocomplete...'
    );

    host.replaceChildren(autocomplete);

    const handleSelect = (event: Event) => {
      const selectEvent =
        event as unknown as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent?.placePrediction;
      if (!prediction) return;

      const place = prediction.toPlace();
      void place
        .fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
          ],
        })
        .then(() => {
          if (!place.location) return;
          const lat = place.location.lat();
          const lng = place.location.lng();
          if (place.viewport && map) {
            map.fitBounds(place.viewport);
          } else if (map) {
            map.panTo({ lat, lng });
          }

          onHubSelectedRef.current({
            id: place.id || `auto-${Date.now()}`,
            placeId: place.id,
            name: place.displayName || 'Selected Dallas Hub',
            address: place.formattedAddress || 'Dallas, TX',
            location: { lat, lng },
            role: 'dropoff',
            source: 'autocomplete',
          });
        })
        .catch(() => {
          // Handled silently to keep UI responsive without console spam
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      host.replaceChildren();
    };
  }, [hasApiKey, placesLibrary, map]);

  if (!hasApiKey) {
    return (
      <div
        className="autocomplete-shell"
        data-testid="place-autocomplete-container"
      >
        <div className="autocomplete-fallback">
          <Search size={14} />
          <span>Add API key for Places search</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="autocomplete-shell"
      data-testid="place-autocomplete-container"
    >
      <div ref={containerRef} className="autocomplete-host" />
    </div>
  );
}
