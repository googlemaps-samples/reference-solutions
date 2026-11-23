<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		NYC_BOUNDS_LITERAL,
		type AutocompleteOption,
		type OriginLocation,
		type TravelModeChoice
	} from '$lib/types';

	interface Props {
		searchQuery: string;
		suggestions: AutocompleteOption[];
		showDropdown: boolean;
		travelMode: TravelModeChoice;
		hasFastestBranch: boolean;
		isRouting: boolean;
		placesLibrary: google.maps.PlacesLibrary | null;
		onQueryInput: (value: string) => void;
		onSelectSuggestion: (option: AutocompleteOption) => void;
		onSubmitQuery: () => void;
		onTravelModeChange: (mode: TravelModeChoice) => void;
		onRouteToFastest: () => void;
		onNativePlaceSelected: (origin: OriginLocation) => void;
	}

	let {
		searchQuery,
		suggestions,
		showDropdown,
		travelMode,
		hasFastestBranch,
		isRouting,
		placesLibrary,
		onQueryInput,
		onSelectSuggestion,
		onSubmitQuery,
		onTravelModeChange,
		onRouteToFastest,
		onNativePlaceSelected
	}: Props = $props();

	let useNativeWidget = $state(false);
	let widgetContainer: HTMLDivElement | null = $state(null);
	let activeWidget: google.maps.places.PlaceAutocompleteElement | null = null;

	function handleFormSubmit(event: SubmitEvent) {
		event.preventDefault();
		onSubmitQuery();
	}

	function handleModeChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		onTravelModeChange(target.value as TravelModeChoice);
	}

	function toggleWidgetMode() {
		useNativeWidget = !useNativeWidget;
	}

	$effect(() => {
		if (!useNativeWidget || !widgetContainer || !placesLibrary) {
			if (activeWidget) {
				activeWidget.remove();
				activeWidget = null;
			}
			return;
		}

		const { PlaceAutocompleteElement } = placesLibrary;
		const element = new PlaceAutocompleteElement({
			locationBias: NYC_BOUNDS_LITERAL,
			includedRegionCodes: ['us']
		});
		element.style.width = '100%';

		const handleSelect = async (event: Event) => {
			const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
			if (!selectEvent.placePrediction) return;
			const place = selectEvent.placePrediction.toPlace();
			await place.fetchFields({
				fields: ['displayName', 'formattedAddress', 'location']
			});
			if (place.location) {
				onNativePlaceSelected({
					label: place.displayName ?? 'Selected NYC Origin',
					address: place.formattedAddress ?? place.displayName ?? 'New York, NY',
					lat: place.location.lat(),
					lng: place.location.lng()
				});
			}
		};

		element.addEventListener('gmp-select', handleSelect);
		widgetContainer.replaceChildren(element);
		activeWidget = element;

		return () => {
			element.removeEventListener('gmp-select', handleSelect);
			element.remove();
			activeWidget = null;
		};
	});

	onDestroy(() => {
		if (activeWidget) {
			activeWidget.remove();
			activeWidget = null;
		}
	});
</script>

<header class="app-header" data-testid="app-header">
	<div class="brand-group">
		<div class="brand-logo" aria-hidden="true">NY</div>
		<div class="brand-text">
			<h1>MetroHub NYC Locator</h1>
			<span>Stores, Express Kiosks &amp; 24/7 ATMs</span>
		</div>
	</div>

	<div class="header-controls">
		<div class="search-wrapper">
			{#if useNativeWidget}
				<div class="widget-mount" bind:this={widgetContainer}></div>
			{:else}
				<form class="search-input-row" onsubmit={handleFormSubmit}>
					<input
						data-testid="origin-search-input"
						class="search-input"
						type="text"
						value={searchQuery}
						oninput={(e) => onQueryInput((e.currentTarget as HTMLInputElement).value)}
						placeholder="Search NYC origin (e.g. Times Square, SoHo)..."
						aria-label="Search NYC starting location"
						autocomplete="off"
					/>
					<button type="submit" class="search-action-btn">Set Origin</button>
				</form>

				{#if showDropdown && suggestions.length > 0}
					<div
						class="autocomplete-dropdown"
						data-testid="autocomplete-dropdown"
						role="listbox"
						aria-label="Origin autocomplete suggestions"
					>
						{#each suggestions as option (option.id)}
							<button
								type="button"
								class="autocomplete-item"
								role="option"
								aria-selected="false"
								onclick={() => onSelectSuggestion(option)}
							>
								<span class="autocomplete-main">{option.mainText}</span>
								<span class="autocomplete-secondary">{option.secondaryText}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		{#if placesLibrary}
			<button
				type="button"
				class="widget-toggle-btn"
				class:active={useNativeWidget}
				onclick={toggleWidgetMode}
				title="Switch between custom Places Autocomplete and Google PlaceAutocompleteElement widget"
			>
				{useNativeWidget ? 'Standard Input' : 'GMP Widget'}
			</button>
		{/if}

		<select
			data-testid="travel-mode-select"
			class="travel-mode-select"
			value={travelMode}
			onchange={handleModeChange}
			aria-label="Select travel mode"
		>
			<option value="DRIVE">Drive</option>
			<option value="WALK">Walk</option>
			<option value="TRANSIT">Transit</option>
		</select>

		<button
			type="button"
			data-testid="route-fastest-button"
			class="route-fastest-btn"
			disabled={!hasFastestBranch || isRouting}
			onclick={onRouteToFastest}
		>
			{isRouting ? 'Routing...' : 'Route to Fastest'}
		</button>
	</div>
</header>
