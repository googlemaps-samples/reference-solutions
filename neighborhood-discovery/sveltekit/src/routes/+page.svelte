<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		CATEGORY_CHIPS,
		CATEGORY_META,
		INITIAL_CENTER,
		INITIAL_ZOOM,
		MAP_ID,
		MAX_COMPARE_PLACES,
		NEIGHBORHOOD_PRESETS,
		SEARCH_RADIUS_METERS,
		USAGE_ATTRIBUTION_ID
	} from '$lib/constants';
	import {
		computeDistanceMeters,
		ensureMapsConfigured,
		fetchPlaceDetails,
		formatDistance,
		formatPriceLevel,
		geocodeAddress,
		getTodayOpeningHours,
		loadMapsLibraries,
		reverseGeocodeCoords,
		searchNearbyPlaces,
		type LoadedMapsLibraries
	} from '$lib/maps';
	import type {
		CommunitySpot,
		CoreCategory,
		LatLngLiteral,
		PlaceCategory,
		PlaceItem,
		ReverseGeocodeInfo
	} from '$lib/types';

	let activePresetId = $state<string>('covent-garden');
	let activeNeighborhoodLabel = $state<string>('Covent Garden / West End');
	let activeCenter = $state<LatLngLiteral>({ ...INITIAL_CENTER });
	let selectedCategory = $state<PlaceCategory>('all');

	let places = $state<PlaceItem[]>([]);
	let isLoadingPlaces = $state(false);
	let placesError = $state<string | null>(null);

	let mapReady = $state(false);
	let missingApiKey = $state(false);
	let mapError = $state<string | null>(null);
	let showRadiusCircle = $state(true);

	let selectedPlaceId = $state<string | null>(null);
	let isLoadingDetails = $state(false);
	let compareIds = $state<string[]>([]);
	let isComparisonOpen = $state(false);

	let reverseGeocode = $state<ReverseGeocodeInfo | null>(null);
	let isReverseGeocoding = $state(false);
	let showPinForm = $state(false);
	let spotName = $state('');
	let spotCategory = $state<CoreCategory>('cafe');
	let spotNote = $state('');
	let communitySpots = $state<CommunitySpot[]>([]);

	let manualSearchInput = $state('');
	let isGeocodingAddress = $state(false);
	let mobileSidebarOpen = $state(true);

	let mapContainer: HTMLDivElement | null = null;
	let autocompleteContainer: HTMLDivElement | null = null;

	let libs: LoadedMapsLibraries | null = null;
	let mapInstance: google.maps.Map | null = null;
	let radiusCircle: google.maps.Circle | null = null;
	let placeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let communityMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let inspectorMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let placeAutocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;
	let mapClickListener: google.maps.MapsEventListener | null = null;

	let filteredPlaces = $derived(
		selectedCategory === 'all'
			? places
			: places.filter((place) => place.category === selectedCategory)
	);

	let selectedPlace = $derived(places.find((p) => p.id === selectedPlaceId) ?? null);

	let comparedPlaces = $derived(
		compareIds
			.map((id) => places.find((p) => p.id === id))
			.filter((p): p is PlaceItem => Boolean(p))
	);

	function clearPlaceMarkers() {
		for (const marker of placeMarkers) {
			marker.map = null;
		}
		placeMarkers = [];
	}

	function clearCommunityMarkers() {
		for (const marker of communityMarkers) {
			marker.map = null;
		}
		communityMarkers = [];
	}

	function syncPlaceMarkers(items: PlaceItem[], currentSelectedId: string | null) {
		if (!mapInstance || !libs) return;
		clearPlaceMarkers();

		const { AdvancedMarkerElement, PinElement } = libs.markerLib;
		for (const item of items) {
			const meta = CATEGORY_META[item.category];
			const isSelected = item.id === currentSelectedId;
			const pin = new PinElement({
				background: meta.background,
				borderColor: isSelected ? '#0f172a' : meta.borderColor,
				glyphColor: meta.glyphColor,
				glyphText: meta.pinGlyph,
				scale: isSelected ? 1.28 : 1.0
			});

			const marker = new AdvancedMarkerElement({
				map: mapInstance,
				position: item.location,
				title: item.displayName,
				zIndex: isSelected ? 200 : 10
			});
			marker.append(pin);

			marker.addListener('click', () => {
				void inspectPlace(item);
			});

			placeMarkers.push(marker);
		}
	}

	function syncCommunityMarkers(spots: CommunitySpot[]) {
		if (!mapInstance || !libs) return;
		clearCommunityMarkers();

		const { AdvancedMarkerElement, PinElement } = libs.markerLib;
		for (const spot of spots) {
			const pin = new PinElement({
				background: '#7c3aed',
				borderColor: '#4c1d95',
				glyphColor: '#ffffff',
				glyphText: '★',
				scale: 1.15
			});

			const marker = new AdvancedMarkerElement({
				map: mapInstance,
				position: { lat: spot.lat, lng: spot.lng },
				title: `${spot.name} (Community Spot)`,
				zIndex: 150
			});
			marker.append(pin);

			marker.addListener('click', () => {
				selectedPlaceId = null;
				reverseGeocode = {
					lat: spot.lat,
					lng: spot.lng,
					formattedAddress: spot.address,
					placeId: null,
					neighborhood: spot.name
				};
				showPinForm = false;
				mapInstance?.panTo({ lat: spot.lat, lng: spot.lng });
			});

			communityMarkers.push(marker);
		}
	}

	function syncInspectorMarker(info: ReverseGeocodeInfo | null) {
		if (!mapInstance || !libs) return;
		if (inspectorMarker) {
			inspectorMarker.map = null;
			inspectorMarker = null;
		}
		if (!info) return;

		const { AdvancedMarkerElement, PinElement } = libs.markerLib;
		const pin = new PinElement({
			background: '#0f766e',
			borderColor: '#134e4a',
			glyphColor: '#ffffff',
			glyphText: '+',
			scale: 1.15
		});

		const marker = new AdvancedMarkerElement({
			map: mapInstance,
			position: { lat: info.lat, lng: info.lng },
			title: info.formattedAddress,
			zIndex: 180
		});
		marker.append(pin);
		inspectorMarker = marker;
	}

	$effect(() => {
		if (mapReady && mapInstance && libs) {
			syncPlaceMarkers(filteredPlaces, selectedPlaceId);
		}
	});

	$effect(() => {
		if (mapReady && mapInstance && libs) {
			syncCommunityMarkers(communitySpots);
		}
	});

	$effect(() => {
		if (mapReady && mapInstance && libs) {
			syncInspectorMarker(reverseGeocode);
		}
	});

	$effect(() => {
		if (radiusCircle && mapInstance) {
			radiusCircle.setMap(showRadiusCircle ? mapInstance : null);
			radiusCircle.setCenter(activeCenter);
		}
	});

	async function loadNearbyForCenter(center: LatLngLiteral) {
		if (!libs) return;
		isLoadingPlaces = true;
		placesError = null;
		try {
			const results = await searchNearbyPlaces(
				libs.placesLib,
				center,
				SEARCH_RADIUS_METERS,
				'all'
			);
			places = results;
			if (selectedPlaceId && !results.some((p) => p.id === selectedPlaceId)) {
				selectedPlaceId = null;
			}
		} catch (err) {
			placesError =
				err instanceof Error ? err.message : 'Unable to fetch nearby places right now.';
		} finally {
			isLoadingPlaces = false;
		}
	}

	async function moveSearchCenter(
		nextCenter: LatLngLiteral,
		label: string,
		viewport?: google.maps.LatLngBounds | null
	) {
		activeCenter = nextCenter;
		activeNeighborhoodLabel = label;

		if (mapInstance) {
			if (viewport) {
				mapInstance.fitBounds(viewport);
			} else {
				mapInstance.panTo(nextCenter);
				mapInstance.setZoom(INITIAL_ZOOM);
			}
		}

		if (placeAutocompleteEl) {
			placeAutocompleteEl.locationBias = {
				center: nextCenter,
				radius: 15000
			};
		}

		await loadNearbyForCenter(nextCenter);
	}

	async function handlePresetChange(presetId: string) {
		activePresetId = presetId;
		const preset = NEIGHBORHOOD_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		await moveSearchCenter(preset.center, preset.label);
	}

	async function handleGeocodeAddress() {
		if (!libs) return;
		const query = (placeAutocompleteEl?.value || manualSearchInput).trim();
		if (!query) return;

		isGeocodingAddress = true;
		placesError = null;
		try {
			const result = await geocodeAddress(libs.geocodingLib, query);
			if (result) {
				activePresetId = 'custom';
				await moveSearchCenter(
					{ lat: result.lat, lng: result.lng },
					result.formattedAddress
				);
			} else {
				placesError = `No matching address found for "${query}".`;
			}
		} catch (err) {
			placesError =
				err instanceof Error ? err.message : 'Address geocoding failed. Please try again.';
		} finally {
			isGeocodingAddress = false;
		}
	}

	async function handleMapClick(coords: LatLngLiteral) {
		if (!libs) return;
		selectedPlaceId = null;
		showPinForm = false;
		isReverseGeocoding = true;
		reverseGeocode = {
			lat: coords.lat,
			lng: coords.lng,
			formattedAddress: 'Resolving street address...',
			placeId: null,
			neighborhood: null
		};

		try {
			const info = await reverseGeocodeCoords(libs.geocodingLib, coords);
			reverseGeocode = info;
		} catch {
			reverseGeocode = {
				lat: coords.lat,
				lng: coords.lng,
				formattedAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
				placeId: null,
				neighborhood: null
			};
		} finally {
			isReverseGeocoding = false;
		}
	}

	async function inspectPlace(item: PlaceItem) {
		reverseGeocode = null;
		showPinForm = false;
		selectedPlaceId = item.id;

		if (mapInstance) {
			mapInstance.panTo(item.location);
		}

		if (item.detailsLoaded || !libs) return;
		isLoadingDetails = true;
		try {
			const detailPatch = await fetchPlaceDetails(libs.placesLib, item.id, item.category);
			places = places.map((existing) =>
				existing.id === item.id ? { ...existing, ...detailPatch } : existing
			);
		} catch {
			// Keep existing summary fields if fetchFields is unavailable
		} finally {
			isLoadingDetails = false;
		}
	}

	async function toggleComparePlace(item: PlaceItem) {
		if (compareIds.includes(item.id)) {
			compareIds = compareIds.filter((id) => id !== item.id);
			return;
		}
		if (compareIds.length >= MAX_COMPARE_PLACES) {
			compareIds = [...compareIds.slice(1), item.id];
		} else {
			compareIds = [...compareIds, item.id];
		}

		if (!item.detailsLoaded && libs) {
			try {
				const detailPatch = await fetchPlaceDetails(libs.placesLib, item.id, item.category);
				places = places.map((existing) =>
					existing.id === item.id ? { ...existing, ...detailPatch } : existing
				);
			} catch {
				// Summary fields remain available in comparison view
			}
		}
	}

	function saveCommunitySpot(event: SubmitEvent) {
		event.preventDefault();
		if (!reverseGeocode) return;
		const trimmedName = spotName.trim();
		if (!trimmedName) return;

		const newSpot: CommunitySpot = {
			id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			name: trimmedName,
			category: spotCategory,
			note: spotNote.trim(),
			address: reverseGeocode.formattedAddress,
			lat: reverseGeocode.lat,
			lng: reverseGeocode.lng,
			createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		};

		communitySpots = [newSpot, ...communitySpots];
		spotName = '';
		spotNote = '';
		showPinForm = false;
	}

	function removeCommunitySpot(id: string) {
		communitySpots = communitySpots.filter((spot) => spot.id !== id);
	}

	function focusCommunitySpot(spot: CommunitySpot) {
		selectedPlaceId = null;
		reverseGeocode = {
			lat: spot.lat,
			lng: spot.lng,
			formattedAddress: spot.address,
			placeId: null,
			neighborhood: spot.name
		};
		showPinForm = false;
		if (mapInstance) {
			mapInstance.panTo({ lat: spot.lat, lng: spot.lng });
			mapInstance.setZoom(15);
		}
	}

	function closeInspectorDrawer() {
		selectedPlaceId = null;
		reverseGeocode = null;
		showPinForm = false;
	}

	onMount(async () => {
		const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
		if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
			missingApiKey = true;
			return;
		}

		try {
			ensureMapsConfigured(apiKey);
			const loadedLibs = await loadMapsLibraries();
			libs = loadedLibs;

			if (!mapContainer) return;

			const map = new loadedLibs.mapsLib.Map(mapContainer, {
				center: INITIAL_CENTER,
				zoom: INITIAL_ZOOM,
				mapId: MAP_ID,
				internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true,
				clickableIcons: false
			});
			mapInstance = map;

			radiusCircle = new loadedLibs.mapsLib.Circle({
				map: showRadiusCircle ? map : null,
				center: INITIAL_CENTER,
				radius: SEARCH_RADIUS_METERS,
				strokeColor: '#2563eb',
				strokeOpacity: 0.55,
				strokeWeight: 1.5,
				fillColor: '#3b82f6',
				fillOpacity: 0.06,
				clickable: false
			});

			mapClickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
				if (!e.latLng) return;
				void handleMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
			});

			if (autocompleteContainer) {
				const autocomplete = new loadedLibs.placesLib.PlaceAutocompleteElement({
					includedRegionCodes: ['gb'],
					locationBias: { center: INITIAL_CENTER, radius: 15000 },
					placeholder: 'Search London address or neighborhood...',
					internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
				});
				autocomplete.style.width = '100%';
				autocomplete.style.colorScheme = 'light';
				autocomplete.addEventListener('gmp-select', async (ev) => {
					const selectEvent = ev as google.maps.places.PlacePredictionSelectEvent;
					const place = selectEvent.placePrediction.toPlace();
					await place.fetchFields({
						fields: ['displayName', 'formattedAddress', 'location', 'viewport']
					});
					if (place.location) {
						activePresetId = 'custom';
						await moveSearchCenter(
							{ lat: place.location.lat(), lng: place.location.lng() },
							place.displayName ?? place.formattedAddress ?? 'Selected Place',
							place.viewport ?? undefined
						);
					}
				});
				autocompleteContainer.replaceChildren(autocomplete);
				placeAutocompleteEl = autocomplete;
			}

			mapReady = true;
			await loadNearbyForCenter(INITIAL_CENTER);
		} catch (err) {
			mapError =
				err instanceof Error
					? err.message
					: 'Failed to initialize Google Maps Platform libraries.';
		}
	});

	onDestroy(() => {
		clearPlaceMarkers();
		clearCommunityMarkers();
		if (inspectorMarker) {
			inspectorMarker.map = null;
		}
		if (radiusCircle) {
			radiusCircle.setMap(null);
		}
		if (mapClickListener) {
			mapClickListener.remove();
		}
	});
</script>

<div class="app-shell">
	<header class="top-bar">
		<div class="brand-group">
			<div class="brand-mark" aria-hidden="true">LDN</div>
			<div>
				<h1 class="brand-title">Hyperlocal Neighborhood Directory</h1>
				<p class="brand-subtitle">Central London · Places &amp; Community Spot Mapper</p>
			</div>
		</div>

		<div class="search-controls">
			<div
				class="autocomplete-slot"
				data-testid="neighborhood-autocomplete-input"
				id="neighborhood-autocomplete-input"
				bind:this={autocompleteContainer}
			>
				<input
					type="text"
					class="fallback-search-input"
					placeholder="Search London address or neighborhood..."
					aria-label="Search London address or neighborhood"
					bind:value={manualSearchInput}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							void handleGeocodeAddress();
						}
					}}
				/>
			</div>

			<button
				type="button"
				class="btn btn-secondary"
				data-testid="address-geocode-button"
				id="address-geocode-button"
				disabled={isGeocodingAddress || missingApiKey}
				onclick={() => void handleGeocodeAddress()}
			>
				{isGeocodingAddress ? 'Locating…' : 'Geocode'}
			</button>

			<select
				class="preset-select"
				data-testid="neighborhood-preset-select"
				id="neighborhood-preset-select"
				aria-label="Select Central London neighborhood"
				value={activePresetId}
				onchange={(e) => void handlePresetChange(e.currentTarget.value)}
			>
				{#each NEIGHBORHOOD_PRESETS as preset (preset.id)}
					<option value={preset.id}>{preset.label}</option>
				{/each}
				{#if activePresetId === 'custom'}
					<option value="custom">Custom: {activeNeighborhoodLabel}</option>
				{/if}
			</select>
		</div>

		<div class="header-actions">
			<button
				type="button"
				class="btn btn-chip"
				class:active={showRadiusCircle}
				data-testid="radius-toggle-circle"
				id="radius-toggle-circle"
				aria-pressed={showRadiusCircle}
				onclick={() => (showRadiusCircle = !showRadiusCircle)}
			>
				5 km Radius {showRadiusCircle ? 'On' : 'Off'}
			</button>

			<button
				type="button"
				class="btn btn-primary"
				data-testid="toggle-comparison-button"
				id="toggle-comparison-button"
				aria-expanded={isComparisonOpen}
				onclick={() => (isComparisonOpen = !isComparisonOpen)}
			>
				Compare ({compareIds.length}/{MAX_COMPARE_PLACES})
			</button>

			<button
				type="button"
				class="btn btn-secondary mobile-only-btn"
				onclick={() => (mobileSidebarOpen = !mobileSidebarOpen)}
			>
				{mobileSidebarOpen ? 'Hide List' : 'Show List'}
			</button>
		</div>
	</header>

	<main class="workspace">
		<aside class="directory-sidebar" class:collapsed={!mobileSidebarOpen}>
			<div class="sidebar-header">
				<div class="category-chips" role="group" aria-label="Filter places by category">
					{#each CATEGORY_CHIPS as chip (chip.id)}
						<button
							type="button"
							class="category-chip"
							class:selected={selectedCategory === chip.id}
							data-testid={`category-filter-${chip.id}`}
							id={`category-filter-${chip.id}`}
							onclick={() => (selectedCategory = chip.id)}
						>
							{#if chip.id !== 'all'}
								<span
									class="chip-dot"
									style={`background-color: ${CATEGORY_META[chip.id].background}`}
								></span>
							{/if}
							{chip.label}
						</button>
					{/each}
				</div>

				<div class="status-bar">
					<span>
						{#if isLoadingPlaces}
							Searching within 5 km of <strong>{activeNeighborhoodLabel}</strong>…
						{:else}
							<strong>{filteredPlaces.length}</strong> places within 5 km of
							<strong>{activeNeighborhoodLabel}</strong>
						{/if}
					</span>
				</div>

				{#if placesError}
					<div class="error-banner" role="alert">{placesError}</div>
				{/if}
			</div>

			<div class="results-scroll" data-testid="places-results-list" id="places-results-list">
				{#if isLoadingPlaces && places.length === 0}
					<div class="empty-state">Loading live Central London places…</div>
				{:else if filteredPlaces.length === 0}
					<div class="empty-state">
						{#if missingApiKey}
							Configure <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to
							load live London places.
						{:else}
							No places matched this filter within 5 km. Try selecting "All" or another
							neighborhood.
						{/if}
					</div>
				{:else}
					{#each filteredPlaces as place (place.id)}
						{@const meta = CATEGORY_META[place.category]}
						{@const isSelected = selectedPlaceId === place.id}
						{@const isCompared = compareIds.includes(place.id)}
						<article class="place-card" class:selected={isSelected}>
							<div class="place-card-top">
								<span
									class="category-pill"
									style={`background: ${meta.badgeBg}; color: ${meta.badgeText};`}
								>
									{meta.label}
								</span>
								<span class="distance-label">
									{formatDistance(computeDistanceMeters(activeCenter, place.location))}
								</span>
							</div>

							<button
								type="button"
								class="place-title-btn"
								onclick={() => void inspectPlace(place)}
							>
								{place.displayName}
							</button>

							<div class="place-metrics">
								{#if place.rating !== null}
									<span class="rating-badge">★ {place.rating.toFixed(1)}</span>
									<span class="muted">({place.userRatingCount ?? 0})</span>
								{:else}
									<span class="muted">No rating</span>
								{/if}
								<span class="dot-sep">·</span>
								<span class="price-tag">{formatPriceLevel(place.priceLevel)}</span>
							</div>

							<p class="place-hours">{getTodayOpeningHours(place.weekdayDescriptions)}</p>
							<p class="place-address">{place.formattedAddress}</p>

							<div class="place-card-actions">
								<button
									type="button"
									class="btn-xs btn-xs-outline"
									onclick={() => void inspectPlace(place)}
								>
									Inspect
								</button>
								<button
									type="button"
									class="btn-xs"
									class:btn-xs-active={isCompared}
									class:btn-xs-outline={!isCompared}
									onclick={() => void toggleComparePlace(place)}
								>
									{isCompared ? '✓ Comparing' : '+ Compare'}
								</button>
							</div>
						</article>
					{/each}
				{/if}

				<section class="community-section" aria-label="Pinned community spots">
					<div class="community-header">
						<h2>Community Spots ({communitySpots.length})</h2>
						<span class="muted-xs">Click map to pin</span>
					</div>

					{#if communitySpots.length === 0}
						<p class="community-hint">
							Click anywhere on the map to reverse-geocode an address and pin a session
							community spot.
						</p>
					{:else}
						<ul class="community-list">
							{#each communitySpots as spot (spot.id)}
								<li class="community-item">
									<div class="community-item-head">
										<button
											type="button"
											class="community-name-btn"
											onclick={() => focusCommunitySpot(spot)}
										>
											★ {spot.name}
										</button>
										<button
											type="button"
											class="remove-link"
											onclick={() => removeCommunitySpot(spot.id)}
										>
											Remove
										</button>
									</div>
									<p class="community-meta">
										{CATEGORY_META[spot.category].label} · {spot.lat.toFixed(4)},
										{spot.lng.toFixed(4)}
									</p>
									{#if spot.note}
										<p class="community-note">{spot.note}</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		</aside>

		<section class="map-stage" aria-label="Interactive Central London Map">
			<div
				class="map-canvas"
				data-testid="map-canvas"
				id="map-canvas"
				bind:this={mapContainer}
			></div>

			{#if missingApiKey}
				<div class="map-overlay-card">
					<h2>Google Maps API Key Required</h2>
					<p>
						Add <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> to a <code>.env</code> file in
						this directory to load the Central London vector map, Places API (New), and
						Geocoding.
					</p>
					<p>
						Need a free key for prototyping? Generate a zero-billing
						<a
							href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
							target="_blank"
							rel="noopener noreferrer"
						>
							Maps Demo Key
						</a>.
					</p>
				</div>
			{:else if mapError}
				<div class="map-overlay-card error">
					<h2>Map Initialization Error</h2>
					<p>{mapError}</p>
				</div>
			{/if}

			{#if mapReady && !selectedPlace && !reverseGeocode}
				<div class="map-tip-pill">
					Click any marker to inspect reviews &amp; hours, or click anywhere on the map to
					reverse-geocode &amp; pin a spot.
				</div>
			{/if}

			{#if selectedPlace}
				<aside
					class="floating-drawer"
					data-testid="place-details-drawer"
					id="place-details-drawer"
					aria-label="Place details"
				>
					<div class="drawer-header">
						<div>
							<span
								class="category-pill"
								style={`background: ${CATEGORY_META[selectedPlace.category].badgeBg}; color: ${CATEGORY_META[selectedPlace.category].badgeText};`}
							>
								{selectedPlace.primaryTypeDisplayName ||
									CATEGORY_META[selectedPlace.category].label}
							</span>
							<h2 class="drawer-title">{selectedPlace.displayName}</h2>
						</div>
						<button
							type="button"
							class="close-btn"
							aria-label="Close details drawer"
							onclick={closeInspectorDrawer}
						>
							✕
						</button>
					</div>

					<div class="drawer-body">
						{#if selectedPlace.photoUrl}
							<img
								class="drawer-photo"
								src={selectedPlace.photoUrl}
								alt={selectedPlace.displayName}
							/>
						{/if}

						<div class="drawer-metrics">
							{#if selectedPlace.rating !== null}
								<span class="rating-badge">★ {selectedPlace.rating.toFixed(1)}</span>
								<span class="muted">
									({selectedPlace.userRatingCount ?? 0} reviews)
								</span>
							{:else}
								<span class="muted">No rating</span>
							{/if}
							<span class="dot-sep">·</span>
							<span>{formatPriceLevel(selectedPlace.priceLevel)}</span>
						</div>

						<p class="drawer-address">{selectedPlace.formattedAddress}</p>

						<div class="drawer-actions">
							<button
								type="button"
								class="btn btn-primary btn-sm"
								data-testid="drawer-compare-button"
								id="drawer-compare-button"
								onclick={() => selectedPlace && void toggleComparePlace(selectedPlace)}
							>
								{compareIds.includes(selectedPlace.id)
									? 'Remove from Compare'
									: '+ Add to Compare'}
							</button>

							{#if selectedPlace.googleMapsURI}
								<a
									class="btn btn-secondary btn-sm"
									href={selectedPlace.googleMapsURI}
									target="_blank"
									rel="noopener noreferrer"
								>
									Open in Google Maps
								</a>
							{/if}
						</div>

						{#if selectedPlace.websiteURI || selectedPlace.internationalPhoneNumber}
							<div class="drawer-contact">
								{#if selectedPlace.internationalPhoneNumber}
									<div>
										<strong>Phone:</strong> {selectedPlace.internationalPhoneNumber}
									</div>
								{/if}
								{#if selectedPlace.websiteURI}
									<div>
										<strong>Website:</strong>
										<a
											href={selectedPlace.websiteURI}
											target="_blank"
											rel="noopener noreferrer"
										>
											Visit official site
										</a>
									</div>
								{/if}
							</div>
						{/if}

						<div class="drawer-section">
							<h3>Opening Hours</h3>
							{#if selectedPlace.weekdayDescriptions.length > 0}
								<ul class="hours-list">
									{#each selectedPlace.weekdayDescriptions as line, idx (idx)}
										<li>{line}</li>
									{/each}
								</ul>
							{:else}
								<p class="muted">Opening hours not reported for this place.</p>
							{/if}
						</div>

						<div class="drawer-section">
							<h3>Customer Reviews</h3>
							{#if isLoadingDetails}
								<p class="muted">Fetching latest reviews…</p>
							{:else if selectedPlace.reviews.length > 0}
								<div class="reviews-list">
									{#each selectedPlace.reviews as review, idx (idx)}
										<article class="review-card">
											<div class="review-head">
												<strong>{review.authorName}</strong>
												<span class="muted-xs">
													{#if review.rating !== null}★ {review.rating}{/if}
													{review.relativePublishTimeDescription
														? ` · ${review.relativePublishTimeDescription}`
														: ''}
												</span>
											</div>
											{#if review.text}
												<p class="review-text">{review.text}</p>
											{/if}
										</article>
									{/each}
								</div>
							{:else}
								<p class="muted">No customer reviews available.</p>
							{/if}
						</div>
					</div>
				</aside>
			{:else if reverseGeocode}
				<aside
					class="floating-drawer"
					data-testid="reverse-geocode-inspector"
					id="reverse-geocode-inspector"
					aria-label="Reverse geocode inspector"
				>
					<div class="drawer-header">
						<div>
							<span class="category-pill inspector-pill">Map Click Inspector</span>
							<h2 class="drawer-title">
								{reverseGeocode.neighborhood ?? 'Reverse-Geocoded Location'}
							</h2>
						</div>
						<button
							type="button"
							class="close-btn"
							aria-label="Close inspector"
							onclick={closeInspectorDrawer}
						>
							✕
						</button>
					</div>

					<div class="drawer-body">
						<div class="geocode-box">
							<div class="geocode-label">Street Address</div>
							<p class="geocode-value">
								{isReverseGeocoding
									? 'Resolving street address…'
									: reverseGeocode.formattedAddress}
							</p>

							<div class="geocode-label">Coordinates</div>
							<p class="geocode-coords">
								{reverseGeocode.lat.toFixed(6)}, {reverseGeocode.lng.toFixed(6)}
							</p>

							{#if reverseGeocode.placeId}
								<div class="geocode-label">Place ID</div>
								<p class="geocode-place-id">{reverseGeocode.placeId}</p>
							{/if}
						</div>

						<div class="drawer-actions">
							<button
								type="button"
								class="btn btn-primary btn-sm"
								data-testid="pin-community-spot-button"
								id="pin-community-spot-button"
								onclick={() => (showPinForm = !showPinForm)}
							>
								{showPinForm ? 'Hide Pin Form' : '+ Pin Community Spot Here'}
							</button>

							<button
								type="button"
								class="btn btn-secondary btn-sm"
								onclick={() => {
									if (reverseGeocode) {
										activePresetId = 'custom';
										void moveSearchCenter(
											{ lat: reverseGeocode.lat, lng: reverseGeocode.lng },
											reverseGeocode.neighborhood ??
												reverseGeocode.formattedAddress
										);
									}
								}}
							>
								Search 5 km Around Here
							</button>
						</div>

						{#if showPinForm}
							<form class="pin-form" onsubmit={saveCommunitySpot}>
								<label class="form-label">
									Spot Name
									<input
										type="text"
										required
										placeholder="e.g., Hidden Courtyard Bench"
										data-testid="community-spot-name-input"
										id="community-spot-name-input"
										bind:value={spotName}
									/>
								</label>

								<label class="form-label">
									Category
									<select bind:value={spotCategory}>
										<option value="cafe">Cafe</option>
										<option value="restaurant">Restaurant</option>
										<option value="museum">Museum</option>
										<option value="park">Park</option>
									</select>
								</label>

								<label class="form-label">
									Community Note
									<textarea
										rows="3"
										placeholder="Share why neighbors love this spot..."
										data-testid="community-spot-note-input"
										id="community-spot-note-input"
										bind:value={spotNote}
									></textarea>
								</label>

								<button
									type="submit"
									class="btn btn-primary btn-sm"
									data-testid="save-community-spot-button"
									id="save-community-spot-button"
								>
									Save Community Spot
								</button>
							</form>
						{/if}
					</div>
				</aside>
			{/if}

			{#if isComparisonOpen}
				<section
					class="comparison-panel"
					data-testid="comparison-panel"
					id="comparison-panel"
					aria-label="Side-by-side place comparison"
				>
					<div class="comparison-header">
						<div>
							<h2>Side-by-Side Comparison ({comparedPlaces.length}/{MAX_COMPARE_PLACES})</h2>
							<p class="muted-xs">
								Select up to 3 places from the directory to compare ratings, prices,
								and hours.
							</p>
						</div>
						<div class="comparison-header-actions">
							{#if comparedPlaces.length > 0}
								<button
									type="button"
									class="btn btn-secondary btn-sm"
									onclick={() => (compareIds = [])}
								>
									Clear All
								</button>
							{/if}
							<button
								type="button"
								class="close-btn"
								aria-label="Close comparison panel"
								onclick={() => (isComparisonOpen = false)}
							>
								✕
							</button>
						</div>
					</div>

					{#if comparedPlaces.length === 0}
						<p class="comparison-empty">
							No places selected yet. Click <strong>+ Compare</strong> on any directory
							card or inside the details drawer.
						</p>
					{:else}
						<div class="comparison-grid">
							{#each comparedPlaces as place (place.id)}
								{@const meta = CATEGORY_META[place.category]}
								<div class="compare-card">
									<div class="compare-card-head">
										<span
											class="category-pill"
											style={`background: ${meta.badgeBg}; color: ${meta.badgeText};`}
										>
											{meta.label}
										</span>
										<button
											type="button"
											class="remove-link"
											onclick={() => void toggleComparePlace(place)}
										>
											Remove
										</button>
									</div>

									<h3 class="compare-title">{place.displayName}</h3>

									<dl class="compare-specs">
										<div>
											<dt>Rating</dt>
											<dd>
												{#if place.rating !== null}
													★ {place.rating.toFixed(1)} ({place.userRatingCount ?? 0})
												{:else}
													Not rated
												{/if}
											</dd>
										</div>
										<div>
											<dt>Price</dt>
											<dd>{formatPriceLevel(place.priceLevel)}</dd>
										</div>
										<div>
											<dt>Distance</dt>
											<dd>
												{formatDistance(
													computeDistanceMeters(activeCenter, place.location)
												)}
											</dd>
										</div>
										<div>
											<dt>Today</dt>
											<dd>{getTodayOpeningHours(place.weekdayDescriptions)}</dd>
										</div>
										<div>
											<dt>Address</dt>
											<dd>{place.formattedAddress}</dd>
										</div>
									</dl>

									<button
										type="button"
										class="btn-xs btn-xs-outline"
										onclick={() => void inspectPlace(place)}
									>
										View Reviews &amp; Details
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
		</section>
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		height: 100vh;
		overflow: hidden;
	}

	.top-bar {
		height: var(--header-height);
		flex-shrink: 0;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-subtle);
		padding: 0 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		z-index: 20;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.brand-mark {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		background: linear-gradient(135deg, #1d4ed8, #0f766e);
		color: #ffffff;
		font-weight: 700;
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.brand-title {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;
	}

	.brand-subtitle {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.search-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		max-width: 620px;
		min-width: 0;
	}

	.autocomplete-slot {
		flex: 1;
		min-width: 190px;
	}

	.fallback-search-input {
		width: 100%;
		height: 38px;
		border-radius: 8px;
		border: 1px solid var(--border-strong);
		padding: 0 12px;
		font-size: 0.875rem;
		color: var(--text-primary);
		background: var(--bg-surface);
	}

	.preset-select {
		height: 38px;
		border-radius: 8px;
		border: 1px solid var(--border-strong);
		padding: 0 10px;
		font-size: 0.85rem;
		background: var(--bg-surface);
		color: var(--text-primary);
		max-width: 190px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn {
		height: 38px;
		padding: 0 12px;
		border-radius: 8px;
		font-size: 0.84rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-sm {
		height: 34px;
		padding: 0 11px;
		font-size: 0.8rem;
	}

	.btn-primary {
		background: var(--brand);
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--brand-hover);
	}

	.btn-secondary {
		background: var(--bg-surface);
		color: var(--text-primary);
		border-color: var(--border-strong);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--bg-muted);
	}

	.btn-chip {
		background: var(--bg-muted);
		color: var(--text-secondary);
		border-color: var(--border-subtle);
	}

	.btn-chip.active {
		background: var(--brand-soft);
		color: var(--brand);
		border-color: #93c5fd;
	}

	.mobile-only-btn {
		display: none;
	}

	.workspace {
		display: flex;
		flex: 1;
		min-height: 540px;
		height: calc(100vh - var(--header-height));
		position: relative;
	}

	.directory-sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: var(--bg-surface);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		z-index: 10;
	}

	.sidebar-header {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.category-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.category-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.category-chip.selected {
		background: var(--text-primary);
		color: #ffffff;
		border-color: var(--text-primary);
	}

	.chip-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
	}

	.status-bar {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.error-banner {
		padding: 8px 10px;
		border-radius: 8px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		font-size: 0.8rem;
	}

	.results-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 12px 14px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.empty-state {
		padding: 20px 14px;
		border-radius: 10px;
		background: var(--bg-muted);
		color: var(--text-secondary);
		font-size: 0.85rem;
		text-align: center;
	}

	.place-card {
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 12px;
		background: var(--bg-surface);
		display: flex;
		flex-direction: column;
		gap: 6px;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.place-card:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow-sm);
	}

	.place-card.selected {
		border-color: var(--brand);
		box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.14);
	}

	.place-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.category-pill {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.inspector-pill {
		background: #f0fdfa;
		color: #0f766e;
	}

	.distance-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.place-title-btn {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		font-size: 0.96rem;
		font-weight: 700;
		color: var(--text-primary);
		cursor: pointer;
	}

	.place-title-btn:hover {
		color: var(--brand);
	}

	.place-metrics {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
	}

	.rating-badge {
		font-weight: 700;
		color: #b45309;
	}

	.price-tag {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.muted {
		color: var(--text-muted);
	}

	.muted-xs {
		color: var(--text-muted);
		font-size: 0.76rem;
	}

	.dot-sep {
		color: var(--text-muted);
	}

	.place-hours {
		margin: 0;
		font-size: 0.78rem;
		color: #0f766e;
		font-weight: 500;
	}

	.place-address {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.place-card-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.btn-xs {
		padding: 5px 10px;
		border-radius: 6px;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn-xs-outline {
		background: var(--bg-surface);
		color: var(--text-primary);
		border-color: var(--border-strong);
	}

	.btn-xs-outline:hover {
		background: var(--bg-muted);
	}

	.btn-xs-active {
		background: var(--brand);
		color: #ffffff;
	}

	.community-section {
		margin-top: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle);
	}

	.community-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.community-header h2 {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
	}

	.community-hint {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.community-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.community-item {
		padding: 9px 10px;
		border-radius: 8px;
		background: #f5f3ff;
		border: 1px solid #ddd6fe;
	}

	.community-item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.community-name-btn {
		background: none;
		border: none;
		padding: 0;
		font-weight: 700;
		font-size: 0.84rem;
		color: #5b21b6;
		cursor: pointer;
		text-align: left;
	}

	.remove-link {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #dc2626;
		cursor: pointer;
	}

	.community-meta {
		margin: 3px 0 0;
		font-size: 0.74rem;
		color: var(--text-secondary);
	}

	.community-note {
		margin: 4px 0 0;
		font-size: 0.78rem;
		color: var(--text-primary);
	}

	.map-stage {
		flex: 1;
		position: relative;
		min-width: 0;
		min-height: 540px;
		height: 100%;
	}

	.map-canvas {
		width: 100%;
		height: calc(100vh - var(--header-height));
		min-height: 540px;
		background: #e2e8f0;
	}

	.map-overlay-card {
		position: absolute;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		width: min(460px, calc(100% - 32px));
		background: var(--bg-surface);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		padding: 18px 20px;
		box-shadow: var(--shadow-lg);
		z-index: 15;
	}

	.map-overlay-card.error {
		border-color: #fca5a5;
		background: #fef2f2;
	}

	.map-overlay-card h2 {
		margin: 0 0 8px;
		font-size: 1rem;
	}

	.map-overlay-card p {
		margin: 6px 0 0;
		font-size: 0.86rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.map-tip-pill {
		position: absolute;
		top: 14px;
		left: 14px;
		max-width: min(480px, calc(100% - 28px));
		background: rgba(15, 23, 42, 0.86);
		color: #ffffff;
		padding: 8px 12px;
		border-radius: 999px;
		font-size: 0.78rem;
		box-shadow: var(--shadow-md);
		pointer-events: none;
		z-index: 12;
	}

	.floating-drawer {
		position: absolute;
		top: 14px;
		right: 14px;
		width: min(380px, calc(100% - 28px));
		max-height: calc(100% - 28px);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		z-index: 18;
	}

	.drawer-header {
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.drawer-title {
		margin: 6px 0 0;
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.25;
	}

	.close-btn {
		border: none;
		background: var(--bg-muted);
		color: var(--text-primary);
		width: 28px;
		height: 28px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.drawer-body {
		padding: 14px 16px 18px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.drawer-photo {
		width: 100%;
		height: 165px;
		object-fit: cover;
		border-radius: 10px;
	}

	.drawer-metrics {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.drawer-address {
		margin: 0;
		font-size: 0.84rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.drawer-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.drawer-contact {
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--bg-muted);
		font-size: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.drawer-section h3 {
		margin: 0 0 6px;
		font-size: 0.86rem;
		font-weight: 700;
	}

	.hours-list {
		margin: 0;
		padding-left: 16px;
		font-size: 0.78rem;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.reviews-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.review-card {
		padding: 10px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: #fafafa;
	}

	.review-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.8rem;
	}

	.review-text {
		margin: 6px 0 0;
		font-size: 0.79rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.geocode-box {
		padding: 12px;
		border-radius: 10px;
		background: var(--bg-muted);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.geocode-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.geocode-label:first-child {
		margin-top: 0;
	}

	.geocode-value,
	.geocode-coords,
	.geocode-place-id {
		margin: 0;
		font-size: 0.84rem;
		color: var(--text-primary);
		word-break: break-word;
	}

	.geocode-coords,
	.geocode-place-id {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.78rem;
	}

	.pin-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 6px;
		border-top: 1px solid var(--border-subtle);
	}

	.form-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.form-label input,
	.form-label select,
	.form-label textarea {
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 0.84rem;
		color: var(--text-primary);
		background: var(--bg-surface);
	}

	.comparison-panel {
		position: absolute;
		left: 14px;
		right: 14px;
		bottom: 14px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		box-shadow: var(--shadow-lg);
		padding: 14px 16px;
		z-index: 22;
		max-height: 46vh;
		overflow-y: auto;
	}

	.comparison-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.comparison-header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.comparison-header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.comparison-empty {
		margin: 0;
		font-size: 0.84rem;
		color: var(--text-secondary);
	}

	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 12px;
	}

	.compare-card {
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 12px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.compare-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.compare-title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
	}

	.compare-specs {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.78rem;
	}

	.compare-specs > div {
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: 8px;
	}

	.compare-specs dt {
		font-weight: 600;
		color: var(--text-muted);
	}

	.compare-specs dd {
		margin: 0;
		color: var(--text-primary);
	}

	@media (max-width: 960px) {
		.app-shell {
			height: auto;
			min-height: 100vh;
			overflow: visible;
		}

		.top-bar {
			height: auto;
			flex-wrap: wrap;
			padding: 10px 12px;
		}

		.search-controls {
			order: 3;
			width: 100%;
			max-width: none;
			flex-wrap: wrap;
		}

		.mobile-only-btn {
			display: inline-flex;
		}

		.workspace {
			flex-direction: column;
			height: auto;
		}

		.directory-sidebar {
			width: 100%;
			max-height: 360px;
			border-right: none;
			border-bottom: 1px solid var(--border-subtle);
		}

		.directory-sidebar.collapsed {
			display: none;
		}

		.map-stage {
			min-height: 540px;
			height: 600px;
		}

		.map-canvas {
			height: 600px;
			min-height: 540px;
		}
	}
</style>
