import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { AuditSite } from '../types/geofencing';
import { AUSTIN_CENTER } from '../data/austinSeedData';

interface PlaceAutocompleteBoxProps {
  onPlaceSelected: (site: AuditSite) => void;
}

interface PlaceSelectEvent extends Event {
  placePrediction?: google.maps.places.PlacePrediction;
}

export function PlaceAutocompleteBox({ onPlaceSelected }: PlaceAutocompleteBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    const host = containerRef.current;
    if (!host || !placesLib) return;

    let element: google.maps.places.PlaceAutocompleteElement | null = null;
    try {
      element = new placesLib.PlaceAutocompleteElement({
        placeholder: 'Quick-add an Austin store via Autocomplete…',
        includedRegionCodes: ['us'],
        requestedLanguage: 'en-US',
        requestedRegion: 'us',
        locationBias: {
          center: AUSTIN_CENTER,
          radius: 15000,
        },
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      });
    } catch {
      return;
    }

    const handleSelect = async (evt: Event) => {
      const selectEvent = evt as PlaceSelectEvent;
      if (!selectEvent.placePrediction) return;

      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryTypeDisplayName',
          ],
        });

        if (!place.location) return;

        onPlaceSelectedRef.current({
          id: place.id,
          name: place.displayName || 'Austin Audit Site',
          address: place.formattedAddress || 'Austin, TX',
          primaryType: place.primaryTypeDisplayName ?? undefined,
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      } catch {
        // Ignore transient place fetch failures in UI
      }
    };

    element.addEventListener('gmp-select', handleSelect);
    host.replaceChildren(element);

    return () => {
      element?.removeEventListener('gmp-select', handleSelect);
      host.replaceChildren();
    };
  }, [placesLib]);

  return <div ref={containerRef} className="autocomplete-host" />;
}
