<script lang="ts">
  export interface AutocompleteSuggestionItem {
    placeId: string;
    mainText: string;
    secondaryText: string;
    fullText: string;
  }

  interface Props {
    searchQuery: string;
    isSearching: boolean;
    suggestions: AutocompleteSuggestionItem[];
    showSuggestions: boolean;
    heading: number;
    tilt: number;
    range: number;
    onSearchQueryChange: (value: string) => void;
    onSearchSubmit: (query: string) => void;
    onSelectSuggestion: (item: AutocompleteSuggestionItem) => void;
    onAutocompleteMount: (hostEl: HTMLDivElement | null) => void;
  }

  let {
    searchQuery,
    isSearching,
    suggestions,
    showSuggestions,
    heading,
    tilt,
    range,
    onSearchQueryChange,
    onSearchSubmit,
    onSelectSuggestion,
    onAutocompleteMount
  }: Props = $props();

  let gmpHostEl: HTMLDivElement | null = $state(null);

  $effect(() => {
    onAutocompleteMount(gmpHostEl);
  });

  function handleFormSubmit(event: SubmitEvent) {
    event.preventDefault();
    onSearchSubmit(searchQuery);
  }
</script>

<header class="top-header">
  <div class="brand-block">
    <div class="brand-badge" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M3 20h18L14 6l-4 7-3-4-4 11z" />
      </svg>
    </div>
    <div class="brand-titles">
      <h1>Lake Tahoe 3D Trail Explorer</h1>
      <p>Photorealistic 3D Terrain &bull; Emerald Bay &amp; Rubicon Ridge</p>
    </div>
  </div>

  <div class="search-cluster">
    <form class="search-form" onsubmit={handleFormSubmit} autocomplete="off">
      <div class="search-input-wrap">
        <span class="search-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          class="search-input"
          data-testid="landmark-search-input"
          placeholder="Search Lake Tahoe landmark (e.g. Vikingsholm, Mt Tallac)..."
          value={searchQuery}
          oninput={(e) => onSearchQueryChange((e.currentTarget as HTMLInputElement).value)}
          aria-label="Search Lake Tahoe landmark"
        />
        {#if showSuggestions && suggestions.length > 0}
          <div class="autocomplete-dropdown" role="listbox" aria-label="Landmark suggestions">
            {#each suggestions as item (item.placeId)}
              <button
                type="button"
                class="autocomplete-item"
                onclick={() => onSelectSuggestion(item)}
              >
                <span class="autocomplete-main">{item.mainText}</span>
                {#if item.secondaryText}
                  <span class="autocomplete-sub">{item.secondaryText}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button
        type="submit"
        class="search-submit-btn"
        data-testid="landmark-search-submit"
        disabled={isSearching || !searchQuery.trim()}
      >
        {isSearching ? 'Flying...' : 'Fly To'}
      </button>
    </form>

    <div
      class="gmp-autocomplete-slot"
      bind:this={gmpHostEl}
      title="Google Places Autocomplete"
    ></div>
  </div>

  <div class="telemetry-badge" data-testid="camera-telemetry-badge" aria-label="3D Camera Telemetry">
    <div class="telemetry-item">
      <span class="telemetry-label">HDG</span>
      <span class="telemetry-value">{Math.round(((heading % 360) + 360) % 360)}&deg;</span>
    </div>
    <div class="telemetry-item">
      <span class="telemetry-label">TILT</span>
      <span class="telemetry-value">{Math.round(tilt)}&deg;</span>
    </div>
    <div class="telemetry-item">
      <span class="telemetry-label">RNG</span>
      <span class="telemetry-value">{Math.round(range)}m</span>
    </div>
  </div>
</header>
