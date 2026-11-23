<script lang="ts">
	import { onMount } from 'svelte';
	import { isApiKeyConfigured, loadGmpLibraries } from '$lib/maps/loader';
	import type { FilterState, LatLngLiteral, PropertyType } from '$lib/types';

	interface Props {
		filters: FilterState;
		totalCount: number;
		hasDrawnArea: boolean;
		onFiltersChange: (next: FilterState) => void;
		onLocationFocus: (target: {
			label: string;
			location: LatLngLiteral;
			viewport?: google.maps.LatLngBounds | null;
		}) => void;
		onResetAll: () => void;
	}

	let {
		filters,
		totalCount,
		hasDrawnArea,
		onFiltersChange,
		onLocationFocus,
		onResetAll
	}: Props = $props();

	let autocompleteHost: HTMLDivElement | undefined = $state();
	let fallbackQuery = $state('San Francisco, CA');
	let autocompleteMounted = $state(false);
	let searchBusy = $state(false);

	const propertyTypes: Array<{ value: PropertyType | 'all'; label: string }> = [
		{ value: 'all', label: 'All Types' },
		{ value: 'Single Family', label: 'Single Family' },
		{ value: 'Condo', label: 'Condo' },
		{ value: 'Townhouse', label: 'Townhouse' },
		{ value: 'Victorian', label: 'Victorian' },
		{ value: 'Loft', label: 'Loft' }
	];

	onMount(() => {
		let active = true;
		let element: google.maps.places.PlaceAutocompleteElement | null = null;

		async function initAutocomplete() {
			if (!isApiKeyConfigured() || !autocompleteHost) return;
			try {
				const { places } = await loadGmpLibraries();
				if (!active || !autocompleteHost) return;

				element = new places.PlaceAutocompleteElement({
					includedRegionCodes: ['us'],
					locationBias: {
						center: { lat: 37.7749, lng: -122.4194 },
						radius: 25000
					}
				});
				element.className = 'gmp-autocomplete-widget';
				element.setAttribute('aria-label', 'Search San Francisco neighborhood or address');

				element.addEventListener('gmp-select', async (ev) => {
					const selectEvent = ev as google.maps.places.PlacePredictionSelectEvent;
					const prediction = selectEvent.placePrediction;
					if (!prediction) return;
					try {
						const place = prediction.toPlace();
						await place.fetchFields({
							fields: ['displayName', 'formattedAddress', 'location', 'viewport']
						});
						if (place.location) {
							const label = place.displayName || place.formattedAddress || 'San Francisco';
							onFiltersChange({ ...filters, searchLabel: label });
							onLocationFocus({
								label,
								location: { lat: place.location.lat(), lng: place.location.lng() },
								viewport: place.viewport
							});
						}
					} catch {
						// Ignore transient fetchFields cancellation
					}
				});

				autocompleteHost.replaceChildren(element);
				autocompleteMounted = true;
			} catch {
				autocompleteMounted = false;
			}
		}

		initAutocomplete();

		return () => {
			active = false;
			if (element && element.parentNode) {
				element.parentNode.removeChild(element);
			}
		};
	});

	async function handleFallbackSubmit(e: Event) {
		e.preventDefault();
		const q = fallbackQuery.trim();
		if (!q) return;
		onFiltersChange({ ...filters, searchLabel: q });

		if (!isApiKeyConfigured()) return;
		searchBusy = true;
		try {
			const res = await fetch('/api/places/search-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ textQuery: q, lat: 37.7749, lng: -122.4194 })
			});
			if (res.ok) {
				const data = (await res.json()) as {
					places?: Array<{
						displayName?: { text?: string };
						formattedAddress?: string;
						location?: { latitude?: number; longitude?: number };
					}>;
				};
				const first = data.places?.[0];
				if (
					first &&
					typeof first.location?.latitude === 'number' &&
					typeof first.location?.longitude === 'number'
				) {
					onLocationFocus({
						label: first.displayName?.text || first.formattedAddress || q,
						location: { lat: first.location.latitude, lng: first.location.longitude }
					});
				}
			}
		} catch {
			// Keep local text filter active
		} finally {
			searchBusy = false;
		}
	}
</script>

<header class="top-bar">
	<div class="brand">
		<div class="brand-mark" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 10.5L12 3l9 7.5" />
				<path d="M5 9.5V20h14V9.5" />
				<path d="M9.5 20v-6h5v6" />
			</svg>
		</div>
		<div class="brand-copy">
			<span class="brand-name">BayParcel</span>
			<span class="brand-sub">San Francisco Explorer</span>
		</div>
	</div>

	<div class="controls-row">
		<div
			class="autocomplete-shell"
			id="location-search-input"
			data-testid="location-search-input"
			bind:this={autocompleteHost}
		>
			{#if !autocompleteMounted}
				<form class="fallback-search-form" onsubmit={handleFallbackSubmit}>
					<input
						type="text"
						class="fallback-search-input"
						bind:value={fallbackQuery}
						placeholder="Search SF neighborhood or address..."
						aria-label="Search San Francisco neighborhood or address"
					/>
					{#if searchBusy}
						<span class="search-spinner" aria-hidden="true"></span>
					{/if}
				</form>
			{/if}
		</div>

		<label class="filter-field">
			<span class="sr-only">Max Price</span>
			<select
				id="filter-max-price"
				data-testid="filter-max-price"
				aria-label="Maximum Price"
				value={String(filters.maxPrice)}
				onchange={(e) =>
					onFiltersChange({
						...filters,
						maxPrice: Number((e.currentTarget as HTMLSelectElement).value)
					})}
			>
				<option value="0">Any Price</option>
				<option value="1500000">Up to $1.5M</option>
				<option value="2000000">Up to $2.0M</option>
				<option value="2500000">Up to $2.5M</option>
				<option value="3000000">Up to $3.0M</option>
				<option value="4000000">Up to $4.0M</option>
			</select>
		</label>

		<label class="filter-field">
			<span class="sr-only">Min Beds</span>
			<select
				id="filter-min-beds"
				data-testid="filter-min-beds"
				aria-label="Minimum Bedrooms"
				value={String(filters.minBeds)}
				onchange={(e) =>
					onFiltersChange({
						...filters,
						minBeds: Number((e.currentTarget as HTMLSelectElement).value)
					})}
			>
				<option value="0">Any Beds</option>
				<option value="1">1+ Beds</option>
				<option value="2">2+ Beds</option>
				<option value="3">3+ Beds</option>
				<option value="4">4+ Beds</option>
			</select>
		</label>

		<label class="filter-field">
			<span class="sr-only">Property Type</span>
			<select
				id="filter-property-type"
				data-testid="filter-property-type"
				aria-label="Property Type"
				value={filters.propertyType}
				onchange={(e) =>
					onFiltersChange({
						...filters,
						propertyType: (e.currentTarget as HTMLSelectElement).value as PropertyType | 'all'
					})}
			>
				{#each propertyTypes as pt}
					<option value={pt.value}>{pt.label}</option>
				{/each}
			</select>
		</label>

		{#if filters.maxPrice > 0 || filters.minBeds > 0 || filters.propertyType !== 'all' || hasDrawnArea}
			<button type="button" class="reset-btn" onclick={onResetAll}>Reset</button>
		{/if}
	</div>

	<div class="results-badge" id="results-count" data-testid="results-count">
		<span class="count-num">{totalCount}</span>
		<span class="count-label">{totalCount === 1 ? 'listing' : 'listings'}{hasDrawnArea ? ' in area' : ''}</span>
	</div>
</header>
