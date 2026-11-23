<script lang="ts">
  import { onMount } from 'svelte';
  import { ensureMapsLoaderConfigured, importLibrary } from '$lib/maps/loader';
  import type { ActiveLocation, BaseMapType, UnitsSystem } from '$lib/types/environmental';

  interface Props {
    activeLocation: ActiveLocation;
    unitsSystem: UnitsSystem;
    showAqiLayer: boolean;
    mapType: BaseMapType;
    onSelectLocation: (loc: ActiveLocation) => void;
    onResetPhoenix: () => void;
    onToggleUnits: () => void;
    onToggleAqiLayer: () => void;
    onToggleMapType: () => void;
  }

  let {
    activeLocation,
    unitsSystem,
    showAqiLayer,
    mapType,
    onSelectLocation,
    onResetPhoenix,
    onToggleUnits,
    onToggleAqiLayer,
    onToggleMapType
  }: Props = $props();

  let autocompleteHost: HTMLDivElement | undefined = $state();
  let autocompleteReady = $state(false);
  let hasApiKey = $state(true);

  onMount(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const configured = ensureMapsLoaderConfigured();
      if (!configured) {
        hasApiKey = false;
        return;
      }

      try {
        const placesLib = (await importLibrary('places')) as google.maps.PlacesLibrary;
        if (!autocompleteHost) return;

        const autocomplete = new placesLib.PlaceAutocompleteElement();
        autocomplete.setAttribute('placeholder', 'Search address, building, or city...');

        const handleSelect = async (event: Event) => {
          const selectEvent = event as unknown as {
            placePrediction?: google.maps.places.PlacePrediction;
          };
          const prediction = selectEvent.placePrediction;
          if (!prediction) return;

          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ['id', 'displayName', 'formattedAddress', 'location']
          });

          if (place.location) {
            onSelectLocation({
              name: place.displayName || 'Selected Place',
              address: place.formattedAddress || '',
              lat: place.location.lat(),
              lng: place.location.lng(),
              placeId: place.id ?? undefined,
              source: 'search'
            });
          }
        };

        autocomplete.addEventListener('gmp-select', handleSelect);
        autocompleteHost.replaceChildren(autocomplete);
        autocompleteReady = true;

        cleanup = () => {
          autocomplete.removeEventListener('gmp-select', handleSelect);
        };
      } catch {
        hasApiKey = false;
      }
    })();

    return () => {
      cleanup?.();
    };
  });
</script>

<header class="top-header">
  <div class="brand">
    <div class="brand-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </div>
    <div class="brand-text">
      <span class="brand-title">EcoPulse</span>
      <span class="brand-subtitle">Environmental &amp; Solar Intelligence</span>
    </div>
  </div>

  <div class="autocomplete-wrap" data-testid="places-autocomplete-container">
    <div bind:this={autocompleteHost}></div>
    {#if !autocompleteReady}
      <div class="autocomplete-fallback">
        {#if !hasApiKey}
          Set PUBLIC_GOOGLE_MAPS_API_KEY in .env to enable Places search
        {:else}
          Loading Places Autocomplete...
        {/if}
      </div>
    {/if}
  </div>

  <div class="header-controls">
    <div class="location-pill" data-testid="active-location-badge" title={`${activeLocation.name} (${activeLocation.lat.toFixed(4)}, ${activeLocation.lng.toFixed(4)})`}>
      <span>{activeLocation.name}</span>
      <span class="location-pill-coords">
        {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)}
      </span>
    </div>

    <button
      type="button"
      class="ctrl-btn"
      data-testid="reset-phoenix-btn"
      onclick={onResetPhoenix}
    >
      Phoenix Preset
    </button>

    <button
      type="button"
      class="ctrl-btn"
      data-testid="units-toggle-btn"
      onclick={onToggleUnits}
    >
      {unitsSystem === 'IMPERIAL' ? '°F · Imperial' : '°C · Metric'}
    </button>

    <button
      type="button"
      class="ctrl-btn"
      class:active={showAqiLayer}
      data-testid="aqi-layer-toggle"
      onclick={onToggleAqiLayer}
    >
      AQI Overlay: {showAqiLayer ? 'On' : 'Off'}
    </button>

    <button
      type="button"
      class="ctrl-btn"
      class:active-sky={mapType === 'hybrid'}
      data-testid="map-type-toggle"
      onclick={onToggleMapType}
    >
      {mapType === 'hybrid' ? 'Hybrid Satellite' : 'Roadmap'}
    </button>
  </div>
</header>
