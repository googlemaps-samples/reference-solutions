<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import ElevationChart from '$lib/components/ElevationChart.svelte';
	import { loadGoogleMapsLibraries, type LoadedGoogleMapsLibraries } from '$lib/maps/loader';
	import {
		mountPlaceAutocomplete,
		resolvePlaceByText,
		SEED_DESTINATION_QUERY,
		SEED_ORIGIN_QUERY
	} from '$lib/maps/places';
	import { computeRoutesForMode } from '$lib/maps/routes';
	import { fetchElevationProfile } from '$lib/maps/elevation';
	import type {
		ComputedRouteSummary,
		ElevationProfileSummary,
		ElevationSamplePoint,
		ModeComparisonEntry,
		ResolvedPlace,
		RouteModifiersState,
		TravelModeKey
	} from '$lib/types';

	const MODES: Array<{ key: TravelModeKey; label: string; icon: string; color: string }> = [
		{ key: 'DRIVING', label: 'Drive', icon: '🚗', color: '#2563eb' },
		{ key: 'BICYCLING', label: 'Cycle', icon: '🚴', color: '#059669' },
		{ key: 'WALKING', label: 'Walk', icon: '🥾', color: '#d97706' },
		{ key: 'TRANSIT', label: 'Transit', icon: '🚆', color: '#7c3aed' }
	];

	const MODE_BTN_IDS: Record<TravelModeKey, string> = {
		DRIVING: 'mode-drive-btn',
		BICYCLING: 'mode-bicycle-btn',
		WALKING: 'mode-walk-btn',
		TRANSIT: 'mode-transit-btn'
	};

	let mapContainer: HTMLDivElement | undefined = $state();
	let originAutocompleteContainer: HTMLDivElement | undefined = $state();
	let destinationAutocompleteContainer: HTMLDivElement | undefined = $state();

	let libs = $state<LoadedGoogleMapsLibraries | null>(null);
	let map = $state<google.maps.Map | null>(null);
	let bicyclingLayer: google.maps.BicyclingLayer | null = null;
	let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let destinationMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let hoverMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let activePolylines: google.maps.Polyline[] = [];

	let initStatus = $state<'loading' | 'ready' | 'missing-key' | 'error'>('loading');
	let initError = $state<string | null>(null);

	let originPlace = $state<ResolvedPlace | null>(null);
	let destinationPlace = $state<ResolvedPlace | null>(null);

	let activeMode = $state<TravelModeKey>('BICYCLING');
	let selectedRouteIndex = $state<number>(0);

	let modifiers = $state<RouteModifiersState>({
		avoidTolls: false,
		avoidHighways: false,
		ecoFriendly: true
	});

	let modeResults = $state<Record<TravelModeKey, ModeComparisonEntry>>({
		DRIVING: { mode: 'DRIVING', loading: false, error: null, routes: [] },
		BICYCLING: { mode: 'BICYCLING', loading: false, error: null, routes: [] },
		WALKING: { mode: 'WALKING', loading: false, error: null, routes: [] },
		TRANSIT: { mode: 'TRANSIT', loading: false, error: null, routes: [] }
	});

	let elevationProfile = $state<ElevationProfileSummary | null>(null);
	let elevationLoading = $state<boolean>(false);
	let elevationError = $state<string | null>(null);
	let lastElevationRouteKey = '';

	const currentModeEntry = $derived(modeResults[activeMode]);
	const currentRoutes = $derived(currentModeEntry.routes);
	const activeRoute = $derived<ComputedRouteSummary | null>(
		currentRoutes[selectedRouteIndex] ?? currentRoutes[0] ?? null
	);
	const isBetaTrailMode = $derived(activeMode === 'BICYCLING' || activeMode === 'WALKING');
	const activeModeAccent = $derived(
		MODES.find((m) => m.key === activeMode)?.color ?? '#059669'
	);

	function clearPolylines() {
		for (const line of activePolylines) {
			line.setMap(null);
		}
		activePolylines = [];
	}

	function updateEndpointMarkers() {
		if (!libs || !map) return;

		if (originPlace) {
			if (!originMarker) {
				const originPin = new libs.marker.PinElement({
					background: '#059669',
					borderColor: '#065f46',
					glyphColor: '#ffffff',
					glyphText: 'A',
					scale: 1.08
				});
				originMarker = new libs.marker.AdvancedMarkerElement({
					map,
					position: originPlace.location,
					title: originPlace.displayName,
					content: originPin
				});
			} else {
				originMarker.position = originPlace.location;
				originMarker.title = originPlace.displayName;
			}
		}

		if (destinationPlace) {
			if (!destinationMarker) {
				const destPin = new libs.marker.PinElement({
					background: '#dc2626',
					borderColor: '#991b1b',
					glyphColor: '#ffffff',
					glyphText: 'B',
					scale: 1.08
				});
				destinationMarker = new libs.marker.AdvancedMarkerElement({
					map,
					position: destinationPlace.location,
					title: destinationPlace.displayName,
					content: destPin
				});
			} else {
				destinationMarker.position = destinationPlace.location;
				destinationMarker.title = destinationPlace.displayName;
			}
		}
	}

	function renderActiveModeOnMap() {
		if (!libs || !map) return;
		clearPolylines();

		if (bicyclingLayer) {
			bicyclingLayer.setMap(activeMode === 'BICYCLING' ? map : null);
		}

		const routes = currentRoutes;
		if (routes.length === 0) {
			if (originPlace && destinationPlace) {
				const bounds = new libs.core.LatLngBounds();
				bounds.extend(originPlace.location);
				bounds.extend(destinationPlace.location);
				map.fitBounds(bounds, 64);
			}
			return;
		}

		const bounds = new libs.core.LatLngBounds();

		// Draw inactive routes first, active route on top
		const orderedIndices = routes
			.map((_, idx) => idx)
			.sort((a, b) => (a === selectedRouteIndex ? 1 : b === selectedRouteIndex ? -1 : 0));

		for (const idx of orderedIndices) {
			const summary = routes[idx];
			const isSelected = idx === selectedRouteIndex;

			if (summary.path.length > 0) {
				for (const pt of summary.path) {
					bounds.extend(pt);
				}

				const polyline = new libs.maps.Polyline({
					map,
					path: summary.path,
					strokeColor: summary.color,
					strokeOpacity: isSelected ? 0.94 : 0.48,
					strokeWeight: isSelected ? 6 : 4,
					zIndex: isSelected ? 20 : 10,
					clickable: true
				});

				polyline.addListener('click', () => {
					selectRouteCard(idx);
				});

				activePolylines.push(polyline);
			}
		}

		if (originPlace) bounds.extend(originPlace.location);
		if (destinationPlace) bounds.extend(destinationPlace.location);
		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
		}
	}

	async function syncElevationForRoute(route: ComputedRouteSummary | null, force = false) {
		if (!libs || !route || route.path.length < 2) {
			elevationProfile = null;
			elevationError = null;
			return;
		}

		const shouldAutoSample = route.mode === 'BICYCLING' || route.mode === 'WALKING' || force;
		if (!shouldAutoSample) {
			elevationProfile = null;
			elevationError = null;
			return;
		}

		const routeKey = `${originPlace?.id}-${destinationPlace?.id}-${route.id}-${route.distanceMeters}`;
		if (!force && routeKey === lastElevationRouteKey && elevationProfile) {
			return;
		}
		lastElevationRouteKey = routeKey;
		elevationLoading = true;
		elevationError = null;

		try {
			const profile = await fetchElevationProfile(libs.elevation, route.path, 64);
			elevationProfile = profile;
		} catch (err) {
			elevationProfile = null;
			elevationError =
				err instanceof Error
					? err.message
					: 'Unable to retrieve Elevation API samples for this route.';
		} finally {
			elevationLoading = false;
		}
	}

	async function recomputeMode(mode: TravelModeKey) {
		if (!libs || !originPlace || !destinationPlace) return;

		modeResults = {
			...modeResults,
			[mode]: { ...modeResults[mode], loading: true, error: null }
		};

		try {
			const routes = await computeRoutesForMode(
				libs.routes,
				originPlace,
				destinationPlace,
				mode,
				modifiers
			);
			modeResults = {
				...modeResults,
				[mode]: { mode, loading: false, error: null, routes }
			};

			if (mode === activeMode) {
				selectedRouteIndex = 0;
				renderActiveModeOnMap();
				await syncElevationForRoute(routes[0] ?? null);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : `Failed to compute ${mode} route.`;
			modeResults = {
				...modeResults,
				[mode]: { mode, loading: false, error: message, routes: [] }
			};
			if (mode === activeMode) {
				renderActiveModeOnMap();
			}
		}
	}

	async function recomputeAllModes() {
		if (!libs || !originPlace || !destinationPlace) return;
		updateEndpointMarkers();
		await Promise.allSettled(MODES.map((m) => recomputeMode(m.key)));
	}

	function selectMode(mode: TravelModeKey) {
		activeMode = mode;
		selectedRouteIndex = 0;
		handleElevationHover(null);
		renderActiveModeOnMap();
		void syncElevationForRoute(modeResults[mode].routes[0] ?? null);
	}

	function selectRouteCard(index: number) {
		selectedRouteIndex = index;
		handleElevationHover(null);
		renderActiveModeOnMap();
		void syncElevationForRoute(currentRoutes[index] ?? null);
	}

	function toggleModifier(key: keyof RouteModifiersState) {
		modifiers = {
			...modifiers,
			[key]: !modifiers[key]
		};
		if (activeMode !== 'DRIVING') {
			activeMode = 'DRIVING';
			selectedRouteIndex = 0;
		}
		void recomputeMode('DRIVING');
	}

	function swapEndpoints() {
		if (!originPlace || !destinationPlace) return;
		const previousOrigin = originPlace;
		originPlace = destinationPlace;
		destinationPlace = previousOrigin;
		handleElevationHover(null);
		void recomputeAllModes();
	}

	function handleElevationHover(sample: ElevationSamplePoint | null) {
		if (!libs || !map) return;

		if (!sample) {
			if (hoverMarker) {
				hoverMarker.map = null;
			}
			return;
		}

		if (!hoverMarker) {
			const hoverPin = new libs.marker.PinElement({
				background: '#0ea5e9',
				borderColor: '#0369a1',
				glyphColor: '#ffffff',
				glyphText: '▲',
				scale: 0.92
			});
			hoverMarker = new libs.marker.AdvancedMarkerElement({
				map,
				position: sample.location,
				title: `${Math.round(sample.elevationMeters)} m`,
				content: hoverPin,
				zIndex: 50
			});
		} else {
			hoverMarker.position = sample.location;
			hoverMarker.title = `${Math.round(sample.elevationMeters)} m (${sample.slopePercent.toFixed(1)}%)`;
			if (!hoverMarker.map) {
				hoverMarker.map = map;
			}
		}
	}

	onMount(() => {
		let teardownOriginAc: (() => void) | null = null;
		let teardownDestAc: (() => void) | null = null;
		let cancelled = false;

		async function bootstrap() {
			const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
			try {
				const loaded = await loadGoogleMapsLibraries(apiKey);
				if (cancelled || !mapContainer) return;
				libs = loaded;

				const mapInstance = new loaded.maps.Map(mapContainer, {
					center: { lat: 39.884, lng: -105.135 },
					zoom: 11,
					mapId: 'DEMO_MAP_ID',
					internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
					mapTypeControl: true,
					streetViewControl: false,
					fullscreenControl: true
				});
				map = mapInstance;
				bicyclingLayer = new loaded.maps.BicyclingLayer();
				bicyclingLayer.setMap(mapInstance);

				if (originAutocompleteContainer) {
					teardownOriginAc = mountPlaceAutocomplete(
						loaded.places,
						originAutocompleteContainer,
						{
							placeholder: 'Search origin in Denver / Front Range…',
							ariaLabel: 'Origin location search',
							onSelect: (place) => {
								originPlace = place;
								void recomputeAllModes();
							},
							onError: (msg) => {
								initError = msg;
							}
						}
					);
				}

				if (destinationAutocompleteContainer) {
					teardownDestAc = mountPlaceAutocomplete(
						loaded.places,
						destinationAutocompleteContainer,
						{
							placeholder: 'Search destination in Boulder / Front Range…',
							ariaLabel: 'Destination location search',
							onSelect: (place) => {
								destinationPlace = place;
								void recomputeAllModes();
							},
							onError: (msg) => {
								initError = msg;
							}
						}
					);
				}

				const [seededOrigin, seededDestination] = await Promise.all([
					resolvePlaceByText(loaded.places, SEED_ORIGIN_QUERY),
					resolvePlaceByText(loaded.places, SEED_DESTINATION_QUERY)
				]);

				if (cancelled) return;
				originPlace = seededOrigin;
				destinationPlace = seededDestination;
				initStatus = 'ready';

				await recomputeAllModes();
			} catch (err) {
				if (cancelled) return;
				const msg = err instanceof Error ? err.message : 'Failed to initialize Google Maps.';
				if (msg === 'MISSING_API_KEY') {
					initStatus = 'missing-key';
					initError =
						'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Google Maps Platform API key.';
				} else {
					initStatus = 'error';
					initError = msg;
				}
			}
		}

		void bootstrap();

		return () => {
			cancelled = true;
			teardownOriginAc?.();
			teardownDestAc?.();
			clearPolylines();
			bicyclingLayer?.setMap(null);
			if (originMarker) originMarker.map = null;
			if (destinationMarker) destinationMarker.map = null;
			if (hoverMarker) hoverMarker.map = null;
		};
	});
</script>

<div class="app-shell">
	<header class="top-header">
		<div class="brand-group">
			<div class="brand-icon" aria-hidden="true">⛰</div>
			<div class="brand-text">
				<h1>Multi-Modal Commute Comparator &amp; Trail Elevation Tracker</h1>
				<div class="brand-subtitle">
					<span class="corridor-badge">Denver ↔ Boulder Front Range</span>
					<span>Routes API · Places API (New) · Elevation API</span>
				</div>
			</div>
		</div>

		<div class="header-kpis">
			{#if activeRoute}
				<div class="kpi-pill">
					<span>ETA</span>
					<strong>{activeRoute.durationText}</strong>
				</div>
				<div class="kpi-pill">
					<span>Distance</span>
					<strong>{activeRoute.distanceText}</strong>
				</div>
			{/if}
			{#if elevationProfile}
				<div class="kpi-pill">
					<span>Gain</span>
					<strong>+{Math.round(elevationProfile.totalGainMeters)} m</strong>
				</div>
			{/if}
			{#if isBetaTrailMode}
				<div class="beta-advisory-pill">
					<span>⚠ Beta Path Mode: Verify bike lanes &amp; trail conditions</span>
				</div>
			{/if}
		</div>
	</header>

	<main class="workspace-grid">
		<aside class="sidebar">
			<section class="panel-section">
				<div class="section-header">
					<h2 class="section-title">Origin &amp; Destination</h2>
				</div>

				<div class="endpoints-stack">
					<div class="endpoint-box">
						<div class="endpoint-label-row">
							<span class="endpoint-tag">
								<span class="dot dot-origin"></span>
								Origin
							</span>
							{#if originPlace}
								<span class="endpoint-active-chip" title={originPlace.displayName}>
									{originPlace.displayName}
								</span>
							{/if}
						</div>
						<div
							id="origin-autocomplete-input"
							data-testid="origin-autocomplete-input"
							class="autocomplete-mount"
							bind:this={originAutocompleteContainer}
						></div>
						{#if originPlace}
							<p class="endpoint-address" title={originPlace.formattedAddress}>
								{originPlace.formattedAddress}
							</p>
						{/if}
					</div>

					<div class="swap-row">
						<button
							id="swap-locations-btn"
							data-testid="swap-locations-btn"
							type="button"
							class="swap-btn"
							onclick={swapEndpoints}
							disabled={!originPlace || !destinationPlace}
						>
							⇅ Swap Origin &amp; Destination
						</button>
					</div>

					<div class="endpoint-box">
						<div class="endpoint-label-row">
							<span class="endpoint-tag">
								<span class="dot dot-destination"></span>
								Destination
							</span>
							{#if destinationPlace}
								<span class="endpoint-active-chip" title={destinationPlace.displayName}>
									{destinationPlace.displayName}
								</span>
							{/if}
						</div>
						<div
							id="destination-autocomplete-input"
							data-testid="destination-autocomplete-input"
							class="autocomplete-mount"
							bind:this={destinationAutocompleteContainer}
						></div>
						{#if destinationPlace}
							<p class="endpoint-address" title={destinationPlace.formattedAddress}>
								{destinationPlace.formattedAddress}
							</p>
						{/if}
					</div>
				</div>
			</section>

			<section class="panel-section">
				<div class="section-header">
					<h2 class="section-title">Travel Modes Comparison</h2>
				</div>

				<div class="modes-grid">
					{#each MODES as mode}
						{@const entry = modeResults[mode.key]}
						{@const lead = entry.routes[0]}
						<button
							id={MODE_BTN_IDS[mode.key]}
							data-testid={MODE_BTN_IDS[mode.key]}
							type="button"
							class="mode-btn {activeMode === mode.key ? 'active' : ''}"
							style={`--mode-color: ${mode.color}`}
							onclick={() => selectMode(mode.key)}
						>
							<span class="mode-icon" aria-hidden="true">{mode.icon}</span>
							<span class="mode-name">{mode.label}</span>
							<span class="mode-eta">
								{#if entry.loading}
									…
								{:else if lead}
									{lead.durationText}
								{:else if entry.error}
									—
								{:else}
									--
								{/if}
							</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="panel-section">
				<div class="section-header">
					<h2 class="section-title">Driving Route Modifiers</h2>
				</div>
				<div class="modifiers-row">
					<button
						id="avoid-tolls-toggle"
						data-testid="avoid-tolls-toggle"
						type="button"
						class="modifier-chip {modifiers.avoidTolls ? 'active' : ''}"
						aria-pressed={modifiers.avoidTolls}
						onclick={() => toggleModifier('avoidTolls')}
					>
						{modifiers.avoidTolls ? '✓' : '○'} Avoid Tolls
					</button>
					<button
						id="avoid-highways-toggle"
						data-testid="avoid-highways-toggle"
						type="button"
						class="modifier-chip {modifiers.avoidHighways ? 'active' : ''}"
						aria-pressed={modifiers.avoidHighways}
						onclick={() => toggleModifier('avoidHighways')}
					>
						{modifiers.avoidHighways ? '✓' : '○'} Avoid Highways
					</button>
					<button
						id="eco-friendly-toggle"
						data-testid="eco-friendly-toggle"
						type="button"
						class="modifier-chip eco {modifiers.ecoFriendly ? 'active' : ''}"
						aria-pressed={modifiers.ecoFriendly}
						onclick={() => toggleModifier('ecoFriendly')}
					>
						{modifiers.ecoFriendly ? '🌱' : '○'} Eco-Friendly
					</button>
				</div>
				<p class="modifier-note">
					Applies to Driving mode via Routes API <code>routeModifiers</code> and
					<code>FUEL_EFFICIENT</code> reference routing.
				</p>
			</section>

			<section class="panel-section">
				<div class="section-header">
					<h2 class="section-title">
						{MODES.find((m) => m.key === activeMode)?.label} Route Alternatives
					</h2>
				</div>

				{#if isBetaTrailMode}
					<div class="beta-banner" role="note">
						<strong>Beta Routing Notice:</strong> Walking and bicycling routes are in beta and may
						sometimes lack clear sidewalks, pedestrian paths, or dedicated bike lanes.
					</div>
				{/if}

				<div id="route-cards-list" data-testid="route-cards-list" class="route-cards-list">
					{#if currentModeEntry.loading}
						<div class="status-message">Computing live routes via Routes API…</div>
					{:else if currentModeEntry.error}
						<div class="error-message">{currentModeEntry.error}</div>
					{:else if currentRoutes.length === 0}
						<div class="status-message">
							{#if initStatus === 'missing-key'}
								Configure <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to compute routes.
							{:else}
								No routes returned for this mode and origin/destination pair.
							{/if}
						</div>
					{:else}
						{#each currentRoutes as route, idx}
							<button
								id={`route-card-${idx}`}
								data-testid={`route-card-${idx}`}
								type="button"
								class="route-card {selectedRouteIndex === idx ? 'active' : ''}"
								style={`border-left-color: ${route.color}; ${selectedRouteIndex === idx ? `border-color: ${route.color}` : ''}`}
								onclick={() => selectRouteCard(idx)}
							>
								<div class="route-card-top">
									<span class="route-card-title">{route.description}</span>
									<div class="route-card-metrics">
										<span class="route-duration">{route.durationText}</span>
										<span class="route-distance">{route.distanceText}</span>
									</div>
								</div>

								<div class="route-badges">
									{#if idx === 0}
										<span class="badge badge-primary">Primary</span>
									{:else}
										<span class="badge">Alternative</span>
									{/if}
									{#if route.isEcoRecommended}
										<span class="badge badge-eco">🌱 FUEL_EFFICIENT</span>
									{/if}
									{#if route.fuelConsumptionLiters !== null}
										<span class="badge badge-eco">
											⛽ {route.fuelConsumptionLiters.toFixed(2)} L est.
										</span>
									{/if}
									{#if route.hasTolls && route.tollText}
										<span class="badge badge-toll">💵 {route.tollText}</span>
									{:else if activeMode === 'DRIVING'}
										<span class="badge">No Tolls</span>
									{/if}
								</div>

								{#if route.warnings.length > 0}
									<div class="route-warning">{route.warnings[0]}</div>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</section>
		</aside>

		<section class="right-workspace">
			<div class="map-wrapper">
				<div
					id="map-canvas"
					data-testid="map-canvas"
					class="map-canvas"
					bind:this={mapContainer}
				></div>

				{#if initStatus === 'missing-key' || initStatus === 'error'}
					<div class="map-overlay-alert" role="alert">
						<strong>Google Maps Platform Setup Required</strong>
						<p style="margin: 6px 0 0;">{initError}</p>
						{#if initStatus === 'missing-key'}
							<p style="margin: 6px 0 0;">
								For prototyping without billing setup, generate a free Maps Demo Key at
								<a
									href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
									target="_blank"
									rel="noreferrer"
								>
									mapsplatform.google.com/maps-demo-key
								</a>.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<div class="elevation-panel">
				<div class="elevation-header">
					<div class="elevation-title-group">
						<h2>Elevation &amp; Slope Profile</h2>
						{#if activeRoute}
							<span class="badge">{activeRoute.mode} · {activeRoute.description}</span>
						{/if}
					</div>

					{#if elevationProfile}
						<div class="elevation-stats">
							<span class="stat-chip">
								Gain <strong>+{Math.round(elevationProfile.totalGainMeters)} m</strong>
							</span>
							<span class="stat-chip">
								Loss <strong>-{Math.round(elevationProfile.totalLossMeters)} m</strong>
							</span>
							<span class="stat-chip">
								Min/Max
								<strong>
									{Math.round(elevationProfile.minElevationMeters)}–{Math.round(elevationProfile.maxElevationMeters)} m
								</strong>
							</span>
							<span class="stat-chip">
								Max Grade <strong>{elevationProfile.maxGradePercent.toFixed(1)}%</strong>
							</span>
						</div>
					{/if}
				</div>

				<div class="elevation-chart-box">
					{#if !isBetaTrailMode && !elevationProfile && !elevationLoading && !elevationError}
						<div class="elevation-empty">
							<span>
								Elevation profiling auto-loads for <strong>Cycling</strong> and <strong>Walking</strong>
								routes. You can also sample the active {activeMode.toLowerCase()} route path on demand.
							</span>
							{#if activeRoute && activeRoute.path.length >= 2}
								<button
									type="button"
									class="sample-elev-btn"
									onclick={() => void syncElevationForRoute(activeRoute, true)}
								>
									Sample Route Elevation
								</button>
							{/if}
						</div>
					{:else}
						<ElevationChart
							profile={elevationProfile}
							loading={elevationLoading}
							error={elevationError}
							accentColor={activeModeAccent}
							onHover={handleElevationHover}
						/>
					{/if}
				</div>
			</div>
		</section>
	</main>
</div>
