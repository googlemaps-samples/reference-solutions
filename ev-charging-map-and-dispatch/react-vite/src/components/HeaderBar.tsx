import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Crosshair, MapPin, Navigation, Wrench, Zap } from 'lucide-react';
import type { CategoryFilter, LatLngLiteral, RadiusKm } from '../types/dispatch';

interface HeaderBarProps {
  driverAddress: string;
  isGeocoding: boolean;
  categoryFilter: CategoryFilter;
  radiusKm: RadiusKm;
  onCategoryChange: (category: CategoryFilter) => void;
  onRadiusChange: (radius: RadiusKm) => void;
  onRelocateDriver: (
    location: LatLngLiteral,
    knownAddress?: string,
    viewport?: google.maps.LatLngBounds | null,
  ) => void;
  onUseMapCenter: () => void;
}

const SEATTLE_CENTER: LatLngLiteral = { lat: 47.6062, lng: -122.3321 };

export function HeaderBar({
  driverAddress,
  isGeocoding,
  categoryFilter,
  radiusKm,
  onCategoryChange,
  onRadiusChange,
  onRelocateDriver,
  onUseMapCenter,
}: HeaderBarProps) {
  const placesLib = useMapsLibrary('places');
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
  const relocateRef = useRef(onRelocateDriver);
  relocateRef.current = onRelocateDriver;

  useEffect(() => {
    const container = autocompleteHostRef.current;
    if (!placesLib || !container) return;

    const autocomplete = new placesLib.PlaceAutocompleteElement({
      locationBias: {
        center: SEATTLE_CENTER,
        radius: 50000,
      },
      includedRegionCodes: ['us'],
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });
    autocomplete.placeholder = 'Search Seattle address or landmark...';
    autocomplete.className = 'gmp-autocomplete-widget';

    const handleSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;

      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        });

        if (place.location) {
          const nextLocation: LatLngLiteral = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          const addressLabel =
            place.formattedAddress ?? place.displayName ?? undefined;
          relocateRef.current(
            nextLocation,
            addressLabel,
            place.viewport ?? null,
          );
        }
      } catch (err) {
        console.warn('Autocomplete place fetchFields failed:', err);
      }
    };

    autocomplete.addEventListener('gmp-select', handleSelect);
    container.replaceChildren(autocomplete);

    return () => {
      autocomplete.removeEventListener('gmp-select', handleSelect);
      container.replaceChildren();
    };
  }, [placesLib]);

  const radiusOptions: RadiusKm[] = [5, 10, 15];

  return (
    <header className="dispatch-header">
      <div className="header-brand-row">
        <div className="brand-identity">
          <div className="brand-icon" aria-hidden="true">
            <Navigation size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="brand-title">Seattle EV &amp; Roadside Dispatch</h1>
            <p className="brand-subtitle">
              Live Fast-Charging &amp; Auto Service Locator
            </p>
          </div>
        </div>

        <div className="autocomplete-group">
          <div
            id="autocomplete-container"
            data-testid="autocomplete-container"
            ref={autocompleteHostRef}
            className="autocomplete-host"
          />
          <button
            id="use-map-center-btn"
            data-testid="use-map-center-btn"
            type="button"
            className="btn-secondary-compact"
            onClick={onUseMapCenter}
            title="Move breakdown pin to the current map center"
          >
            <Crosshair size={15} />
            <span>Use Map Center</span>
          </button>
        </div>

        <div
          id="driver-address-badge"
          data-testid="driver-address-badge"
          className="driver-address-pill"
          title={`Driver Breakdown Location: ${driverAddress}`}
        >
          <MapPin size={15} className="pin-icon" />
          <span className="address-label">
            {isGeocoding ? 'Resolving address...' : driverAddress}
          </span>
        </div>
      </div>

      <div className="header-controls-row">
        <div className="filter-group" role="group" aria-label="Service category filter">
          <button
            id="category-filter-all"
            data-testid="category-filter-all"
            type="button"
            className={`filter-pill ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            All Services
          </button>
          <button
            id="category-filter-ev"
            data-testid="category-filter-ev"
            type="button"
            className={`filter-pill filter-pill-ev ${
              categoryFilter === 'ev_charging' ? 'active' : ''
            }`}
            onClick={() => onCategoryChange('ev_charging')}
          >
            <Zap size={14} />
            <span>EV Fast Charging</span>
          </button>
          <button
            id="category-filter-repair"
            data-testid="category-filter-repair"
            type="button"
            className={`filter-pill filter-pill-repair ${
              categoryFilter === 'auto_repair' ? 'active' : ''
            }`}
            onClick={() => onCategoryChange('auto_repair')}
          >
            <Wrench size={14} />
            <span>Auto Repair</span>
          </button>
        </div>

        <div
          id="radius-select"
          data-testid="radius-select"
          className="radius-group"
          role="group"
          aria-label="Search radius"
        >
          <span className="radius-label">Radius:</span>
          {radiusOptions.map((km) => (
            <button
              key={km}
              id={`radius-${km}km`}
              data-testid={`radius-${km}km`}
              type="button"
              className={`radius-pill ${radiusKm === km ? 'active' : ''}`}
              onClick={() => onRadiusChange(km)}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
