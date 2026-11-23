<script lang="ts">
	import ListingDetailPanel from '$lib/components/ListingDetailPanel.svelte';
	import PropertyCard from '$lib/components/PropertyCard.svelte';
	import RealEstateMap from '$lib/components/RealEstateMap.svelte';
	import TopFilterBar from '$lib/components/TopFilterBar.svelte';
	import { SF_PROPERTIES } from '$lib/data/properties';
	import type {
		CommuteResult,
		FilterState,
		LatLngLiteral,
		NearbyAmenity,
		PropertyListing
	} from '$lib/types';

	let filters = $state<FilterState>({
		maxPrice: 0,
		minBeds: 0,
		propertyType: 'all',
		searchLabel: 'San Francisco, CA'
	});

	let polygonMatchingIds = $state<Set<string> | null>(null);
	let selectedProperty = $state<PropertyListing | null>(SF_PROPERTIES[0]);
	let hoveredPropertyId = $state<string | null>(null);
	let focusedAmenity = $state<NearbyAmenity | null>(null);
	let commuteResult = $state<CommuteResult | null>(null);
	let focusLocation = $state<{
		label: string;
		location: LatLngLiteral;
		viewport?: google.maps.LatLngBounds | null;
	} | null>(null);

	const filteredProperties = $derived.by(() => {
		return SF_PROPERTIES.filter((prop) => {
			if (filters.maxPrice > 0 && prop.price > filters.maxPrice) return false;
			if (filters.minBeds > 0 && prop.beds < filters.minBeds) return false;
			if (filters.propertyType !== 'all' && prop.propertyType !== filters.propertyType) return false;
			if (polygonMatchingIds !== null && !polygonMatchingIds.has(prop.id)) return false;
			return true;
		});
	});

	function handleSelectProperty(prop: PropertyListing) {
		selectedProperty = prop;
		focusedAmenity = null;
	}

	function handlePolygonFilterChange(ids: Set<string> | null) {
		polygonMatchingIds = ids;
		if (ids !== null && selectedProperty && !ids.has(selectedProperty.id)) {
			const nextFirst = filteredProperties[0] || null;
			selectedProperty = nextFirst;
		}
	}

	function handleResetAll() {
		filters = {
			maxPrice: 0,
			minBeds: 0,
			propertyType: 'all',
			searchLabel: 'San Francisco, CA'
		};
		polygonMatchingIds = null;
		focusedAmenity = null;
		commuteResult = null;
		if (!selectedProperty) {
			selectedProperty = SF_PROPERTIES[0];
		}
	}
</script>

<div class="app-shell">
	<TopFilterBar
		{filters}
		totalCount={filteredProperties.length}
		hasDrawnArea={polygonMatchingIds !== null}
		onFiltersChange={(next) => (filters = next)}
		onLocationFocus={(target) => (focusLocation = target)}
		onResetAll={handleResetAll}
	/>

	<main class="split-workspace">
		<RealEstateMap
			allProperties={SF_PROPERTIES}
			properties={filteredProperties}
			{selectedProperty}
			{hoveredPropertyId}
			{focusedAmenity}
			{commuteResult}
			{focusLocation}
			hasDrawnArea={polygonMatchingIds !== null}
			onSelectProperty={handleSelectProperty}
			onHoverProperty={(id) => (hoveredPropertyId = id)}
			onPolygonFilterChange={handlePolygonFilterChange}
		/>

		<aside class="left-column" aria-label="San Francisco Listings & Property Explorer">
			<div class="left-section-header">
				<h1>San Francisco Homes & Parcels</h1>
				{#if polygonMatchingIds !== null}
					<span class="area-filter-pill">Drawn Area Active</span>
				{/if}
			</div>

			{#if selectedProperty}
				<ListingDetailPanel
					property={selectedProperty}
					onClose={() => {
						selectedProperty = null;
						focusedAmenity = null;
						commuteResult = null;
					}}
					onFocusAmenity={(amenity) => (focusedAmenity = amenity)}
					onCommuteComputed={(result) => (commuteResult = result)}
				/>
			{/if}

			<div class="property-list" id="property-list" data-testid="property-list">
				{#if filteredProperties.length === 0}
					<div class="empty-list-state">
						<p>No properties match the active price, bedroom, type, or drawn area filters.</p>
						<button type="button" class="reset-btn" onclick={handleResetAll}>
							Reset All Filters
						</button>
					</div>
				{:else}
					{#each filteredProperties as property (property.id)}
						<PropertyCard
							{property}
							isSelected={selectedProperty?.id === property.id}
							isHovered={hoveredPropertyId === property.id}
							onSelect={handleSelectProperty}
							onHover={(id) => (hoveredPropertyId = id)}
						/>
					{/each}
				{/if}
			</div>
		</aside>
	</main>
</div>
