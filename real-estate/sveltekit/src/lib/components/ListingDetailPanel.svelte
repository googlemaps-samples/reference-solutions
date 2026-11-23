<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		WORKPLACE_PRESETS,
		formatDistance,
		formatPriceFull
	} from '$lib/data/properties';
	import { isApiKeyConfigured, loadGmpLibraries } from '$lib/maps/loader';
	import {
		calculateWorkplaceCommute,
		fetchNearbyAmenities,
		resolveWorkplaceQuery
	} from '$lib/maps/services';
	import type {
		AmenityCategory,
		CommuteResult,
		LatLngLiteral,
		NearbyAmenity,
		PropertyListing
	} from '$lib/types';

	interface Props {
		property: PropertyListing;
		onClose: () => void;
		onFocusAmenity: (amenity: NearbyAmenity) => void;
		onCommuteComputed: (result: CommuteResult | null) => void;
	}

	let { property, onClose, onFocusAmenity, onCommuteComputed }: Props = $props();

	let streetViewEl: HTMLDivElement | undefined = $state();
	let streetViewStatus = $state<'loading' | 'ready' | 'unavailable' | 'no-key'>('loading');
	let panorama: google.maps.StreetViewPanorama | null = null;
	let streetViewService: google.maps.StreetViewService | null = null;
	let mapsReady = $state(false);

	let activeAmenityTab: AmenityCategory = $state('all');
	let amenities = $state<NearbyAmenity[]>([]);
	let amenitiesLoading = $state(false);
	let amenitiesError = $state<string | null>(null);

	let workplaceQuery = $state('415 Mission St, San Francisco, CA');
	let commuteLoading = $state(false);
	let commuteError = $state<string | null>(null);
	let commuteResult = $state<CommuteResult | null>(null);

	let lastLoadedPropertyId = '';

	const filteredAmenities = $derived.by(() => {
		if (activeAmenityTab === 'all') return amenities;
		return amenities.filter((item) => item.category === activeAmenityTab);
	});

	const categoryCounts = $derived.by(() => ({
		all: amenities.length,
		schools: amenities.filter((a) => a.category === 'schools').length,
		groceries: amenities.filter((a) => a.category === 'groceries').length,
		transit: amenities.filter((a) => a.category === 'transit').length
	}));

	async function initStreetViewForProperty(target: PropertyListing) {
		if (!isApiKeyConfigured()) {
			streetViewStatus = 'no-key';
			return;
		}
		if (!streetViewEl) return;

		streetViewStatus = 'loading';
		try {
			const { streetView } = await loadGmpLibraries();
			if (!streetViewEl) return;

			if (!streetViewService) {
				streetViewService = new streetView.StreetViewService();
			}

			const pos = { lat: target.lat, lng: target.lng };
			const response = await streetViewService.getPanorama({
				location: pos,
				radius: 120,
				preference: google.maps.StreetViewPreference.NEAREST
			});

			const panoLocation = response.data.location?.latLng || pos;
			if (!panorama) {
				panorama = new streetView.StreetViewPanorama(streetViewEl, {
					position: panoLocation,
					pov: {
						heading: target.streetViewHeading,
						pitch: target.streetViewPitch
					},
					zoom: 1,
					addressControl: false,
					fullscreenControl: true,
					motionTracking: false
				});
			} else {
				panorama.setPosition(panoLocation);
				panorama.setPov({
					heading: target.streetViewHeading,
					pitch: target.streetViewPitch
				});
			}
			streetViewStatus = 'ready';
		} catch {
			streetViewStatus = 'unavailable';
		}
	}

	async function loadAmenitiesForProperty(target: PropertyListing) {
		if (!isApiKeyConfigured()) {
			amenities = [];
			amenitiesError = 'Add PUBLIC_GOOGLE_MAPS_API_KEY to load live 5km Places API (New) amenities.';
			return;
		}

		amenitiesLoading = true;
		amenitiesError = null;
		try {
			const results = await fetchNearbyAmenities({ lat: target.lat, lng: target.lng }, 5000);
			if (property.id === target.id) {
				amenities = results;
			}
		} catch (err) {
			if (property.id === target.id) {
				amenitiesError =
					err instanceof Error ? err.message : 'Unable to fetch nearby places right now.';
			}
		} finally {
			if (property.id === target.id) {
				amenitiesLoading = false;
			}
		}
	}

	async function runCommuteCalculation(presetLocation?: LatLngLiteral, presetLabel?: string) {
		if (!isApiKeyConfigured()) {
			commuteError = 'Add PUBLIC_GOOGLE_MAPS_API_KEY to compute live Driving & Transit ETAs.';
			return;
		}
		const query = (presetLabel || workplaceQuery).trim();
		if (!query) {
			commuteError = 'Enter a workplace address or select a preset destination.';
			return;
		}

		commuteLoading = true;
		commuteError = null;
		try {
			const resolved = presetLocation
				? { label: query, location: presetLocation }
				: await resolveWorkplaceQuery(query);

			const result = await calculateWorkplaceCommute(
				{ lat: property.lat, lng: property.lng },
				resolved.location,
				resolved.label
			);

			commuteResult = result;
			onCommuteComputed(result);
		} catch (err) {
			commuteError =
				err instanceof Error ? err.message : 'Unable to calculate commute right now.';
			commuteResult = null;
			onCommuteComputed(null);
		} finally {
			commuteLoading = false;
		}
	}

	function handleCommuteSubmit(e: Event) {
		e.preventDefault();
		runCommuteCalculation();
	}

	function selectPreset(preset: (typeof WORKPLACE_PRESETS)[number]) {
		workplaceQuery = preset.address;
		runCommuteCalculation({ lat: preset.lat, lng: preset.lng }, preset.label);
	}

	onMount(() => {
		mapsReady = true;
	});

	$effect(() => {
		if (!mapsReady) return;
		const currentProp = property;
		if (currentProp.id !== lastLoadedPropertyId) {
			lastLoadedPropertyId = currentProp.id;
			commuteResult = null;
			commuteError = null;
			onCommuteComputed(null);
			initStreetViewForProperty(currentProp);
			loadAmenitiesForProperty(currentProp);
		}
	});

	onDestroy(() => {
		panorama = null;
		streetViewService = null;
	});
</script>

<section
	class="detail-panel"
	id="listing-detail-panel"
	data-testid="listing-detail-panel"
	aria-label="Selected Listing Details"
>
	<div class="detail-top-bar">
		<button type="button" class="back-btn" onclick={onClose}>
			← Back to all listings
		</button>
		<span class="parcel-pill">Parcel {property.parcel.apn}</span>
	</div>

	<div class="detail-header">
		<div class="detail-price-row">
			<h2 class="detail-price">{formatPriceFull(property.price)}</h2>
			<span class="detail-type-badge">{property.propertyType}</span>
		</div>
		<p class="detail-address">
			{property.address}, {property.neighborhood} · {property.city}, {property.state} {property.zip}
		</p>
		<div class="detail-metrics">
			<span><strong>{property.beds}</strong> Beds</span>
			<span><strong>{property.baths}</strong> Baths</span>
			<span><strong>{property.sqft.toLocaleString()}</strong> Sq Ft</span>
			<span><strong>{property.parcel.lotSqFt.toLocaleString()}</strong> Lot Sq Ft</span>
		</div>
		<p class="detail-desc">{property.description}</p>
	</div>

	<div class="detail-section">
		<div class="section-heading">
			<h3>Cadastral Parcel & Lot Geometry</h3>
			<span class="section-tag">Outlined on map</span>
		</div>
		<div class="parcel-grid">
			<div class="parcel-cell">
				<span class="cell-label">Assessor APN</span>
				<span class="cell-value">{property.parcel.apn}</span>
			</div>
			<div class="parcel-cell">
				<span class="cell-label">Lot Area</span>
				<span class="cell-value">{property.parcel.lotSqFt.toLocaleString()} sq ft</span>
			</div>
			<div class="parcel-cell">
				<span class="cell-label">Dimensions</span>
				<span class="cell-value">{property.parcel.lotDimensions}</span>
			</div>
			<div class="parcel-cell">
				<span class="cell-label">Zoning / Built</span>
				<span class="cell-value">{property.parcel.zoning.split(' ')[0]} · {property.parcel.yearBuilt}</span>
			</div>
		</div>
	</div>

	<div class="detail-section">
		<div class="section-heading">
			<h3>Street View Neighborhood Preview</h3>
			<span class="section-tag">360° Interactive</span>
		</div>
		<div class="street-view-wrap">
			<div
				class="street-view-container"
				id="street-view-container"
				data-testid="street-view-container"
				bind:this={streetViewEl}
			></div>
			{#if streetViewStatus !== 'ready'}
				<div class="street-view-fallback">
					{#if streetViewStatus === 'loading'}
						<span>Loading Street View panorama…</span>
					{:else if streetViewStatus === 'no-key'}
						<span>Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> to preview live Street View imagery.</span>
					{:else}
						<span>Street View panorama unavailable for this exact parcel coordinate.</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div
		class="detail-section"
		id="nearby-amenities-panel"
		data-testid="nearby-amenities-panel"
	>
		<div class="section-heading">
			<h3>Nearby Amenities (5 km)</h3>
			<span class="section-tag">Places API (New)</span>
		</div>

		<div class="amenity-tabs" role="tablist" aria-label="Nearby amenity categories">
			<button
				type="button"
				role="tab"
				id="amenity-tab-all"
				data-testid="amenity-tab-all"
				class="amenity-tab"
				class:active={activeAmenityTab === 'all'}
				aria-selected={activeAmenityTab === 'all'}
				onclick={() => (activeAmenityTab = 'all')}
			>
				All ({categoryCounts.all})
			</button>
			<button
				type="button"
				role="tab"
				id="amenity-tab-schools"
				data-testid="amenity-tab-schools"
				class="amenity-tab"
				class:active={activeAmenityTab === 'schools'}
				aria-selected={activeAmenityTab === 'schools'}
				onclick={() => (activeAmenityTab = 'schools')}
			>
				Schools ({categoryCounts.schools})
			</button>
			<button
				type="button"
				role="tab"
				id="amenity-tab-groceries"
				data-testid="amenity-tab-groceries"
				class="amenity-tab"
				class:active={activeAmenityTab === 'groceries'}
				aria-selected={activeAmenityTab === 'groceries'}
				onclick={() => (activeAmenityTab = 'groceries')}
			>
				Groceries ({categoryCounts.groceries})
			</button>
			<button
				type="button"
				role="tab"
				id="amenity-tab-transit"
				data-testid="amenity-tab-transit"
				class="amenity-tab"
				class:active={activeAmenityTab === 'transit'}
				aria-selected={activeAmenityTab === 'transit'}
				onclick={() => (activeAmenityTab = 'transit')}
			>
				Transit ({categoryCounts.transit})
			</button>
		</div>

		<div
			class="amenities-list"
			id="nearby-amenities-list"
			data-testid="nearby-amenities-list"
		>
			{#if amenitiesLoading}
				<div class="amenity-state">Discovering nearby schools, groceries & transit within 5 km…</div>
			{:else if amenitiesError}
				<div class="amenity-state amenity-warning">{amenitiesError}</div>
			{:else if filteredAmenities.length === 0}
				<div class="amenity-state">No places found in this category within 5 km.</div>
			{:else}
				{#each filteredAmenities as item (item.id)}
					<button
						type="button"
						class="amenity-row"
						onclick={() => onFocusAmenity(item)}
					>
						<div class="amenity-info">
							<div class="amenity-name">{item.name}</div>
							<div class="amenity-sub">{item.address}</div>
						</div>
						<div class="amenity-meta">
							<span class="amenity-cat cat-{item.category}">{item.category}</span>
							<span class="amenity-dist">{formatDistance(item.distanceMeters)}</span>
							{#if typeof item.rating === 'number'}
								<span class="amenity-rating">★ {item.rating.toFixed(1)} ({item.userRatingCount ?? 0})</span>
							{/if}
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<div
		class="detail-section"
		id="commute-calculator-panel"
		data-testid="commute-calculator-panel"
	>
		<div class="section-heading">
			<h3>Workplace Commute Calculator</h3>
			<span class="section-tag">Routes Matrix API</span>
		</div>

		<form class="commute-form" onsubmit={handleCommuteSubmit}>
			<input
				type="text"
				id="workplace-input"
				data-testid="workplace-input"
				class="workplace-input"
				bind:value={workplaceQuery}
				placeholder="Enter workplace address or landmark…"
				aria-label="Workplace destination address"
			/>
			<button
				type="submit"
				id="calculate-commute-btn"
				data-testid="calculate-commute-btn"
				class="commute-submit-btn"
				disabled={commuteLoading}
			>
				{commuteLoading ? 'Calculating…' : 'Calculate'}
			</button>
		</form>

		<div class="preset-chips">
			{#each WORKPLACE_PRESETS as preset}
				<button
					type="button"
					class="preset-chip"
					onclick={() => selectPreset(preset)}
				>
					{preset.label.split(' (')[0]}
				</button>
			{/each}
		</div>

		{#if commuteError}
			<div class="commute-error">{commuteError}</div>
		{/if}

		<div class="commute-results-grid">
			<div
				class="commute-eta-card"
				id="commute-drive-eta"
				data-testid="commute-drive-eta"
			>
				<span class="eta-mode">Driving (Live Traffic)</span>
				<strong class="eta-duration">
					{commuteResult?.driving?.durationText ?? '—'}
				</strong>
				<span class="eta-distance">
					{commuteResult?.driving?.distanceText ?? 'Enter workplace & calculate'}
				</span>
			</div>

			<div
				class="commute-eta-card"
				id="commute-transit-eta"
				data-testid="commute-transit-eta"
			>
				<span class="eta-mode">Public Transit</span>
				<strong class="eta-duration">
					{commuteResult?.transit?.durationText ?? '—'}
				</strong>
				<span class="eta-distance">
					{commuteResult?.transit?.distanceText ?? 'BART / Muni route matrix'}
				</span>
			</div>
		</div>
	</div>
</section>
