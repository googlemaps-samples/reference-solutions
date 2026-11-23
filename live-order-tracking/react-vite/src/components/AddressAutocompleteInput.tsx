import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { CHICAGO_LOCATION_BIAS_BOUNDS } from '../constants/chicago';

interface AddressAutocompleteInputProps {
  value: string;
  onInputChange: (nextAddress: string) => void;
  onPlaceSelected: (
    formattedAddress: string,
    autocompleteEl: google.maps.places.PlaceAutocompleteElement | null
  ) => void;
  onElementReady?: (
    el: google.maps.places.PlaceAutocompleteElement | null
  ) => void;
}

export function AddressAutocompleteInput({
  value,
  onInputChange,
  onPlaceSelected,
  onElementReady,
}: AddressAutocompleteInputProps) {
  const placesLibrary = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(
    null
  );
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onElementReadyRef = useRef(onElementReady);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    onElementReadyRef.current = onElementReady;
  }, [onElementReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!placesLibrary || !container) return;

    const autocomplete = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: CHICAGO_LOCATION_BIAS_BOUNDS,
      placeholder: 'Search Chicago delivery address...',
    });

    autocomplete.id = 'checkout-address-autocomplete';
    autocomplete.setAttribute('data-testid', 'checkout-address-autocomplete');
    autocomplete.internalUsageAttributionIds = ['gmp_git_agentsamples_v1.0.0'];
    autocomplete.style.width = '100%';
    autocomplete.style.display = 'block';

    elementRef.current = autocomplete;
    onElementReadyRef.current?.(autocomplete);

    container.replaceChildren(autocomplete);

    const handleSelect = (e: Event) => {
      const event = e as google.maps.places.PlacePredictionSelectEvent;
      if (!event.placePrediction) return;

      const place = event.placePrediction.toPlace();
      void place
        .fetchFields({
          fields: ['formattedAddress', 'displayName', 'location', 'id'],
        })
        .then(() => {
          const resolvedAddress =
            place.formattedAddress || place.displayName || '';
          if (resolvedAddress) {
            onPlaceSelectedRef.current(resolvedAddress, autocomplete);
          }
        })
        .catch(() => {
          // Non-fatal; user can still submit manual text
        });
    };

    autocomplete.addEventListener('gmp-select', handleSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      elementRef.current = null;
      onElementReadyRef.current?.(null);
      container.replaceChildren();
    };
  }, [placesLibrary]);

  return (
    <div className="autocomplete-stack">
      <div
        ref={containerRef}
        className="gmp-autocomplete-host"
        aria-label="Places Autocomplete street search"
      />
      <label className="field-label" htmlFor="manual-address-input">
        Confirmed / Editable Delivery Address
      </label>
      <input
        id="manual-address-input"
        data-testid="manual-address-input"
        type="text"
        className="text-input"
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="e.g. 401 N Michigan Ave, Chicago, IL 60611"
      />
    </div>
  );
}
