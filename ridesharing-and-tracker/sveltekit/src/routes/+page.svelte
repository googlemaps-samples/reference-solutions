<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		CANDIDATE_DRIVERS,
		buildPathMetrics,
		interpolateAlongPath,
		type PathMetrics
	} from '$lib/drivers';
	import {
		calculateFareEstimates,
		computeEcoSavings,
		formatDistanceMiles,
		formatDuration
	} from '$lib/fare';
	import {
		computeDriverMatrix,
		computeSingleApproachRoute,
		computeTripRoutes,
		loadMapsLibraries,
		searchPlaceByText,
		type LoadedMapsLibraries
	} from '$lib/maps';
	import type {
		CandidateDriver,
		ComputedRouteSummary,
		DispatchPhase,
		EmissionType,
		LatLngLiteral,
		PlaceSelection,
		RideTierId,
		RoutePreferenceKind
	} from '$lib/types';

	const INITIAL_CENTER: LatLngLiteral = { lat: 34.0328, lng: -118.3669 };
	const INITIAL_ZOOM = 12;
	const DEFAULT_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
	const DEFAULT_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

	type PlaceAutocompleteEl = google.maps.places.PlaceAutocompleteElement & {
		value?: string;
	};

	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

	let mapContainer: HTMLDivElement | null = null;
	let pickupContainer: HTMLDivElement | null = null;
	let dropoffContainer: HTMLDivElement | null = null;

	let libs: LoadedMapsLibraries | null = null;
	let map: google.maps.Map | null = null;

	let pickupAutocomplete: PlaceAutocompleteEl | null = null;
	let dropoffAutocomplete: PlaceAutocompleteEl | null = null;

	let pickupPlace = $state<PlaceSelection | null>(null);
	let dropoffPlace = $state<PlaceSelection | null>(null);

	let emissionType = $state<EmissionType>('HYBRID');
	let selectedRouteKind = $state<RoutePreferenceKind>('fastest');
	let selectedTier = $state<RideTierId>('green');

	let fastestRoute = $state<ComputedRouteSummary | null>(null);
	let ecoRoute = $state<ComputedRouteSummary | null>(null);

	let candidates = $state<CandidateDriver[]>([...CANDIDATE_DRIVERS]);
	let assignedDriver = $state<CandidateDriver | null>(null);
	let approachRoute = $state<ComputedRouteSummary | null>(null);

	let dispatchPhase = $state<DispatchPhase>('idle');
	let simulationRunning = $state(false);
	let remainingEtaSeconds = $state(0);
	let remainingDistanceMeters = $state(0);
	let tripProgressPercent = $state(0);

	let loadingTrip = $state(false);
	let errorMessage = $state<string | null>(null);
	let mapReady = $state(false);

	// Imperative Google Maps overlays
	let pickupMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let dropoffMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let candidateMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let activeDriverMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let driverArrowEl: HTMLDivElement | null = null;

	let fastestPolyline: google.maps.Polyline | null = null;
	let ecoPolyline: google.maps.Polyline | null = null;
	let approachPolyline: google.maps.Polyline | null = null;

	// Animation state
	let animFrameId: number | null = null;
	let lastFrameTime = 0;
	let currentSubPhase: 'approach' | 'trip' = 'approach';
	let subPhaseProgress = 0;
	let approachMetrics: PathMetrics | null = null;
	let tripMetrics: PathMetrics | null = null;

	const activeRoute = $derived<ComputedRouteSummary | null>(
		selectedRouteKind === 'eco' ? (ecoRoute ?? fastestRoute) : fastestRoute
	);

	const ecoSavings = $derived(computeEcoSavings(fastestRoute, ecoRoute, emissionType));

	const fareEstimates = $derived(
		calculateFareEstimates(
			activeRoute,
			ecoSavings,
			assignedDriver?.approachEtaSeconds ?? null
		)
	);

	const headerStatusLabel = $derived.by(() => {
		switch (dispatchPhase) {
			case 'searching':
				return 'Matching closest driver...';
			case 'approaching':
				return `Driver en route • ${formatDuration(remainingEtaSeconds)}`;
			case 'in_trip':
				return `On trip to drop-off • ${formatDuration(remainingEtaSeconds)}`;
			case 'arrived':
				return 'Arrived at destination';
			default:
				return apiKey ? 'Ready to dispatch in LA' : 'API key required';
		}
	});

	function createSvgCarElement(color: string, labelText?: string): HTMLDivElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'driver-marker-shell';

		const badge = document.createElement('div');
		badge.className = 'driver-marker-puck';
		badge.style.backgroundColor = color;

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '18');
		svg.setAttribute('height', '18');
		svg.setAttribute('fill', '#ffffff');
		svg.setAttribute('aria-hidden', 'true');

		// Navigation arrow / vehicle pointer pointing North (0 deg) so heading rotation aligns cleanly
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z');
		svg.appendChild(path);

		badge.appendChild(svg);
		wrapper.appendChild(badge);

		if (labelText) {
			const tag = document.createElement('span');
			tag.className = 'driver-marker-tag';
			tag.textContent = labelText;
			wrapper.appendChild(tag);
		}

		return wrapper;
	}

	function createCandidateChip(driver: CandidateDriver, isAssigned: boolean): HTMLDivElement {
		const el = document.createElement('div');
		el.className = isAssigned ? 'candidate-chip assigned' : 'candidate-chip';

		const dot = document.createElement('span');
		dot.className = 'candidate-dot';
		dot.style.backgroundColor =
			driver.emissionType === 'ELECTRIC'
				? '#0f9d58'
				: driver.emissionType === 'HYBRID'
					? '#0284c7'
					: '#475569';

		const text = document.createElement('span');
		text.textContent = driver.approachEtaSeconds
			? `${Math.max(1, Math.round(driver.approachEtaSeconds / 60))}m`
			: driver.name.split(' ')[0];

		el.appendChild(dot);
		el.appendChild(text);
		return el;
	}

	function stopAnimation() {
		if (animFrameId !== null) {
			cancelAnimationFrame(animFrameId);
			animFrameId = null;
		}
		simulationRunning = false;
	}

	function clearRouteOverlays() {
		fastestPolyline?.setMap(null);
		ecoPolyline?.setMap(null);
		approachPolyline?.setMap(null);
		fastestPolyline = null;
		ecoPolyline = null;
		approachPolyline = null;
	}

	function clearCandidateMarkers() {
		for (const m of candidateMarkers) {
			m.map = null;
		}
		candidateMarkers = [];
	}

	function updateEndpointMarkers() {
		if (!libs || !map) return;
		const { AdvancedMarkerElement, PinElement } = libs.marker;

		if (pickupPlace) {
			if (!pickupMarker) {
				const pin = new PinElement({
					background: '#1a73e8',
					borderColor: '#0f4c81',
					glyphColor: '#ffffff',
					glyphText: 'P',
					scale: 1.15
				});
				pickupMarker = new AdvancedMarkerElement({
					map,
					position: pickupPlace.location,
					title: `Pickup: ${pickupPlace.displayName}`,
					zIndex: 30
				});
				pickupMarker.append(pin);
			} else {
				pickupMarker.position = pickupPlace.location;
				pickupMarker.title = `Pickup: ${pickupPlace.displayName}`;
				pickupMarker.map = map;
			}
		}

		if (dropoffPlace) {
			if (!dropoffMarker) {
				const pin = new PinElement({
					background: '#d93025',
					borderColor: '#8c1d18',
					glyphColor: '#ffffff',
					glyphText: 'D',
					scale: 1.15
				});
				dropoffMarker = new AdvancedMarkerElement({
					map,
					position: dropoffPlace.location,
					title: `Drop-off: ${dropoffPlace.displayName}`,
					zIndex: 30
				});
				dropoffMarker.append(pin);
			} else {
				dropoffMarker.position = dropoffPlace.location;
				dropoffMarker.title = `Drop-off: ${dropoffPlace.displayName}`;
				dropoffMarker.map = map;
			}
		}
	}

	function renderPolylines(fitViewport = true) {
		if (!libs || !map) return;
		const { Polyline } = libs.maps;

		clearRouteOverlays();

		if (fastestRoute && fastestRoute.path.length > 0) {
			const isSelected = selectedRouteKind === 'fastest';
			fastestPolyline = new Polyline({
				path: fastestRoute.path,
				map,
				strokeColor: isSelected ? '#1a73e8' : '#94a3b8',
				strokeOpacity: isSelected ? 0.95 : 0.65,
				strokeWeight: isSelected ? 6 : 4,
				zIndex: isSelected ? 15 : 8
			});
		}

		if (ecoRoute && ecoRoute.path.length > 0) {
			const isSelected = selectedRouteKind === 'eco';
			ecoPolyline = new Polyline({
				path: ecoRoute.path,
				map,
				strokeColor: isSelected ? '#0f9d58' : '#34a853',
				strokeOpacity: isSelected ? 0.95 : 0.65,
				strokeWeight: isSelected ? 6 : 4,
				zIndex: isSelected ? 16 : 9
			});
		}

		if (approachRoute && approachRoute.path.length > 0 && dispatchPhase === 'approaching') {
			approachPolyline = new Polyline({
				path: approachRoute.path,
				map,
				strokeColor: '#0284c7',
				strokeOpacity: 0,
				icons: [
					{
						icon: {
							path: 'M 0,-1 0,1',
							strokeOpacity: 0.9,
							strokeColor: '#0284c7',
							scale: 3
						},
						offset: '0',
						repeat: '12px'
					}
				],
				zIndex: 12
			});
		}

		if (fitViewport && pickupPlace && dropoffPlace) {
			const bounds = new libs.core.LatLngBounds();
			bounds.extend(pickupPlace.location);
			bounds.extend(dropoffPlace.location);
			for (const pt of fastestRoute?.path ?? []) bounds.extend(pt);
			for (const pt of ecoRoute?.path ?? []) bounds.extend(pt);
			map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
		}
	}

	function renderCandidateMarkers() {
		if (!libs || !map) return;
		clearCandidateMarkers();
		const { AdvancedMarkerElement } = libs.marker;

		for (const driver of candidates) {
			// Skip drawing static chip for the actively animating driver
			if (assignedDriver && driver.id === assignedDriver.id && dispatchPhase !== 'idle') {
				continue;
			}
			const marker = new AdvancedMarkerElement({
				map,
				position: driver.location,
				title: `${driver.name} • ${driver.vehicle}`,
				zIndex: 18
			});
			marker.append(createCandidateChip(driver, false));
			candidateMarkers.push(marker);
		}
	}

	async function evaluateAndDispatchClosestDriver(startAnimationImmediately = true) {
		if (!libs || !map || !pickupPlace || !activeRoute) return;

		dispatchPhase = 'searching';
		stopAnimation();

		try {
			const matrixResults = await computeDriverMatrix(
				CANDIDATE_DRIVERS.map((d) => d.location),
				pickupPlace.location,
				libs
			);

			const enriched = CANDIDATE_DRIVERS.map((driver, idx) => {
				const match = matrixResults.find((m) => m.originIndex === idx);
				return {
					...driver,
					approachEtaSeconds: match?.durationSeconds ?? 240,
					approachDistanceMeters: match?.distanceMeters ?? 1800
				};
			}).sort((a, b) => (a.approachEtaSeconds ?? 9999) - (b.approachEtaSeconds ?? 9999));

			candidates = enriched;
			const closest = enriched[0];
			assignedDriver = closest;

			const approach = await computeSingleApproachRoute(
				closest.location,
				pickupPlace.location,
				closest.emissionType,
				libs
			);
			approachRoute = approach;

			const distFn = (a: LatLngLiteral, b: LatLngLiteral) =>
				libs!.geometry.spherical.computeDistanceBetween(a, b);

			approachMetrics = buildPathMetrics(
				approach?.path && approach.path.length > 1
					? approach.path
					: [closest.location, pickupPlace.location],
				distFn
			);
			tripMetrics = buildPathMetrics(activeRoute.path, distFn);

			// Create or reposition live driver AdvancedMarkerElement
			if (!activeDriverMarker) {
				driverArrowEl = createSvgCarElement('#0f172a', closest.name.split(' ')[0]);
				activeDriverMarker = new libs.marker.AdvancedMarkerElement({
					map,
					position: closest.location,
					title: `${closest.name} (${closest.vehicle})`,
					zIndex: 50
				});
				activeDriverMarker.append(driverArrowEl);
			} else {
				const newEl = createSvgCarElement('#0f172a', closest.name.split(' ')[0]);
				activeDriverMarker.replaceChildren(newEl);
				driverArrowEl = newEl;
				activeDriverMarker.position = closest.location;
				activeDriverMarker.map = map;
			}

			dispatchPhase = 'approaching';
			currentSubPhase = 'approach';
			subPhaseProgress = 0;
			tripProgressPercent = 0;
			remainingEtaSeconds = approach?.durationSeconds ?? closest.approachEtaSeconds ?? 240;
			remainingDistanceMeters =
				approach?.distanceMeters ?? closest.approachDistanceMeters ?? 1800;

			renderCandidateMarkers();
			renderPolylines(false);

			if (startAnimationImmediately) {
				startDriverAnimation();
			}
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Unable to evaluate nearby drivers.';
			dispatchPhase = 'idle';
		}
	}

	function startDriverAnimation() {
		if (!libs || !activeDriverMarker || !approachMetrics || !tripMetrics) return;
		if (dispatchPhase === 'arrived') {
			currentSubPhase = 'approach';
			subPhaseProgress = 0;
			tripProgressPercent = 0;
			dispatchPhase = 'approaching';
			renderPolylines(false);
		}

		simulationRunning = true;
		lastFrameTime = performance.now();

		const step = (now: number) => {
			if (!simulationRunning || !libs || !activeDriverMarker || !approachMetrics || !tripMetrics) {
				return;
			}
			const dtSeconds = Math.min(0.1, (now - lastFrameTime) / 1000);
			lastFrameTime = now;

			const headingFn = (a: LatLngLiteral, b: LatLngLiteral) =>
				libs!.geometry.spherical.computeHeading(a, b);

			// Smoothly traverse approach in ~8s real time, then trip in ~18s real time
			if (currentSubPhase === 'approach') {
				subPhaseProgress = Math.min(1, subPhaseProgress + dtSeconds / 8);
				const { position, heading } = interpolateAlongPath(
					approachMetrics,
					subPhaseProgress,
					headingFn
				);
				activeDriverMarker.position = position;
				const puck = driverArrowEl?.querySelector('.driver-marker-puck') as HTMLElement | null;
				if (puck) {
					puck.style.transform = `rotate(${Math.round(heading)}deg)`;
				}

				const totalApproachEta =
					approachRoute?.durationSeconds ?? assignedDriver?.approachEtaSeconds ?? 240;
				const totalApproachDist =
					approachRoute?.distanceMeters ?? assignedDriver?.approachDistanceMeters ?? 1800;

				remainingEtaSeconds = Math.max(0, Math.round(totalApproachEta * (1 - subPhaseProgress)));
				remainingDistanceMeters = Math.max(
					0,
					Math.round(totalApproachDist * (1 - subPhaseProgress))
				);
				tripProgressPercent = Math.round(subPhaseProgress * 25);

				if (subPhaseProgress >= 1) {
					currentSubPhase = 'trip';
					subPhaseProgress = 0;
					dispatchPhase = 'in_trip';
					approachPolyline?.setMap(null);
				}
			} else {
				subPhaseProgress = Math.min(1, subPhaseProgress + dtSeconds / 18);
				const { position, heading } = interpolateAlongPath(
					tripMetrics,
					subPhaseProgress,
					headingFn
				);
				activeDriverMarker.position = position;
				const puck = driverArrowEl?.querySelector('.driver-marker-puck') as HTMLElement | null;
				if (puck) {
					puck.style.transform = `rotate(${Math.round(heading)}deg)`;
				}

				const totalTripEta = activeRoute?.durationSeconds ?? 1200;
				const totalTripDist = activeRoute?.distanceMeters ?? 20000;

				remainingEtaSeconds = Math.max(0, Math.round(totalTripEta * (1 - subPhaseProgress)));
				remainingDistanceMeters = Math.max(
					0,
					Math.round(totalTripDist * (1 - subPhaseProgress))
				);
				tripProgressPercent = 25 + Math.round(subPhaseProgress * 75);

				if (subPhaseProgress >= 1) {
					dispatchPhase = 'arrived';
					simulationRunning = false;
					remainingEtaSeconds = 0;
					remainingDistanceMeters = 0;
					tripProgressPercent = 100;
					animFrameId = null;
					return;
				}
			}

			animFrameId = requestAnimationFrame(step);
		};

		animFrameId = requestAnimationFrame(step);
	}

	function toggleSimulation() {
		if (simulationRunning) {
			stopAnimation();
		} else {
			if (!assignedDriver || dispatchPhase === 'idle') {
				void evaluateAndDispatchClosestDriver(true);
			} else {
				startDriverAnimation();
			}
		}
	}

	async function recomputeTrip(fitViewport = true) {
		if (!libs || !pickupPlace || !dropoffPlace) return;
		loadingTrip = true;
		errorMessage = null;

		try {
			const result = await computeTripRoutes(
				pickupPlace.location,
				dropoffPlace.location,
				emissionType,
				libs
			);
			fastestRoute = result.fastest;
			ecoRoute = result.eco;

			updateEndpointMarkers();
			renderPolylines(fitViewport);

			await evaluateAndDispatchClosestDriver(true);
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Unable to compute routes for this trip.';
		} finally {
			loadingTrip = false;
		}
	}

	function selectRouteKind(kind: RoutePreferenceKind) {
		selectedRouteKind = kind;
		renderPolylines(false);
		if (libs && activeRoute) {
			const distFn = (a: LatLngLiteral, b: LatLngLiteral) =>
				libs!.geometry.spherical.computeDistanceBetween(a, b);
			tripMetrics = buildPathMetrics(activeRoute.path, distFn);
			if (currentSubPhase === 'trip') {
				remainingEtaSeconds = Math.max(
					0,
					Math.round(activeRoute.durationSeconds * (1 - subPhaseProgress))
				);
				remainingDistanceMeters = Math.max(
					0,
					Math.round(activeRoute.distanceMeters * (1 - subPhaseProgress))
				);
			}
		}
	}

	async function handleEmissionChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		emissionType = target.value as EmissionType;
		await recomputeTrip(false);
	}

	async function handleSwapLocations() {
		if (!pickupPlace || !dropoffPlace) return;
		const prevPickup = pickupPlace;
		pickupPlace = dropoffPlace;
		dropoffPlace = prevPickup;

		if (pickupAutocomplete) {
			pickupAutocomplete.value = pickupPlace.formattedAddress || pickupPlace.displayName;
		}
		if (dropoffAutocomplete) {
			dropoffAutocomplete.value = dropoffPlace.formattedAddress || dropoffPlace.displayName;
		}

		await recomputeTrip(true);
	}

	function mountAutocompleteWidget(
		host: HTMLDivElement,
		placeholder: string,
		initialValue: string,
		onSelect: (place: PlaceSelection) => void
	): PlaceAutocompleteEl | null {
		if (!libs) return null;
		const el = new libs.places.PlaceAutocompleteElement({
			includedRegionCodes: ['us'],
			locationBias: {
				center: INITIAL_CENTER,
				radius: 45000
			}
		}) as PlaceAutocompleteEl;

		el.placeholder = placeholder;
		el.value = initialValue;

		el.addEventListener('gmp-select', async (event: Event) => {
			const selectEvent = event as unknown as {
				placePrediction?: google.maps.places.PlacePrediction;
			};
			const prediction = selectEvent.placePrediction;
			if (!prediction) return;

			const place = prediction.toPlace();
			await place.fetchFields({
				fields: ['id', 'displayName', 'formattedAddress', 'location']
			});
			if (!place.location) return;

			onSelect({
				id: place.id ?? '',
				displayName: place.displayName ?? place.formattedAddress ?? initialValue,
				formattedAddress: place.formattedAddress ?? place.displayName ?? initialValue,
				location: {
					lat: place.location.lat(),
					lng: place.location.lng()
				}
			});
		});

		host.replaceChildren(el);
		return el;
	}

	onMount(async () => {
		if (!apiKey) {
			errorMessage =
				'Missing PUBLIC_GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add your Google Maps Platform key (or free Maps Demo Key) to load live Los Angeles maps, Places, and Routes.';
			return;
		}

		try {
			libs = await loadMapsLibraries(apiKey);

			if (!mapContainer) return;
			map = new libs.maps.Map(mapContainer, {
				center: INITIAL_CENTER,
				zoom: INITIAL_ZOOM,
				mapId: 'DEMO_MAP_ID',
				internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true
			});
			mapReady = true;

			if (pickupContainer) {
				pickupAutocomplete = mountAutocompleteWidget(
					pickupContainer,
					'Enter Los Angeles pickup...',
					DEFAULT_PICKUP_QUERY,
					(selected) => {
						pickupPlace = selected;
						void recomputeTrip(true);
					}
				);
			}

			if (dropoffContainer) {
				dropoffAutocomplete = mountAutocompleteWidget(
					dropoffContainer,
					'Enter destination...',
					DEFAULT_DROPOFF_QUERY,
					(selected) => {
						dropoffPlace = selected;
						void recomputeTrip(true);
					}
				);
			}

			loadingTrip = true;
			const [resolvedPickup, resolvedDropoff] = await Promise.all([
				searchPlaceByText(DEFAULT_PICKUP_QUERY, libs.places),
				searchPlaceByText(DEFAULT_DROPOFF_QUERY, libs.places)
			]);

			if (resolvedPickup && resolvedDropoff) {
				pickupPlace = resolvedPickup;
				dropoffPlace = resolvedDropoff;
				if (pickupAutocomplete) {
					pickupAutocomplete.value =
						resolvedPickup.formattedAddress || resolvedPickup.displayName;
				}
				if (dropoffAutocomplete) {
					dropoffAutocomplete.value =
						resolvedDropoff.formattedAddress || resolvedDropoff.displayName;
				}
				await recomputeTrip(true);
			} else {
				errorMessage = 'Could not resolve pre-seeded Los Angeles pickup/drop-off places.';
			}
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform.';
		} finally {
			loadingTrip = false;
		}
	});

	onDestroy(() => {
		stopAnimation();
		clearRouteOverlays();
		clearCandidateMarkers();
		if (pickupMarker) pickupMarker.map = null;
		if (dropoffMarker) dropoffMarker.map = null;
		if (activeDriverMarker) activeDriverMarker.map = null;
	});
</script>

<div class="app-shell">
	<header class="top-header">
		<div class="brand-group">
			<div class="brand-badge" aria-hidden="true">LA</div>
			<div>
				<h1 class="brand-title">LA RideFlow</h1>
				<p class="brand-subtitle">Eco Dispatch &amp; Live Fare Estimator</p>
			</div>
		</div>

		<div class="header-trip-summary">
			{#if pickupPlace && dropoffPlace}
				<span class="trip-chip">
					<strong>{pickupPlace.displayName}</strong>
					<span aria-hidden="true">→</span>
					<strong>{dropoffPlace.displayName}</strong>
				</span>
			{:else}
				<span class="trip-chip">Los Angeles Metro • Union Station → Santa Monica Pier</span>
			{/if}
		</div>

		<div class="status-pill" data-phase={dispatchPhase}>
			<span class="status-dot"></span>
			<span>{headerStatusLabel}</span>
		</div>
	</header>

	<div class="workspace-grid">
		<aside class="sidebar">
			{#if errorMessage}
				<div class="alert-banner" role="alert">
					<p>{errorMessage}</p>
				</div>
			{/if}

			<!-- Section 1: Trip Planner -->
			<section class="panel-card">
				<div class="panel-header">
					<h2>Trip Planner</h2>
					<button
						type="button"
						class="swap-btn"
						data-testid="swap-locations-btn"
						onclick={handleSwapLocations}
						disabled={!pickupPlace || !dropoffPlace || loadingTrip}
						title="Swap pickup and drop-off"
					>
						⇅ Swap
					</button>
				</div>

				<div class="field-group">
					<label class="field-label" for="pickup-host">
						<span class="pin-dot pickup"></span>
						Pickup Location
					</label>
					<div
						id="pickup-host"
						class="autocomplete-host"
						data-testid="pickup-autocomplete"
						bind:this={pickupContainer}
					></div>
				</div>

				<div class="field-group">
					<label class="field-label" for="dropoff-host">
						<span class="pin-dot dropoff"></span>
						Drop-off Destination
					</label>
					<div
						id="dropoff-host"
						class="autocomplete-host"
						data-testid="dropoff-autocomplete"
						bind:this={dropoffContainer}
					></div>
				</div>
			</section>

			<!-- Section 2: Fastest vs Eco-Friendly Route Comparison -->
			<section class="panel-card">
				<div class="panel-header">
					<h2>Route Comparison</h2>
					<label class="emission-picker">
						<span class="sr-only">Vehicle emission type</span>
						<select
							data-testid="emission-type-select"
							value={emissionType}
							onchange={handleEmissionChange}
							disabled={loadingTrip}
						>
							<option value="HYBRID">Hybrid</option>
							<option value="ELECTRIC">Electric (EV)</option>
							<option value="GASOLINE">Gasoline</option>
						</select>
					</label>
				</div>

				<div class="route-cards">
					<button
						type="button"
						class="route-card"
						class:selected={selectedRouteKind === 'fastest'}
						data-testid="route-option-fastest"
						onclick={() => selectRouteKind('fastest')}
					>
						<div class="route-card-top">
							<span class="route-badge fastest">Fastest</span>
							<span class="route-eta">
								{fastestRoute ? fastestRoute.localizedDuration : loadingTrip ? 'Computing...' : '—'}
							</span>
						</div>
						<div class="route-card-meta">
							<span>{fastestRoute ? fastestRoute.localizedDistance : 'Traffic-aware'}</span>
							{#if fastestRoute && fastestRoute.fuelConsumptionMicroliters > 0}
								<span>
									{(fastestRoute.fuelConsumptionMicroliters / 1_000_000).toFixed(2)} L eq.
								</span>
							{/if}
						</div>
					</button>

					<button
						type="button"
						class="route-card eco"
						class:selected={selectedRouteKind === 'eco'}
						data-testid="route-option-eco"
						onclick={() => selectRouteKind('eco')}
					>
						<div class="route-card-top">
							<span class="route-badge eco">Eco-Friendly</span>
							<span class="route-eta">
								{ecoRoute ? ecoRoute.localizedDuration : loadingTrip ? 'Computing...' : '—'}
							</span>
						</div>
						<div class="route-card-meta">
							<span>{ecoRoute ? ecoRoute.localizedDistance : 'Fuel-efficient'}</span>
							{#if ecoRoute && ecoRoute.fuelConsumptionMicroliters > 0}
								<span>
									{(ecoRoute.fuelConsumptionMicroliters / 1_000_000).toFixed(2)} L eq.
								</span>
							{/if}
						</div>
					</button>
				</div>

				<div class="eco-banner" data-testid="eco-savings-banner">
					{#if fastestRoute && ecoRoute}
						{#if ecoSavings.fuelSavedLiters > 0.01}
							<div class="eco-banner-title">
								Eco route saves {ecoSavings.fuelSavedPercent.toFixed(1)}% fuel ({ecoSavings.fuelSavedLiters.toFixed(2)} L)
							</div>
							<div class="eco-banner-sub">
								~{ecoSavings.co2SavedKg.toFixed(2)} kg CO₂ &amp; {ecoSavings.energySavedKwh.toFixed(1)} kWh saved
								{#if ecoSavings.timeDeltaSeconds > 30}
									• +{Math.round(ecoSavings.timeDeltaSeconds / 60)} min vs. fastest
								{:else}
									• Same arrival window
								{/if}
							</div>
						{:else}
							<div class="eco-banner-title">
								Optimal route is already the most fuel-efficient ({emissionType.toLowerCase()})
							</div>
							<div class="eco-banner-sub">
								Est. consumption: {((ecoRoute.fuelConsumptionMicroliters || 0) / 1_000_000).toFixed(2)} L gasoline eq.
							</div>
						{/if}
					{:else}
						<div class="eco-banner-title">Eco-Friendly Routing &amp; Fuel Insights</div>
						<div class="eco-banner-sub">
							Comparing TRAFFIC_AWARE_OPTIMAL vs. FUEL_EFFICIENT routes
						</div>
					{/if}
				</div>
			</section>

			<!-- Section 3: Transparent Fare Estimator -->
			<section class="panel-card">
				<div class="panel-header">
					<h2>Fare Estimator</h2>
					{#if activeRoute}
						<span class="meta-pill">
							{formatDistanceMiles(activeRoute.distanceMeters)} • {formatDuration(activeRoute.durationSeconds)}
						</span>
					{/if}
				</div>

				<div class="fare-list">
					{#each fareEstimates as fare (fare.tier)}
						<button
							type="button"
							class="fare-card"
							class:selected={selectedTier === fare.tier}
							class:is-green={fare.tier === 'green'}
							data-testid={`fare-tier-${fare.tier}`}
							onclick={() => (selectedTier = fare.tier)}
						>
							<div class="fare-main">
								<div>
									<div class="fare-title-row">
										<strong>{fare.name}</strong>
										<span class="fare-eta-tag">{fare.etaMinutes} min away</span>
									</div>
									<div class="fare-sub">{fare.vehicleExample}</div>
								</div>
								<div class="fare-price">
									{fare.totalFare > 0 ? `$${fare.totalFare.toFixed(2)}` : '—'}
								</div>
							</div>

							<div class="fare-breakdown">
								<span>Base ${fare.baseFare.toFixed(2)}</span>
								<span>Dist ${fare.distanceFare.toFixed(2)}</span>
								<span>Time ${fare.timeFare.toFixed(2)}</span>
								<span>Fee ${fare.bookingFee.toFixed(2)}</span>
							</div>

							{#if fare.ecoSavingsLabel}
								<div class="fare-eco-note">{fare.ecoSavingsLabel}</div>
							{/if}
						</button>
					{/each}
				</div>
			</section>

			<!-- Section 4: Live Driver Dispatch & ETA Tracker -->
			<section class="panel-card">
				<div class="panel-header">
					<h2>Live Driver Dispatch</h2>
					{#if assignedDriver}
						<span class="rating-pill">★ {assignedDriver.rating}</span>
					{/if}
				</div>

				<div class="driver-status-box" data-testid="driver-live-eta">
					{#if assignedDriver}
						<div class="driver-identity">
							<div>
								<div class="driver-name">{assignedDriver.name}</div>
								<div class="driver-vehicle">
									{assignedDriver.vehicle} • {assignedDriver.plate} ({assignedDriver.neighborhood})
								</div>
							</div>
							<div class="driver-eta-metric">
								<span class="eta-value">
									{dispatchPhase === 'arrived' ? 'Arrived' : formatDuration(remainingEtaSeconds)}
								</span>
								<span class="eta-dist">
									{dispatchPhase === 'arrived'
										? '0.0 mi'
										: formatDistanceMiles(remainingDistanceMeters)}
								</span>
							</div>
						</div>

						<div class="progress-track" aria-label="Trip progress">
							<div class="progress-fill" style={`width: ${tripProgressPercent}%`}></div>
						</div>
						<div class="progress-caption">
							<span>
								{#if dispatchPhase === 'approaching'}
									Heading to pickup
								{:else if dispatchPhase === 'in_trip'}
									En route to drop-off ({selectedRouteKind === 'eco' ? 'Eco' : 'Fastest'})
								{:else if dispatchPhase === 'arrived'}
									Trip completed
								{:else}
									Driver matched via Route Matrix
								{/if}
							</span>
							<span>{tripProgressPercent}%</span>
						</div>
					{:else}
						<div class="driver-placeholder">
							{loadingTrip
								? 'Evaluating nearby LA candidate drivers via Route Matrix...'
								: 'Select pickup & drop-off to dispatch the closest driver.'}
						</div>
					{/if}
				</div>

				<div class="dispatch-actions">
					<button
						type="button"
						class="primary-btn"
						data-testid="dispatch-driver-btn"
						onclick={() => evaluateAndDispatchClosestDriver(true)}
						disabled={!pickupPlace || !activeRoute || loadingTrip}
					>
						{dispatchPhase === 'idle' ? 'Dispatch Closest Driver' : 'Re-Dispatch Driver'}
					</button>
					<button
						type="button"
						class="secondary-btn"
						data-testid="toggle-simulation-btn"
						onclick={toggleSimulation}
						disabled={!pickupPlace || !activeRoute || loadingTrip}
					>
						{simulationRunning ? 'Pause' : dispatchPhase === 'arrived' ? 'Replay' : 'Resume'}
					</button>
				</div>
			</section>
		</aside>

		<main class="map-stage">
			<div
				class="map-canvas"
				data-testid="rideshare-map"
				bind:this={mapContainer}
			>
				{#if !mapReady && !apiKey}
					<div class="map-empty-state">
						<h3>Google Map Canvas Ready</h3>
						<p>
							Add <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> to render the
							live Los Angeles vector map, Routes API comparison, and animated driver marker.
						</p>
					</div>
				{/if}
			</div>

			<div class="map-legend" data-testid="map-route-legend">
				<div class="legend-item">
					<span class="legend-line fastest"></span>
					<span>Fastest Route</span>
				</div>
				<div class="legend-item">
					<span class="legend-line eco"></span>
					<span>Eco-Friendly Route</span>
				</div>
				<div class="legend-item">
					<span class="legend-dot pickup"></span>
					<span>Pickup (P)</span>
				</div>
				<div class="legend-item">
					<span class="legend-dot dropoff"></span>
					<span>Drop-off (D)</span>
				</div>
				<div class="legend-item">
					<span class="legend-dot driver"></span>
					<span>Live Driver</span>
				</div>
			</div>
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg-app);
	}

	.top-header {
		height: 56px;
		padding: 0 20px;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-shrink: 0;
		z-index: 20;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.brand-badge {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: linear-gradient(135deg, #1a73e8, #0f9d58);
		color: #ffffff;
		font-weight: 700;
		font-size: 13px;
		display: grid;
		place-items: center;
		letter-spacing: 0.03em;
	}

	.brand-title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.2;
	}

	.brand-subtitle {
		margin: 0;
		font-size: 11px;
		color: var(--text-muted);
	}

	.header-trip-summary {
		display: none;
	}

	@media (min-width: 1024px) {
		.header-trip-summary {
			display: flex;
			align-items: center;
		}
	}

	.trip-chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px;
		border-radius: 999px;
		background: var(--bg-muted);
		border: 1px solid var(--border-subtle);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		background: var(--brand-blue-soft);
		color: var(--brand-blue-dark);
		white-space: nowrap;
	}

	.status-pill[data-phase='in_trip'],
	.status-pill[data-phase='arrived'] {
		background: var(--eco-green-soft);
		color: var(--eco-green-dark);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.workspace-grid {
		display: flex;
		flex: 1;
		min-height: calc(100vh - 56px);
	}

	.sidebar {
		width: 400px;
		max-width: 100%;
		background: var(--bg-app);
		border-right: 1px solid var(--border-subtle);
		padding: 14px;
		overflow-y: auto;
		max-height: calc(100vh - 56px);
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex-shrink: 0;
	}

	.alert-banner {
		background: var(--amber-soft);
		border: 1px solid #fcd34d;
		color: #92400e;
		border-radius: 10px;
		padding: 10px 12px;
		font-size: 12px;
		line-height: 1.45;
	}

	.alert-banner p {
		margin: 0;
	}

	.panel-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		padding: 14px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.panel-header h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.swap-btn {
		border: 1px solid var(--border-strong);
		background: var(--bg-surface);
		color: var(--text-secondary);
		border-radius: 8px;
		padding: 4px 10px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.swap-btn:hover:not(:disabled) {
		background: var(--bg-muted);
		color: var(--text-primary);
	}

	.swap-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.field-label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.pin-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.pin-dot.pickup {
		background: #1a73e8;
	}

	.pin-dot.dropoff {
		background: #d93025;
	}

	.autocomplete-host {
		min-height: 40px;
	}

	.emission-picker select {
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		padding: 4px 8px;
		font-size: 12px;
		font-weight: 600;
		background: var(--bg-surface);
		color: var(--text-primary);
		cursor: pointer;
	}

	.route-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.route-card {
		border: 1.5px solid var(--border-subtle);
		background: var(--bg-surface);
		border-radius: 10px;
		padding: 10px;
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 6px;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.route-card.selected {
		border-color: var(--brand-blue);
		background: var(--brand-blue-soft);
	}

	.route-card.eco.selected {
		border-color: var(--eco-green);
		background: var(--eco-green-soft);
	}

	.route-card-top {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.route-badge {
		display: inline-block;
		align-self: flex-start;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 6px;
		border-radius: 6px;
	}

	.route-badge.fastest {
		background: #dbeafe;
		color: #1e40af;
	}

	.route-badge.eco {
		background: #dcfce7;
		color: #166534;
	}

	.route-eta {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.route-card-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.eco-banner {
		background: var(--eco-green-soft);
		border: 1px solid #b7e1cd;
		border-radius: 10px;
		padding: 9px 11px;
		color: var(--eco-green-dark);
	}

	.eco-banner-title {
		font-size: 12px;
		font-weight: 700;
	}

	.eco-banner-sub {
		font-size: 11px;
		margin-top: 2px;
		opacity: 0.9;
	}

	.meta-pill,
	.rating-pill {
		font-size: 11px;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 999px;
		background: var(--bg-muted);
		color: var(--text-secondary);
	}

	.fare-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.fare-card {
		border: 1.5px solid var(--border-subtle);
		background: var(--bg-surface);
		border-radius: 10px;
		padding: 10px 12px;
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fare-card.selected {
		border-color: var(--brand-blue);
		background: #f8fbff;
	}

	.fare-card.is-green.selected {
		border-color: var(--eco-green);
		background: #f4fbf7;
	}

	.fare-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.fare-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}

	.fare-eta-tag {
		font-size: 11px;
		color: var(--text-muted);
	}

	.fare-sub {
		font-size: 11px;
		color: var(--text-secondary);
		margin-top: 1px;
	}

	.fare-price {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.fare-breakdown {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.fare-eco-note {
		font-size: 11px;
		font-weight: 600;
		color: var(--eco-green-dark);
	}

	.driver-status-box {
		background: var(--bg-muted);
		border-radius: 10px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.driver-identity {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.driver-name {
		font-size: 13px;
		font-weight: 700;
	}

	.driver-vehicle {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.driver-eta-metric {
		text-align: right;
	}

	.eta-value {
		display: block;
		font-size: 14px;
		font-weight: 700;
		color: var(--brand-blue-dark);
	}

	.eta-dist {
		font-size: 11px;
		color: var(--text-muted);
	}

	.progress-track {
		height: 6px;
		border-radius: 999px;
		background: #cbd5e1;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #1a73e8, #0f9d58);
		transition: width 0.25s linear;
	}

	.progress-caption {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.driver-placeholder {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.dispatch-actions {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}

	.primary-btn {
		border: none;
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 13px;
		font-weight: 600;
		background: var(--brand-blue);
		color: #ffffff;
		cursor: pointer;
	}

	.primary-btn:hover:not(:disabled) {
		background: var(--brand-blue-dark);
	}

	.secondary-btn {
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 13px;
		font-weight: 600;
		background: var(--bg-surface);
		color: var(--text-primary);
		cursor: pointer;
	}

	.primary-btn:disabled,
	.secondary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.map-stage {
		flex: 1;
		position: relative;
		min-height: 560px;
		height: calc(100vh - 56px);
	}

	.map-canvas {
		width: 100%;
		height: 100%;
		min-height: 560px;
		background: #e2e8f0;
	}

	.map-empty-state {
		height: 100%;
		min-height: 560px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 24px;
		color: var(--text-secondary);
	}

	.map-empty-state h3 {
		margin: 0 0 8px;
		color: var(--text-primary);
	}

	.map-legend {
		position: absolute;
		bottom: 20px;
		left: 20px;
		background: rgba(255, 255, 255, 0.94);
		backdrop-filter: blur(8px);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 8px 12px;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		z-index: 10;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.legend-line {
		width: 18px;
		height: 4px;
		border-radius: 999px;
	}

	.legend-line.fastest {
		background: #1a73e8;
	}

	.legend-line.eco {
		background: #0f9d58;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.legend-dot.pickup {
		background: #1a73e8;
	}

	.legend-dot.dropoff {
		background: #d93025;
	}

	.legend-dot.driver {
		background: #0f172a;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	/* Marker DOM elements appended to AdvancedMarkerElement */
	:global(.driver-marker-shell) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
	}

	:global(.driver-marker-puck) {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 2.5px solid #ffffff;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
		display: grid;
		place-items: center;
		transition: transform 0.12s linear;
	}

	:global(.driver-marker-tag) {
		background: #0f172a;
		color: #ffffff;
		font-size: 10px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 999px;
		white-space: nowrap;
	}

	:global(.candidate-chip) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #ffffff;
		color: #0f172a;
		border: 1.5px solid #cbd5e1;
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 11px;
		font-weight: 700;
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
	}

	:global(.candidate-dot) {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}

	@media (max-width: 900px) {
		.workspace-grid {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			max-height: none;
			border-right: none;
			border-bottom: 1px solid var(--border-subtle);
		}
		.map-stage,
		.map-canvas {
			height: 560px;
		}
	}
</style>
