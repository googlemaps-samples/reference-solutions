<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { DAY_META, DESTINATION_PRESETS } from '$lib/destinations';
	import {
		GMP_ATTRIBUTION_ID,
		buildInfoWindowContent,
		computeItineraryRoute,
		ensureMapsLoader,
		fetchDestinationTimeZone,
		formatDestinationLocalTime,
		formatDistance,
		formatDuration,
		loadGmpLibraries,
		normalizePlace,
		searchDestinationPlaces
	} from '$lib/maps';
	import type {
		DayId,
		DestinationPreset,
		DiscoveredPlace,
		DiscoveryCategory,
		ItineraryStop,
		LatLngPoint,
		RouteSummary,
		TimeZoneInfo,
		TravelModeChoice
	} from '$lib/types';

	// Core UI State
	let selectedPresetId = $state<string>('tokyo');
	let destinationName = $state<string>('Tokyo, Japan');
	let destinationCenter = $state<LatLngPoint>({ lat: 35.6812, lng: 139.7671 });

	let activeDay = $state<DayId>('day1');
	let activeCategory = $state<DiscoveryCategory>('attractions');
	let travelMode = $state<TravelModeChoice>('DRIVING');

	let dayStops = $state<Record<DayId, ItineraryStop[]>>({
		day1: [],
		day2: []
	});

	let discoveryResults = $state<DiscoveredPlace[]>([]);
	let discoveryLoading = $state<boolean>(false);
	let routeLoading = $state<boolean>(false);
	let optimizingRoute = $state<boolean>(false);

	let routeSummary = $state<RouteSummary>({
		distanceMeters: 0,
		durationMillis: 0,
		legs: []
	});

	let timeZoneInfo = $state<TimeZoneInfo>({
		timeZoneId: 'Asia/Tokyo',
		timeZoneName: 'Japan Standard Time',
		rawOffsetSeconds: 32400,
		dstOffsetSeconds: 0,
		totalOffsetSeconds: 32400,
		source: 'places-fallback'
	});
	let nowMs = $state<number>(Date.now());

	let selectedPlaceId = $state<string | null>(null);
	let streetViewTargetName = $state<string>('Tokyo Station');
	let streetViewStatus = $state<string>('Initializing Street View...');
	let streetViewAvailable = $state<boolean>(true);
	let apiStatusNotice = $state<string | null>(null);

	// Derived values
	let activeStops = $derived(dayStops[activeDay]);
	let activeDayMeta = $derived(DAY_META[activeDay]);
	let formattedClock = $derived(formatDestinationLocalTime(timeZoneInfo, nowMs));

	// DOM element refs
	let mapEl: HTMLDivElement | undefined = $state();
	let streetViewEl: HTMLDivElement | undefined = $state();
	let autocompleteHostEl: HTMLDivElement | undefined = $state();

	// Google Maps runtime handles (populated only in onMount in browser)
	let gmpReady = $state<boolean>(false);
	let mapInstance: google.maps.Map | null = null;
	let infoWindowInstance: google.maps.InfoWindow | null = null;
	let svPanorama: google.maps.StreetViewPanorama | null = null;
	let svService: google.maps.StreetViewService | null = null;
	let libs: Awaited<ReturnType<typeof loadGmpLibraries>> | null = null;

	let activeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let activePolylines: google.maps.Polyline[] = [];
	let discoveryMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

	function makeStopUid(placeId: string): string {
		return `${placeId}-${Math.random().toString(36).slice(2, 7)}`;
	}

	function clearMapOverlays(): void {
		for (const marker of activeMarkers) {
			marker.map = null;
		}
		activeMarkers = [];

		for (const marker of discoveryMarkers) {
			marker.map = null;
		}
		discoveryMarkers = [];

		for (const line of activePolylines) {
			line.setMap(null);
		}
		activePolylines = [];
	}

	async function inspectInStreetView(place: Pick<DiscoveredPlace, 'id' | 'name' | 'location'>): Promise<void> {
		selectedPlaceId = place.id;
		streetViewTargetName = place.name;

		if (!svService || !svPanorama || !libs) return;
		streetViewStatus = 'Loading panorama...';

		const { StreetViewPreference } = libs.streetViewLib;
		try {
			const res = await svService.getPanorama({
				location: place.location,
				radius: 250,
				preference: StreetViewPreference.BEST
			});
			applyPanorama(res.data);
			return;
		} catch {
			// Retry with wider 1000m radius for large parks/shrines/waterfront landmarks
		}

		try {
			const res = await svService.getPanorama({
				location: place.location,
				radius: 1000,
				preference: StreetViewPreference.NEAREST
			});
			applyPanorama(res.data);
		} catch {
			streetViewAvailable = false;
			streetViewStatus = 'No nearby Street View imagery found for this location.';
		}
	}

	function applyPanorama(data: google.maps.StreetViewPanoramaData): void {
		if (!svPanorama || !data.location?.pano) {
			streetViewAvailable = false;
			streetViewStatus = 'Panorama unavailable at this coordinate.';
			return;
		}
		streetViewAvailable = true;
		svPanorama.setPano(data.location.pano);
		svPanorama.setPov({ heading: 165, pitch: 4 });
		svPanorama.setVisible(true);
		streetViewStatus = data.location.description || data.location.shortDescription || '360° Interactive Street View';
	}

	function focusPlaceOnMap(place: DiscoveredPlace, stopNumber: number | null = null): void {
		if (!mapInstance || !infoWindowInstance) return;
		mapInstance.panTo(place.location);
		if ((mapInstance.getZoom() ?? 12) < 13) {
			mapInstance.setZoom(14);
		}

		const meta = DAY_META[activeDay];
		infoWindowInstance.setContent(
			buildInfoWindowContent(
				place,
				stopNumber,
				stopNumber !== null ? meta.label : null,
				meta.color
			)
		);
		infoWindowInstance.setPosition(place.location);
		infoWindowInstance.open({ map: mapInstance });
		void inspectInStreetView(place);
	}

	async function syncMapAndRoute(optimizeOrder = false): Promise<void> {
		if (!mapInstance || !libs) return;

		clearMapOverlays();
		const stops = dayStops[activeDay];
		const meta = DAY_META[activeDay];
		const { AdvancedMarkerElement, PinElement } = libs.markerLib;
		const { LatLngBounds } = libs.coreLib;

		const bounds = new LatLngBounds();

		// Render numbered day-colored AdvancedMarkerElement pins for active day stops
		stops.forEach((stop, index) => {
			const pin = new PinElement({
				glyphText: String(index + 1),
				glyphColor: '#ffffff',
				background: meta.color,
				borderColor: meta.borderColor,
				scale: 1.12
			});

			const marker = new AdvancedMarkerElement({
				map: mapInstance!,
				position: stop.location,
				title: `${meta.label} #${index + 1}: ${stop.name}`,
				content: pin,
				zIndex: 100 + index
			});

			marker.addListener('click', () => {
				if (infoWindowInstance && mapInstance) {
					infoWindowInstance.setContent(
						buildInfoWindowContent(stop, index + 1, meta.label, meta.color)
					);
					infoWindowInstance.open({ anchor: marker, map: mapInstance });
				}
				void inspectInStreetView(stop);
			});

			activeMarkers.push(marker);
			bounds.extend(stop.location);
		});

		// Render subtle pins for discovery places not already in the active day
		const stopIds = new Set(stops.map((s) => s.id));
		for (const candidate of discoveryResults) {
			if (stopIds.has(candidate.id)) continue;
			const pin = new PinElement({
				glyphColor: '#475569',
				background: '#ffffff',
				borderColor: '#64748b',
				scale: 0.78
			});
			const marker = new AdvancedMarkerElement({
				map: mapInstance!,
				position: candidate.location,
				title: candidate.name,
				content: pin,
				zIndex: 10
			});
			marker.addListener('click', () => {
				if (infoWindowInstance && mapInstance) {
					infoWindowInstance.setContent(
						buildInfoWindowContent(candidate, null, null, meta.color)
					);
					infoWindowInstance.open({ anchor: marker, map: mapInstance });
				}
				void inspectInStreetView(candidate);
			});
			discoveryMarkers.push(marker);
		}

		if (stops.length < 2) {
			routeSummary = { distanceMeters: 0, durationMillis: 0, legs: [] };
			if (stops.length === 1) {
				mapInstance.panTo(stops[0].location);
				mapInstance.setZoom(14);
			} else {
				mapInstance.panTo(destinationCenter);
				mapInstance.setZoom(12);
			}
			return;
		}

		routeLoading = true;
		try {
			const computed = await computeItineraryRoute(
				stops,
				travelMode,
				optimizeOrder,
				libs.routesLib,
				libs.mapsLib,
				mapInstance,
				meta.color
			);

			if (
				optimizeOrder &&
				computed.optimizedIndices &&
				computed.optimizedIndices.length > 0 &&
				stops.length >= 3
			) {
				const first = stops[0];
				const last = stops[stops.length - 1];
				const middle = stops.slice(1, -1);
				const reorderedMiddle = computed.optimizedIndices.map((idx) => middle[idx]).filter(Boolean);
				if (reorderedMiddle.length === middle.length) {
					dayStops = {
						...dayStops,
						[activeDay]: [first, ...reorderedMiddle, last]
					};
					// Re-render markers in updated numbered sequence
					routeLoading = false;
					await syncMapAndRoute(false);
					return;
				}
			}

			activePolylines = computed.polylines;
			routeSummary = computed.summary;

			if (computed.viewport) {
				mapInstance.fitBounds(computed.viewport, 48);
			} else if (!bounds.isEmpty()) {
				mapInstance.fitBounds(bounds, 48);
			}
		} finally {
			routeLoading = false;
		}
	}

	async function loadDiscoveryCategory(category: DiscoveryCategory, cityLabel = destinationName, center = destinationCenter): Promise<void> {
		activeCategory = category;
		if (!libs) return;

		discoveryLoading = true;
		try {
			const results = await searchDestinationPlaces(cityLabel, center, category, libs.placesLib);
			discoveryResults = results;
			await syncMapAndRoute(false);
		} catch (err) {
			apiStatusNotice =
				err instanceof Error
					? `Unable to load Places results: ${err.message}`
					: 'Unable to load Places results.';
		} finally {
			discoveryLoading = false;
		}
	}

	async function activateDestination(
		name: string,
		center: LatLngPoint,
		seedItinerary: boolean,
		fallbackUtcOffsetMinutes: number | null = null,
		fallbackTimeZoneId: string | null = null,
		featuredPlace: DiscoveredPlace | null = null
	): Promise<void> {
		destinationName = name;
		destinationCenter = center;
		apiStatusNotice = null;

		if (mapInstance) {
			mapInstance.panTo(center);
			mapInstance.setZoom(12);
		}

		// Update Time Zone Hub via Time Zone API endpoint (with graceful Places utcOffsetMinutes fallback)
		void fetchDestinationTimeZone(center, fallbackUtcOffsetMinutes, fallbackTimeZoneId).then((tz) => {
			timeZoneInfo = tz;
		});

		if (!libs) return;

		discoveryLoading = true;
		try {
			const attractions = await searchDestinationPlaces(name, center, 'attractions', libs.placesLib);
			let initialResults = attractions;

			if (featuredPlace) {
				initialResults = [
					featuredPlace,
					...attractions.filter((item) => item.id !== featuredPlace.id)
				];
			}

			if (activeCategory !== 'attractions') {
				const catResults = await searchDestinationPlaces(name, center, activeCategory, libs.placesLib);
				discoveryResults = featuredPlace
					? [featuredPlace, ...catResults.filter((item) => item.id !== featuredPlace.id)]
					: catResults;
			} else {
				discoveryResults = initialResults;
			}

			if (seedItinerary && initialResults.length > 0) {
				const day1Seeds = initialResults.slice(0, 3).map((p) => ({ ...p, uid: makeStopUid(p.id) }));
				const day2Seeds = initialResults.slice(3, 6).map((p) => ({ ...p, uid: makeStopUid(p.id) }));

				// If fewer than 6 attractions returned, supplement Day 2 with top restaurants or hotels
				if (day2Seeds.length < 2) {
					try {
						const hotels = await searchDestinationPlaces(name, center, 'hotels', libs.placesLib);
						for (const h of hotels.slice(0, 3 - day2Seeds.length)) {
							day2Seeds.push({ ...h, uid: makeStopUid(h.id) });
						}
					} catch {
						// Ignore supplementary fetch failure
					}
				}

				dayStops = {
					day1: day1Seeds,
					day2: day2Seeds
				};
				activeDay = 'day1';
			}

			await syncMapAndRoute(false);

			const firstInspect = featuredPlace ?? dayStops[activeDay][0] ?? discoveryResults[0];
			if (firstInspect) {
				void inspectInStreetView(firstInspect);
			}
		} catch (err) {
			apiStatusNotice =
				err instanceof Error
					? `Google Maps Places request issue: ${err.message}`
					: 'Google Maps Places request failed.';
		} finally {
			discoveryLoading = false;
		}
	}

	function handleQuickSelectChange(event: Event): void {
		const id = (event.target as HTMLSelectElement).value;
		const preset: DestinationPreset | undefined = DESTINATION_PRESETS.find((p) => p.id === id);
		if (!preset) return;
		selectedPresetId = preset.id;
		void activateDestination(`${preset.name}, ${preset.country}`, preset.center, true);
	}

	function switchDay(day: DayId): void {
		if (activeDay === day) return;
		activeDay = day;
		void syncMapAndRoute(false);
		const first = dayStops[day][0];
		if (first) {
			void inspectInStreetView(first);
		}
	}

	function handleTravelModeChange(event: Event): void {
		travelMode = (event.target as HTMLSelectElement).value as TravelModeChoice;
		void syncMapAndRoute(false);
	}

	async function handleOptimizeRoute(): Promise<void> {
		if (dayStops[activeDay].length < 3) return;
		optimizingRoute = true;
		try {
			await syncMapAndRoute(true);
		} finally {
			optimizingRoute = false;
		}
	}

	function addToDay(place: DiscoveredPlace, targetDay: DayId): void {
		const existing = dayStops[targetDay];
		if (existing.some((s) => s.id === place.id)) {
			activeDay = targetDay;
			void syncMapAndRoute(false);
			return;
		}
		dayStops = {
			...dayStops,
			[targetDay]: [...existing, { ...place, uid: makeStopUid(place.id) }]
		};
		activeDay = targetDay;
		void syncMapAndRoute(false);
		void inspectInStreetView(place);
	}

	function removeStop(uid: string): void {
		dayStops = {
			...dayStops,
			[activeDay]: dayStops[activeDay].filter((s) => s.uid !== uid)
		};
		void syncMapAndRoute(false);
	}

	function moveStop(index: number, direction: -1 | 1): void {
		const list = [...dayStops[activeDay]];
		const target = index + direction;
		if (target < 0 || target >= list.length) return;
		const [item] = list.splice(index, 1);
		list.splice(target, 0, item);
		dayStops = {
			...dayStops,
			[activeDay]: list
		};
		void syncMapAndRoute(false);
	}

	onMount(() => {
		const clockTimer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1000);

		void (async () => {
			const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
			if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
				apiStatusNotice =
					'Set PUBLIC_GOOGLE_MAPS_API_KEY in .env to enable live Google Maps, Places, Routes, Time Zone, and Street View data.';
				return;
			}

			try {
				ensureMapsLoader(apiKey);
				libs = await loadGmpLibraries();

				if (mapEl) {
					mapInstance = new libs.mapsLib.Map(mapEl, {
						center: destinationCenter,
						zoom: 12,
						mapId: 'DEMO_MAP_ID',
						internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
						mapTypeControl: false,
						streetViewControl: true,
						fullscreenControl: true
					});
					infoWindowInstance = new libs.mapsLib.InfoWindow();
				}

				if (streetViewEl) {
					svService = new libs.streetViewLib.StreetViewService();
					svPanorama = new libs.streetViewLib.StreetViewPanorama(streetViewEl, {
						position: destinationCenter,
						pov: { heading: 165, pitch: 4 },
						zoom: 1,
						addressControl: false,
						fullscreenControl: false
					});
				}

				if (autocompleteHostEl) {
					const autocomplete = new libs.placesLib.PlaceAutocompleteElement({
						internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
					});
					autocomplete.placeholder = 'Search destination city or landmark...';
					autocomplete.setAttribute('aria-label', 'Search destination city or landmark');
					autocompleteHostEl.replaceChildren(autocomplete);

					autocomplete.addEventListener('gmp-select', async (event: Event) => {
						const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
						const place = selectEvent.placePrediction?.toPlace();
						if (!place) return;
						await place.fetchFields({
							fields: [
								'id',
								'displayName',
								'formattedAddress',
								'location',
								'viewport',
								'rating',
								'userRatingCount',
								'regularOpeningHours',
								'photos',
								'primaryTypeDisplayName',
								'priceLevel',
								'googleMapsURI',
								'utcOffsetMinutes',
								'timeZone'
							]
						});

						const normalized = normalizePlace(place, 'Destination');
						if (!normalized) return;

						if (mapInstance && place.viewport) {
							mapInstance.fitBounds(place.viewport);
						}

						selectedPresetId = 'custom';
						await activateDestination(
							normalized.name,
							normalized.location,
							true,
							normalized.utcOffsetMinutes,
							normalized.timeZoneId,
							normalized
						);
					});
				}

				gmpReady = true;
				const tokyo = DESTINATION_PRESETS[0];
				await activateDestination(`${tokyo.name}, ${tokyo.country}`, tokyo.center, true, 540, 'Asia/Tokyo');
			} catch (err) {
				apiStatusNotice =
					err instanceof Error
						? `Google Maps initialization notice: ${err.message}`
						: 'Unable to initialize Google Maps JavaScript API.';
			}
		})();

		return () => {
			window.clearInterval(clockTimer);
			clearMapOverlays();
		};
	});
</script>

<div class="app-shell">
	<header class="top-header">
		<div class="brand-group">
			<div class="brand-mark" aria-hidden="true">TP</div>
			<div>
				<h1 class="brand-title">Trip Itinerary Planner</h1>
				<p class="brand-subtitle">Places, Routes, Time Zone &amp; Street View Hub</p>
			</div>
		</div>

		<div class="header-controls">
			<div
				class="autocomplete-host"
				data-testid="destination-search-input"
				bind:this={autocompleteHostEl}
			>
				{#if !gmpReady}
					<input
						class="autocomplete-fallback"
						type="text"
						readonly
						value={destinationName}
						aria-label="Destination search"
					/>
				{/if}
			</div>

			<select
				class="quick-select"
				data-testid="destination-quick-select"
				aria-label="Quick destination selector"
				value={selectedPresetId}
				onchange={handleQuickSelectChange}
			>
				{#if selectedPresetId === 'custom'}
					<option value="custom">{destinationName}</option>
				{/if}
				{#each DESTINATION_PRESETS as preset (preset.id)}
					<option value={preset.id}>{preset.name}, {preset.country}</option>
				{/each}
			</select>
		</div>

		<div class="timezone-hub" data-testid="timezone-hub" aria-live="polite">
			<span class="tz-clock">{formattedClock.timeStr}</span>
			<div class="tz-meta">
				<span class="tz-name" title={timeZoneInfo.timeZoneId}>
					{timeZoneInfo.timeZoneName}
				</span>
				<span class="tz-offset">
					{formattedClock.utcLabel} · {formattedClock.dateStr}
				</span>
			</div>
		</div>
	</header>

	{#if apiStatusNotice}
		<div class="banner-notice" role="status">{apiStatusNotice}</div>
	{/if}

	<main class="workspace-grid">
		<aside class="left-sidebar">
			<!-- Itinerary Section -->
			<section class="sidebar-section" aria-label="Multi-day itinerary">
				<div class="section-header">
					<h2 class="section-title">Multi-Day Itinerary</h2>
					<span class="destination-pill">{destinationName}</span>
				</div>

				<div class="day-tabs" data-testid="itinerary-day-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeDay === 'day1'}
						class="day-tab-btn day1"
						class:active={activeDay === 'day1'}
						onclick={() => switchDay('day1')}
					>
						<span class="day-badge">
							<span class="day-dot" style="background: {DAY_META.day1.color}"></span>
							Day 1
						</span>
						<span class="stop-count">{dayStops.day1.length} stops</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeDay === 'day2'}
						class="day-tab-btn day2"
						class:active={activeDay === 'day2'}
						onclick={() => switchDay('day2')}
					>
						<span class="day-badge">
							<span class="day-dot" style="background: {DAY_META.day2.color}"></span>
							Day 2
						</span>
						<span class="stop-count">{dayStops.day2.length} stops</span>
					</button>
				</div>

				<div class="route-controls">
					<select
						class="mode-select"
						data-testid="travel-mode-select"
						aria-label="Travel mode"
						value={travelMode}
						onchange={handleTravelModeChange}
					>
						<option value="DRIVING">Drive (Routes API)</option>
						<option value="WALKING">Walk</option>
						<option value="TRANSIT">Transit</option>
					</select>

					<button
						type="button"
						class="optimize-btn"
						data-testid="optimize-route-btn"
						disabled={activeStops.length < 3 || optimizingRoute}
						onclick={handleOptimizeRoute}
					>
						{optimizingRoute ? 'Optimizing...' : 'Optimize Order'}
					</button>
				</div>

				<div class="route-summary-bar" data-testid="route-summary-bar">
					<span>
						<strong class="summary-metric">{activeStops.length}</strong> stops ·
						<strong class="summary-metric">{formatDistance(routeSummary.distanceMeters)}</strong>
					</span>
					<span>
						{#if routeLoading}
							Calculating route...
						{:else}
							Est. <strong class="summary-metric">{formatDuration(routeSummary.durationMillis)}</strong>
							{#if routeSummary.isFallback} (direct){/if}
						{/if}
					</span>
				</div>

				<div class="stops-list" data-testid="itinerary-stops-list">
					{#if activeStops.length === 0}
						<div class="empty-state">
							No stops in {activeDayMeta.label} yet. Add attractions, restaurants, or hotels from Discovery below.
						</div>
					{:else}
						{#each activeStops as stop, index (stop.uid)}
							<div
								class="stop-card"
								class:selected={selectedPlaceId === stop.id}
							>
								<div class="stop-row">
									<div
										class="stop-num"
										style="background: {activeDayMeta.color}"
									>
										{index + 1}
									</div>
									<div class="stop-info">
										<p class="stop-name">{stop.name}</p>
										<div class="stop-meta">
											{stop.primaryType}{#if stop.rating !== null} · ★ {stop.rating.toFixed(1)}{/if}
										</div>
									</div>
								</div>

								<div class="stop-actions">
									<button
										type="button"
										class="mini-btn"
										onclick={() => focusPlaceOnMap(stop, index + 1)}
									>
										Street View
									</button>
									<button
										type="button"
										class="mini-btn"
										disabled={index === 0}
										onclick={() => moveStop(index, -1)}
										aria-label="Move stop up"
									>
										↑
									</button>
									<button
										type="button"
										class="mini-btn"
										disabled={index === activeStops.length - 1}
										onclick={() => moveStop(index, 1)}
										aria-label="Move stop down"
									>
										↓
									</button>
									<button
										type="button"
										class="mini-btn danger"
										onclick={() => removeStop(stop.uid)}
									>
										Remove
									</button>
								</div>

								{#if routeSummary.legs[index]}
									<div class="leg-pill">
										↳ Next leg: {formatDistance(routeSummary.legs[index].distanceMeters)} · {formatDuration(routeSummary.legs[index].durationMillis)}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</section>

			<!-- Place Discovery Section -->
			<section class="sidebar-section" aria-label="Place discovery">
				<div class="section-header">
					<h2 class="section-title">Discover Places</h2>
					<span class="destination-pill">Places API (New)</span>
				</div>

				<div class="category-tabs" data-testid="discovery-category-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeCategory === 'attractions'}
						class="category-tab"
						class:active={activeCategory === 'attractions'}
						onclick={() => loadDiscoveryCategory('attractions')}
					>
						Attractions
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeCategory === 'restaurants'}
						class="category-tab"
						class:active={activeCategory === 'restaurants'}
						onclick={() => loadDiscoveryCategory('restaurants')}
					>
						Restaurants
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeCategory === 'hotels'}
						class="category-tab"
						class:active={activeCategory === 'hotels'}
						onclick={() => loadDiscoveryCategory('hotels')}
					>
						Hotels
					</button>
				</div>

				<div class="discovery-list" data-testid="discovery-results-list">
					{#if discoveryLoading}
						<div class="empty-state">Loading live Places API (New) results for {destinationName}...</div>
					{:else if discoveryResults.length === 0}
						<div class="empty-state">
							No places loaded yet. Search a destination or verify your API key configuration.
						</div>
					{:else}
						{#each discoveryResults as place (place.id)}
							<article class="place-card">
								<div class="place-card-top">
									{#if place.photoUrl}
										<img
											class="place-thumb"
											src={place.photoUrl}
											alt={place.name}
											loading="lazy"
										/>
									{:else}
										<div class="place-thumb-placeholder">{place.primaryType}</div>
									{/if}

									<div class="place-details">
										<div class="place-type">{place.primaryType}</div>
										<h3 class="place-name">{place.name}</h3>
										{#if place.rating !== null}
											<div class="place-rating">
												<span class="star" aria-hidden="true">★</span>
												{place.rating.toFixed(1)}
												{#if place.userRatingCount !== null}
													({place.userRatingCount.toLocaleString()})
												{/if}
											</div>
										{/if}
										{#if place.formattedAddress}
											<div class="place-address">{place.formattedAddress}</div>
										{/if}
									</div>
								</div>

								{#if place.weekdayDescriptions.length > 0}
									<div class="place-hours">
										<strong>Hours:</strong> {place.weekdayDescriptions[0]}
									</div>
								{/if}

								<div class="place-card-actions">
									<button
										type="button"
										class="action-btn day1"
										onclick={() => addToDay(place, 'day1')}
									>
										+ Day 1
									</button>
									<button
										type="button"
										class="action-btn day2"
										onclick={() => addToDay(place, 'day2')}
									>
										+ Day 2
									</button>
									<button
										type="button"
										class="action-btn sv"
										onclick={() => focusPlaceOnMap(place)}
									>
										Street View
									</button>
									{#if place.googleMapsUri}
										<a
											class="action-btn"
											href={place.googleMapsUri}
											target="_blank"
											rel="noopener noreferrer"
										>
											Maps ↗
										</a>
									{/if}
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>
		</aside>

		<section class="right-workspace" aria-label="Interactive map and Street View workspace">
			<div class="map-wrapper">
				<div
					class="map-container"
					data-testid="map-container"
					bind:this={mapEl}
				></div>

				<div class="map-legend-chip">
					<span class="day-badge">
						<span class="day-dot" style="background: {activeDayMeta.color}"></span>
						{activeDayMeta.label} Route
					</span>
					<span>·</span>
					<span>{activeStops.length} pins</span>
				</div>
			</div>

			<div class="street-view-panel" data-testid="street-view-panel">
				<div class="sv-header">
					<span class="sv-title">Street View Preview · {streetViewTargetName}</span>
					<span class="sv-status">{streetViewStatus}</span>
				</div>
				<div class="sv-canvas-wrap">
					<div class="sv-canvas" bind:this={streetViewEl}></div>
					{#if !streetViewAvailable}
						<div class="sv-empty">{streetViewStatus}</div>
					{/if}
				</div>
			</div>
		</section>
	</main>
</div>
