import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { PlacePoint } from '../types/routing';
import { DENVER_BOULDER_BOUNDS, toLatLngLiteral } from '../utils/geo';

interface PlacePickerProps {
  id: string;
  label: string;
  badgeText: string;
  badgeClassName: string;
  placeholder: string;
  selectedPlace: PlacePoint | null;
  isResolvingSeed: boolean;
  onPlaceSelect: (place: PlacePoint) => void;
}

export function PlacePicker({
  id,
  label,
  badgeText,
  badgeClassName,
  placeholder,
  selectedPlace,
  isResolvingSeed,
  onPlaceSelect,
}: PlacePickerProps) {
  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onPlaceSelect);
  onSelectRef.current = onPlaceSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLib || !container) return;

    const autocompleteEl = new placesLib.PlaceAutocompleteElement({
      locationBias: DENVER_BOULDER_BOUNDS,
      includedRegionCodes: ['us'],
    });
    autocompleteEl.id = id;
    autocompleteEl.setAttribute('aria-label', label);
    // Assign placeholder directly on DOM element rather than React JSX props
    (autocompleteEl as unknown as { placeholder?: string }).placeholder = placeholder;

    const handleSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;

      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        const loc = toLatLngLiteral(place.location);
        if (!loc) return;

        onSelectRef.current({
          id: place.id || `${loc.lat},${loc.lng}`,
          name: place.displayName || place.formattedAddress || 'Selected Location',
          formattedAddress: place.formattedAddress || '',
          location: loc,
        });
      } catch (error) {
        console.error(`Failed to resolve selected place for ${id}:`, error);
      }
    };

    autocompleteEl.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(autocompleteEl);

    return () => {
      autocompleteEl.removeEventListener('gmp-select', handleSelect);
      if (container.contains(autocompleteEl)) {
        container.removeChild(autocompleteEl);
      }
    };
  }, [placesLib, id, label, placeholder]);

  return (
    <div className="place-picker">
      <div className="place-picker-header">
        <span className={`endpoint-badge ${badgeClassName}`}>{badgeText}</span>
        <span className="place-picker-label">{label}</span>
      </div>
      <div ref={containerRef} className="autocomplete-host" />
      <div className="active-place-chip">
        {isResolvingSeed && !selectedPlace ? (
          <span className="place-chip-loading">Resolving via Places API (New)...</span>
        ) : selectedPlace ? (
          <>
            <span className="place-chip-name">{selectedPlace.name}</span>
            {selectedPlace.formattedAddress && (
              <span className="place-chip-address">{selectedPlace.formattedAddress}</span>
            )}
          </>
        ) : (
          <span className="place-chip-loading">Search Denver / Boulder locations</span>
        )}
      </div>
    </div>
  );
}
