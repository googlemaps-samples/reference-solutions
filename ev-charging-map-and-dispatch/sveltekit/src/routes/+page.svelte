<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
	import {
		SEATTLE_CENTER,
		USAGE_ATTRIBUTION_ID,
		computeDispatchRoute,
		discoverNearbyProviders,
		reverseGeocodePosition
	} from '$lib/dispatchService';
	import type {
		ActiveRouteDetails,
		CategoryFilter,
		LatLngLiteral,
		RadiusKm,
		ServiceProvider
	} from '$lib/types';

	const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
	const hasValidApiKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

	let mapContainerEl = $state<HTMLDivElement | null>(null);
	let autocompleteContainerEl = $state<HTMLDivElement | null>(null);

	let driverLocation = $state<LatLngLiteral>({ ...SEATTLE_CENTER });
	let driverAddress = $state<string>('Downtown Seattle, WA 98101');
	let radiusKm = $state<RadiusKm>(10);
	let categoryFilter = $state<CategoryFilter>('all');

	let providers = $state<ServiceProvider[]>([]);
	let selectedProviderId = $state<string | null>(null);
	let activeRoute = $state<ActiveRouteDetails | null>(null);
	let stepsExpanded = $state<boolean>(true);

	let isDiscovering = $state<boolean>(false);
	let isRouting = $state<boolean>(false);
	let isGeocoding = $state<boolean>(false);
	let statusNotice = $state<string | null>(null);

	let mapReady = $state<boolean>(false);
	let map: google.maps.Map | null = null;
	let driverMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let searchCircle: google.maps.Circle | null = null;
	let infoWindow: google.maps.InfoWindow | null = null;
	let providerMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let activePolylines: google.maps.Polyline[] = [];
	let mapsLibs: {
		AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
		PinElement: typeof google.maps.marker.PinElement;
		Polyline: typeof google.maps.Polyline;
		LatLngBounds: typeof google.maps.LatLngBounds;
	} | null = null;

	let searchEpoch = 0;

	const filteredProviders = $derived(
		categoryFilter === 'all'
			? providers
			: providers.filter((p) => p.category === categoryFilter)
	);

	const evCount = $derived(providers.filter((p) => p.category === 'ev_charging').length);
	const repairCount = $derived(providers.filter((p) => p.category === 'auto_repair').length);

	function buildInfoWindowContent(provider: ServiceProvider): HTMLElement {
		const root = document.createElement('div');
		root.style.cssText =
			'font-family: Inter, system-ui, sans-serif; min-width: 220px; max-width: 270px; color: #0f172a; padding: 2px;';

		const badge = document.createElement('span');
		badge.textContent =
			provider.category === 'ev_charging' ? 'EV Fast Charging' : 'Auto Repair & Roadside';
		badge.style.cssText =
			provider.category === 'ev_charging'
				? 'display:inline-block; font-size:11px; font-weight:600; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:999px; padding:2px 8px; margin-bottom:6px;'
				: 'display:inline-block; font-size:11px; font-weight:600; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:999px; padding:2px 8px; margin-bottom:6px;';
		root.appendChild(badge);

		const title = document.createElement('div');
		title.textContent = provider.name;
		title.style.cssText = 'font-size:14px; font-weight:700; margin-bottom:4px; line-height:1.3;';
		root.appendChild(title);

		const addr = document.createElement('div');
		addr.textContent = provider.address;
		addr.style.cssText = 'font-size:12px; color:#475569; margin-bottom:6px; line-height:1.35;';
		root.appendChild(addr);

		const meta = document.createElement('div');
		meta.style.cssText = 'font-size:12px; font-weight:600; color:#1e293b; margin-bottom:4px;';
		const ratingPart =
			provider.rating != null
				? `★ ${provider.rating.toFixed(1)} (${provider.userRatingCount ?? 0})`
				: 'No ratings yet';
		meta.textContent = `${provider.etaText} · ${provider.distanceText} · ${ratingPart}`;
		root.appendChild(meta);

		if (provider.category === 'ev_charging' && provider.evConnectorCount) {
			const evLine = document.createElement('div');
			const kwText = provider.evMaxKw ? ` · up to ${provider.evMaxKw} kW` : '';
			const availText =
				provider.evAvailableCount != null
					? ` · ${provider.evAvailableCount}/${provider.evConnectorCount} available`
					: ` · ${provider.evConnectorCount} ports`;
			evLine.textContent = `Chargers${availText}${kwText}`;
			evLine.style.cssText = 'font-size:12px; color:#047857; font-weight:500;';
			root.appendChild(evLine);
		} else if (provider.openStatus.label) {
			const hrsLine = document.createElement('div');
			hrsLine.textContent = provider.openStatus.todayHours
				? `${provider.openStatus.label} · ${provider.openStatus.todayHours}`
				: provider.openStatus.label;
			hrsLine.style.cssText = 'font-size:12px; color:#475569;';
			root.appendChild(hrsLine);
		}

		return root;
	}

	function clearRoutePolylines() {
		for (const poly of activePolylines) {
			poly.setMap(null);
		}
		activePolylines = [];
	}

	function clearRoute() {
		clearRoutePolylines();
		activeRoute = null;
		selectedProviderId = null;
		infoWindow?.close();
		renderProviderMarkers();
	}

	function clearProviderMarkers() {
		for (const marker of providerMarkers) {
			marker.map = null;
		}
		providerMarkers = [];
	}

	function renderProviderMarkers() {
		if (!map || !mapsLibs) return;
		const { AdvancedMarkerElement, PinElement } = mapsLibs;
		clearProviderMarkers();

		for (const provider of filteredProviders) {
			const isSelected = provider.id === selectedProviderId;
			const isEv = provider.category === 'ev_charging';

			const pin = new PinElement({
				glyphText: isEv ? 'EV' : 'FX',
				glyphColor: '#ffffff',
				background: isEv ? '#059669' : '#d97706',
				borderColor: isSelected ? '#0f172a' : '#ffffff',
				scale: isSelected ? 1.28 : 1.0
			});

			const marker = new AdvancedMarkerElement({
				map,
				position: provider.location,
				title: provider.name,
				zIndex: isSelected ? 200 : 50
			});
			marker.append(pin);

			marker.element.style.cursor = 'pointer';
			marker.element.addEventListener('click', () => {
				void selectAndRouteToProvider(provider, marker);
			});

			providerMarkers.push(marker);
		}
	}

	async function runDiscoveryForDriverLocation(origin: LatLngLiteral, km: RadiusKm) {
		const epoch = ++searchEpoch;
		isDiscovering = true;
		statusNotice = null;

		try {
			const results = await discoverNearbyProviders(origin, km * 1000);
			if (epoch !== searchEpoch) return;
			providers = results;
			if (results.length === 0) {
				statusNotice = `No EV chargers or auto repair providers found within ${km} km. Try expanding to 15 km or moving the pin.`;
			}
			renderProviderMarkers();
		} catch {
			if (epoch !== searchEpoch) return;
			statusNotice =
				'Unable to load nearby EV stations and repair providers. Check API key permissions for Places API (New) and Routes API.';
		} finally {
			if (epoch === searchEpoch) {
				isDiscovering = false;
			}
		}
	}

	async function updateDriverLocation(nextLoc: LatLngLiteral, providedAddress?: string) {
		driverLocation = { ...nextLoc };
		clearRoute();

		if (driverMarker) {
			driverMarker.position = nextLoc;
		}
		if (searchCircle) {
			searchCircle.setCenter(nextLoc);
			searchCircle.setRadius(radiusKm * 1000);
		}
		if (map) {
			map.panTo(nextLoc);
		}

		if (providedAddress) {
			driverAddress = providedAddress;
		} else {
			isGeocoding = true;
			driverAddress = 'Locating address...';
			const resolved = await reverseGeocodePosition(nextLoc);
			driverAddress = resolved;
			isGeocoding = false;
		}

		await runDiscoveryForDriverLocation(nextLoc, radiusKm);
	}

	async function selectAndRouteToProvider(
		provider: ServiceProvider,
		markerRef?: google.maps.marker.AdvancedMarkerElement
	) {
		if (!map || !mapsLibs) return;

		selectedProviderId = provider.id;
		isRouting = true;
		statusNotice = null;
		renderProviderMarkers();

		const targetMarker =
			markerRef ??
			providerMarkers.find((m) => {
				const pos = m.position;
				if (!pos) return false;
				const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
				const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
				return (
					Math.abs((lat ?? 0) - provider.location.lat) < 1e-6 &&
					Math.abs((lng ?? 0) - provider.location.lng) < 1e-6
				);
			});

		if (infoWindow && targetMarker) {
			infoWindow.setContent(buildInfoWindowContent(provider));
			infoWindow.open({ map, anchor: targetMarker });
		}

		try {
			const routeDetails = await computeDispatchRoute(driverLocation, provider);
			clearRoutePolylines();

			let polylines = routeDetails.route.createPolylines({
				polylineOptions: {
					strokeColor: '#2563eb',
					strokeWeight: 6,
					strokeOpacity: 0.92
				}
			});

			if (polylines.length === 0 && routeDetails.route.path?.length) {
				polylines = [
					new mapsLibs.Polyline({
						path: routeDetails.route.path,
						strokeColor: '#2563eb',
						strokeWeight: 6,
						strokeOpacity: 0.92
					})
				];
			}

			for (const poly of polylines) {
				poly.setMap(map);
			}
			activePolylines = polylines;
			activeRoute = routeDetails;
			stepsExpanded = true;

			if (routeDetails.route.viewport) {
				map.fitBounds(routeDetails.route.viewport, { top: 48, right: 48, bottom: 48, left: 48 });
			} else {
				const bounds = new mapsLibs.LatLngBounds();
				bounds.extend(driverLocation);
				bounds.extend(provider.location);
				map.fitBounds(bounds, 64);
			}
		} catch {
			statusNotice =
				'Could not compute turn-by-turn route for this provider. Ensure Routes API is enabled on your key.';
		} finally {
			isRouting = false;
		}
	}

	function handleRadiusChange(nextKm: RadiusKm) {
		radiusKm = nextKm;
		if (searchCircle) {
			searchCircle.setRadius(nextKm * 1000);
		}
		if (map && searchCircle) {
			const circleBounds = searchCircle.getBounds();
			if (circleBounds) {
				map.fitBounds(circleBounds, 24);
			}
		}
		clearRoute();
		void runDiscoveryForDriverLocation(driverLocation, nextKm);
	}

	function handleCategoryChange(nextCategory: CategoryFilter) {
		categoryFilter = nextCategory;
		renderProviderMarkers();
	}

	function handleUseMapCenter() {
		if (!map) return;
		const center = map.getCenter();
		if (!center) return;
		void updateDriverLocation({ lat: center.lat(), lng: center.lng() });
	}

	onMount(async () => {
		if (!hasValidApiKey || !mapContainerEl) {
			return;
		}

		try {
			setOptions({
				key: apiKey,
				v: 'weekly',
				language: 'en',
				region: 'US'
			});

			const [
				{ Map, Circle, Polyline, InfoWindow },
				{ AdvancedMarkerElement, PinElement },
				{ PlaceAutocompleteElement },
				{ LatLngBounds }
			] = await Promise.all([
				importLibrary('maps'),
				importLibrary('marker'),
				importLibrary('places'),
				importLibrary('core')
			]);

			mapsLibs = { AdvancedMarkerElement, PinElement, Polyline, LatLngBounds };

			map = new Map(mapContainerEl, {
				center: SEATTLE_CENTER,
				zoom: 12,
				mapId: 'DEMO_MAP_ID',
				internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true
			});

			infoWindow = new InfoWindow();

			searchCircle = new Circle({
				map,
				center: driverLocation,
				radius: radiusKm * 1000,
				strokeColor: '#2563eb',
				strokeOpacity: 0.5,
				strokeWeight: 2,
				fillColor: '#2563eb',
				fillOpacity: 0.08,
				clickable: false
			});

			const driverPin = new PinElement({
				glyphText: 'SOS',
				glyphColor: '#ffffff',
				background: '#2563eb',
				borderColor: '#ffffff',
				scale: 1.2
			});

			driverMarker = new AdvancedMarkerElement({
				map,
				position: driverLocation,
				title: 'Driver Breakdown Location (Drag to relocate)',
				gmpDraggable: true,
				zIndex: 500
			});
			driverMarker.append(driverPin);

			driverMarker.addListener('dragend', () => {
				const pos = driverMarker?.position;
				if (!pos) return;
				const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
				const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
				if (lat != null && lng != null) {
					void updateDriverLocation({ lat, lng });
				}
			});

			map.addListener('click', (event: google.maps.MapMouseEvent) => {
				if (!event.latLng) return;
				void updateDriverLocation({
					lat: event.latLng.lat(),
					lng: event.latLng.lng()
				});
			});

			if (autocompleteContainerEl) {
				const autocompleteEl = new PlaceAutocompleteElement({
					locationBias: {
						center: SEATTLE_CENTER,
						radius: 25000
					},
					includedRegionCodes: ['us'],
					internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
				});
				autocompleteEl.className = 'gmp-autocomplete-widget';

				autocompleteEl.addEventListener('gmp-select', (ev: Event) => {
					const selectEvent = ev as google.maps.places.PlacePredictionSelectEvent;
					void (async () => {
						try {
							const place = selectEvent.placePrediction.toPlace();
							await place.fetchFields({
								fields: ['location', 'formattedAddress', 'displayName']
							});
							if (place.location) {
								const nextLoc: LatLngLiteral = {
									lat: place.location.lat(),
									lng: place.location.lng()
								};
								const label =
									place.formattedAddress ?? place.displayName ?? undefined;
								await updateDriverLocation(nextLoc, label);
							}
						} catch {
							statusNotice = 'Unable to resolve selected address.';
						}
					})();
				});

				autocompleteEl.addEventListener('gmp-error', () => {
					statusNotice = 'Autocomplete encountered an API error.';
				});

				autocompleteContainerEl.replaceChildren(autocompleteEl);
			}

			mapReady = true;
			await updateDriverLocation(SEATTLE_CENTER);
		} catch {
			statusNotice =
				'Failed to initialize Google Maps JavaScript API. Verify PUBLIC_GOOGLE_MAPS_API_KEY in .env.';
		}
	});

	onDestroy(() => {
		clearRoutePolylines();
		clearProviderMarkers();
		if (driverMarker) driverMarker.map = null;
		if (searchCircle) searchCircle.setMap(null);
		infoWindow?.close();
	});
</script>

<div class="app-shell">
	<header class="top-bar">
		<div class="brand-group">
			<div class="brand-badge" aria-hidden="true">⚡</div>
			<div>
				<h1 class="brand-title">VoltAid Seattle</h1>
				<p class="brand-subtitle">EV Charging &amp; Roadside Dispatch</p>
			</div>
		</div>

		<div class="search-cluster">
			<div
				id="autocomplete-container"
				data-testid="autocomplete-container"
				class="autocomplete-slot"
				bind:this={autocompleteContainerEl}
			>
				{#if !hasValidApiKey}
					<div class="autocomplete-placeholder">
						Configure PUBLIC_GOOGLE_MAPS_API_KEY to enable address search
					</div>
				{/if}
			</div>

			<div
				id="driver-address-badge"
				data-testid="driver-address-badge"
				class="driver-address-pill"
				title={driverAddress}
			>
				<span class="pulse-dot" aria-hidden="true"></span>
				<span class="driver-address-text">
					{isGeocoding ? 'Reverse-geocoding pin…' : driverAddress}
				</span>
			</div>

			<button
				id="use-map-center-btn"
				data-testid="use-map-center-btn"
				type="button"
				class="header-action-btn"
				onclick={handleUseMapCenter}
				disabled={!mapReady}
				title="Move breakdown pin to current map center"
			>
				Pin Map Center
			</button>
		</div>

		<div class="filters-cluster">
			<div class="pill-group" role="group" aria-label="Service category filter">
				<button
					id="category-filter-all"
					data-testid="category-filter-all"
					type="button"
					class="filter-pill"
					class:active={categoryFilter === 'all'}
					onclick={() => handleCategoryChange('all')}
				>
					All ({providers.length})
				</button>
				<button
					id="category-filter-ev"
					data-testid="category-filter-ev"
					type="button"
					class="filter-pill ev"
					class:active={categoryFilter === 'ev_charging'}
					onclick={() => handleCategoryChange('ev_charging')}
				>
					EV Fast Charging ({evCount})
				</button>
				<button
					id="category-filter-repair"
					data-testid="category-filter-repair"
					type="button"
					class="filter-pill repair"
					class:active={categoryFilter === 'auto_repair'}
					onclick={() => handleCategoryChange('auto_repair')}
				>
					Auto Repair ({repairCount})
				</button>
			</div>

			<div class="radius-group">
				<div class="pill-group" role="group" aria-label="Search radius">
					<button
						id="radius-5km"
						data-testid="radius-5km"
						type="button"
						class="radius-pill"
						class:active={radiusKm === 5}
						onclick={() => handleRadiusChange(5)}
					>
						5 km
					</button>
					<button
						id="radius-10km"
						data-testid="radius-10km"
						type="button"
						class="radius-pill"
						class:active={radiusKm === 10}
						onclick={() => handleRadiusChange(10)}
					>
						10 km
					</button>
					<button
						id="radius-15km"
						data-testid="radius-15km"
						type="button"
						class="radius-pill"
						class:active={radiusKm === 15}
						onclick={() => handleRadiusChange(15)}
					>
						15 km
					</button>
				</div>

				<select
					id="radius-select"
					data-testid="radius-select"
					aria-label="Search radius in kilometers"
					class="radius-select"
					value={radiusKm}
					onchange={(e) => {
						const val = Number((e.currentTarget as HTMLSelectElement).value) as RadiusKm;
						handleRadiusChange(val);
					}}
				>
					<option value={5}>5 km radius</option>
					<option value={10}>10 km radius</option>
					<option value={15}>15 km radius</option>
				</select>
			</div>
		</div>
	</header>

	<main class="workspace">
		<aside class="dispatch-sidebar" aria-label="Nearby EV stations and repair providers">
			<div class="sidebar-header">
				<div>
					<h2 class="sidebar-title">Nearest Dispatch Options</h2>
					<p class="sidebar-meta">
						Sorted by live driving ETA · {radiusKm} km radius around pin
					</p>
				</div>
				{#if isDiscovering || isRouting}
					<span class="loading-chip">{isRouting ? 'Routing…' : 'Scanning…'}</span>
				{/if}
			</div>

			{#if statusNotice}
				<div class="notice-banner" role="status">
					{statusNotice}
				</div>
			{/if}

			{#if activeRoute}
				<section
					id="route-summary-panel"
					data-testid="route-summary-panel"
					class="route-summary-card"
					aria-label="Active dispatch route"
				>
					<div class="route-summary-top">
						<div>
							<span class="route-kicker">ACTIVE DISPATCH ROUTE</span>
							<h3 class="route-dest-name">{activeRoute.provider.name}</h3>
							<p class="route-dest-address">{activeRoute.provider.address}</p>
						</div>
						<button
							id="clear-route-btn"
							data-testid="clear-route-btn"
							type="button"
							class="clear-route-btn"
							onclick={clearRoute}
						>
							Clear
						</button>
					</div>

					<div class="route-metrics">
						<div class="metric-box">
							<span class="metric-label">Driving ETA</span>
							<span class="metric-value">{activeRoute.durationText}</span>
						</div>
						<div class="metric-box">
							<span class="metric-label">Distance</span>
							<span class="metric-value">{activeRoute.distanceText}</span>
						</div>
						{#if activeRoute.provider.googleMapsUri}
							<a
								class="gmaps-link"
								href={activeRoute.provider.googleMapsUri}
								target="_blank"
								rel="noopener noreferrer"
							>
								Open in Maps ↗
							</a>
						{/if}
					</div>

					<button
						type="button"
						class="steps-toggle-btn"
						onclick={() => (stepsExpanded = !stepsExpanded)}
						aria-expanded={stepsExpanded}
					>
						<span>Turn-by-Turn Instructions ({activeRoute.steps.length} steps)</span>
						<span>{stepsExpanded ? '▲' : '▼'}</span>
					</button>

					{#if stepsExpanded}
						<ol
							id="turn-by-turn-steps"
							data-testid="turn-by-turn-steps"
							class="steps-list"
						>
							{#each activeRoute.steps as step (step.index)}
								<li class="step-item">
									<span class="step-index">{step.index}</span>
									<div class="step-body">
										<div class="step-instruction">{step.instruction}</div>
										<div class="step-meta">{step.distanceText} · {step.durationText}</div>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</section>
			{/if}

			<div id="provider-list" data-testid="provider-list" class="provider-list">
				{#if !hasValidApiKey}
					<div class="empty-state">
						<h3>Google Maps API Key Required</h3>
						<p>
							Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to load live
							Seattle EV charging stations, auto repair shops, and Routes API ETAs.
						</p>
						<a
							href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
							target="_blank"
							rel="noopener noreferrer"
							class="demo-key-link"
						>
							Get a Free Maps Demo Key ↗
						</a>
					</div>
				{:else if isDiscovering && filteredProviders.length === 0}
					<div class="empty-state">
						<p>Searching Seattle within {radiusKm} km and ranking by live driving ETA…</p>
					</div>
				{:else if filteredProviders.length === 0}
					<div class="empty-state">
						<p>No matching providers in this radius or filter.</p>
					</div>
				{:else}
					{#each filteredProviders as provider, index (provider.id)}
						<article
							id={`provider-card-${index}`}
							data-testid={`provider-card-${index}`}
							class="provider-card"
							class:selected={provider.id === selectedProviderId}
						>
							<div class="card-top-row">
								<span
									class="category-badge"
									class:ev={provider.category === 'ev_charging'}
									class:repair={provider.category === 'auto_repair'}
								>
									{provider.category === 'ev_charging' ? '⚡ EV Fast Charging' : '🔧 Auto Repair'}
								</span>

								<span class="eta-badge" title={provider.etaSource === 'routes_matrix' ? 'Live Routes API ETA' : 'Estimated driving ETA'}>
									{provider.etaText} · {provider.distanceText}
								</span>
							</div>

							<h3 class="provider-name">{provider.name}</h3>
							<p class="provider-address">{provider.address}</p>

							<div class="provider-stats">
								{#if provider.rating != null}
									<span class="rating-pill">
										★ {provider.rating.toFixed(1)}
										<span class="rating-count">({provider.userRatingCount ?? 0})</span>
									</span>
								{:else}
									<span class="rating-pill muted">No rating</span>
								{/if}

								<span
									class="status-pill"
									class:open={provider.openStatus.isOpen === true}
									class:closed={provider.openStatus.isOpen === false}
								>
									{provider.openStatus.label}
								</span>
							</div>

							{#if provider.category === 'ev_charging'}
								<div class="ev-details-box">
									{#if provider.evConnectorCount != null}
										<div class="ev-headline">
											{#if provider.evAvailableCount != null}
												<strong>{provider.evAvailableCount}/{provider.evConnectorCount}</strong>
												<span>connectors available</span>
											{:else}
												<strong>{provider.evConnectorCount}</strong>
												<span>charging connectors</span>
											{/if}
											{#if provider.evMaxKw}
												<span class="kw-badge">{provider.evMaxKw} kW max</span>
											{/if}
										</div>
									{:else}
										<div class="ev-headline">Public EV Charging Station</div>
									{/if}

									{#if provider.evConnectors.length > 0}
										<div class="connector-chips">
											{#each provider.evConnectors as conn}
												<span class="connector-chip">
													{conn.typeLabel} · {conn.maxKw} kW ({conn.availableCount != null ? `${conn.availableCount}/${conn.count}` : conn.count})
												</span>
											{/each}
										</div>
									{/if}
								</div>
							{:else if provider.openStatus.todayHours || provider.phoneNumber}
								<div class="repair-details-box">
									{#if provider.openStatus.todayHours}
										<div>{provider.openStatus.todayHours}</div>
									{/if}
									{#if provider.phoneNumber}
										<div>{provider.phoneNumber}</div>
									{/if}
								</div>
							{/if}

							<div class="card-actions">
								<button
									id={index === 0 ? 'dispatch-route-btn' : `dispatch-route-btn-${index}`}
									data-testid="dispatch-route-btn"
									type="button"
									class="route-btn"
									onclick={() => void selectAndRouteToProvider(provider)}
								>
									{provider.id === selectedProviderId ? 'Route Active ✓' : 'Route Here →'}
								</button>
								{#if provider.googleMapsUri}
									<a
										href={provider.googleMapsUri}
										target="_blank"
										rel="noopener noreferrer"
										class="card-ext-link"
									>
										Details ↗
									</a>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</aside>

		<section class="map-pane" aria-label="Interactive Seattle dispatch map">
			<div
				id="map-container"
				data-testid="map-container"
				class="map-canvas"
				bind:this={mapContainerEl}
			>
				{#if !hasValidApiKey}
					<div class="map-unconfigured">
						<div class="map-unconfigured-card">
							<h2>Interactive Seattle Dispatch Map</h2>
							<p>
								Add your <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> and
								reload to display the interactive vector map, draggable SOS pin, 5–15 km
								search ring, EV charging stations, auto repair markers, and turn-by-turn
								route polylines.
							</p>
							<p class="coord-readout">
								Default Center: Seattle, WA ({SEATTLE_CENTER.lat}, {SEATTLE_CENTER.lng}) ·
								Radius: {radiusKm} km
							</p>
						</div>
					</div>
				{/if}
			</div>

			<div class="map-legend" aria-label="Map legend">
				<div class="legend-item">
					<span class="legend-dot driver"></span>
					<span>Driver Pin (Drag or Click Map)</span>
				</div>
				<div class="legend-item">
					<span class="legend-dot ev"></span>
					<span>EV Fast Charger</span>
				</div>
				<div class="legend-item">
					<span class="legend-dot repair"></span>
					<span>Auto Repair</span>
				</div>
				<div class="legend-item">
					<span class="legend-ring"></span>
					<span>{radiusKm} km Radius</span>
				</div>
			</div>
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
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 64px;
		padding: 10px 16px;
		background: var(--bg-header);
		color: #f8fafc;
		border-bottom: 1px solid #1e293b;
		z-index: 20;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.brand-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: linear-gradient(135deg, #2563eb, #10b981);
		display: grid;
		place-items: center;
		font-size: 18px;
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
	}

	.brand-title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: #ffffff;
	}

	.brand-subtitle {
		margin: 0;
		font-size: 11px;
		color: #94a3b8;
	}

	.search-cluster {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1 1 360px;
		min-width: 260px;
		max-width: 680px;
	}

	.autocomplete-slot {
		flex: 1 1 220px;
		min-width: 180px;
	}

	.autocomplete-slot :global(gmp-place-autocomplete) {
		width: 100%;
		color-scheme: light;
		background-color: #ffffff;
		border-radius: 8px;
	}

	.autocomplete-placeholder {
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--bg-header-elevated);
		border: 1px solid #334155;
		color: #94a3b8;
		font-size: 12px;
	}

	.driver-address-pill {
		display: flex;
		align-items: center;
		gap: 7px;
		max-width: 230px;
		padding: 7px 11px;
		border-radius: 999px;
		background: var(--bg-header-elevated);
		border: 1px solid #334155;
		font-size: 12px;
		color: #e2e8f0;
		white-space: nowrap;
		overflow: hidden;
	}

	.driver-address-text {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
		flex-shrink: 0;
	}

	.header-action-btn {
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #1e293b;
		color: #e2e8f0;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.header-action-btn:hover:not(:disabled) {
		background: #334155;
		border-color: #475569;
	}

	.header-action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.filters-cluster {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.pill-group {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px;
		border-radius: 9px;
		background: var(--bg-header-elevated);
		border: 1px solid #334155;
	}

	.filter-pill,
	.radius-pill {
		border: none;
		background: transparent;
		color: #cbd5e1;
		font-size: 12px;
		font-weight: 600;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.filter-pill:hover,
	.radius-pill:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.08);
	}

	.filter-pill.active,
	.radius-pill.active {
		background: var(--brand-blue);
		color: #ffffff;
	}

	.filter-pill.ev.active {
		background: var(--ev-green);
	}

	.filter-pill.repair.active {
		background: var(--repair-amber);
	}

	.radius-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.radius-select {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.workspace {
		display: flex;
		flex: 1 1 auto;
		min-height: 0;
		overflow: hidden;
	}

	.dispatch-sidebar {
		width: 410px;
		flex-shrink: 0;
		background: var(--bg-surface);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.sidebar-title {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
	}

	.sidebar-meta {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--text-muted);
	}

	.loading-chip {
		font-size: 11px;
		font-weight: 600;
		color: var(--brand-blue);
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 999px;
		padding: 3px 10px;
	}

	.notice-banner {
		margin: 10px 14px 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		font-size: 12px;
		line-height: 1.4;
	}

	.route-summary-card {
		margin: 12px 14px 0;
		padding: 12px 14px;
		border-radius: 12px;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		box-shadow: var(--shadow-sm);
		max-height: 45vh;
		display: flex;
		flex-direction: column;
	}

	.route-summary-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.route-kicker {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--brand-blue-dark);
	}

	.route-dest-name {
		margin: 2px 0 2px;
		font-size: 14px;
		font-weight: 700;
	}

	.route-dest-address {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.clear-route-btn {
		border: 1px solid #93c5fd;
		background: #ffffff;
		color: #1e40af;
		font-size: 11px;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 6px;
		cursor: pointer;
	}

	.route-metrics {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
	}

	.metric-box {
		background: #ffffff;
		border: 1px solid #dbeafe;
		border-radius: 8px;
		padding: 6px 10px;
		display: flex;
		flex-direction: column;
	}

	.metric-label {
		font-size: 10px;
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: 600;
	}

	.metric-value {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.gmaps-link {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		color: var(--brand-blue-dark);
		text-decoration: none;
	}

	.steps-toggle-btn {
		margin-top: 10px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		border: none;
		background: rgba(255, 255, 255, 0.75);
		padding: 7px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		color: #1e3a8a;
		cursor: pointer;
	}

	.steps-list {
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.step-item {
		display: flex;
		gap: 8px;
		background: #ffffff;
		border-radius: 8px;
		padding: 7px 9px;
		border: 1px solid #dbeafe;
		font-size: 12px;
	}

	.step-index {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		background: #dbeafe;
		color: #1e40af;
		font-size: 11px;
		font-weight: 700;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.step-instruction {
		color: var(--text-primary);
		line-height: 1.35;
	}

	.step-meta {
		margin-top: 2px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.provider-list {
		flex: 1 1 auto;
		overflow-y: auto;
		padding: 12px 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.provider-card {
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 13px 14px;
		background: #ffffff;
		box-shadow: var(--shadow-sm);
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.provider-card:hover {
		border-color: var(--border-strong);
		box-shadow: var(--shadow-md);
	}

	.provider-card.selected {
		border-color: var(--brand-blue);
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16);
	}

	.card-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 6px;
	}

	.category-badge {
		font-size: 11px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 999px;
	}

	.category-badge.ev {
		color: #047857;
		background: var(--ev-green-bg);
		border: 1px solid var(--ev-green-border);
	}

	.category-badge.repair {
		color: #b45309;
		background: var(--repair-amber-bg);
		border: 1px solid var(--repair-amber-border);
	}

	.eta-badge {
		font-size: 12px;
		font-weight: 700;
		color: #1e40af;
		background: #eff6ff;
		border: 1px solid #dbeafe;
		padding: 3px 8px;
		border-radius: 6px;
		white-space: nowrap;
	}

	.provider-name {
		margin: 0 0 3px;
		font-size: 15px;
		font-weight: 700;
		line-height: 1.3;
	}

	.provider-address {
		margin: 0 0 8px;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.provider-stats {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.rating-pill {
		font-size: 12px;
		font-weight: 600;
		color: #0f172a;
	}

	.rating-pill.muted {
		color: var(--text-muted);
		font-weight: 500;
	}

	.rating-count {
		color: var(--text-muted);
		font-weight: 500;
	}

	.status-pill {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		background: #f1f5f9;
		color: var(--text-secondary);
	}

	.status-pill.open {
		background: #ecfdf5;
		color: #047857;
	}

	.status-pill.closed {
		background: #fef2f2;
		color: #b91c1c;
	}

	.ev-details-box {
		background: #f8fafc;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 8px 10px;
		margin-bottom: 10px;
		font-size: 12px;
	}

	.ev-headline {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		color: #0f172a;
	}

	.kw-badge {
		margin-left: auto;
		font-size: 11px;
		font-weight: 700;
		color: #047857;
		background: #d1fae5;
		padding: 2px 6px;
		border-radius: 5px;
	}

	.connector-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}

	.connector-chip {
		font-size: 11px;
		color: #334155;
		background: #ffffff;
		border: 1px solid #cbd5e1;
		padding: 2px 6px;
		border-radius: 5px;
	}

	.repair-details-box {
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.route-btn {
		flex: 1 1 auto;
		border: none;
		border-radius: 8px;
		padding: 8px 12px;
		background: var(--brand-blue);
		color: #ffffff;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.route-btn:hover {
		background: var(--brand-blue-dark);
	}

	.card-ext-link {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		padding: 7px 10px;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
	}

	.card-ext-link:hover {
		background: #f1f5f9;
	}

	.empty-state {
		padding: 24px 16px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 13px;
		border: 1px dashed var(--border-strong);
		border-radius: 12px;
		background: #f8fafc;
	}

	.empty-state h3 {
		margin: 0 0 8px;
		color: var(--text-primary);
		font-size: 15px;
	}

	.demo-key-link {
		display: inline-block;
		margin-top: 8px;
		padding: 8px 14px;
		background: var(--brand-blue);
		color: #ffffff;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
	}

	.map-pane {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		min-height: 540px;
		height: 100%;
	}

	.map-canvas {
		width: 100%;
		height: 100%;
		min-height: 540px;
		background: #e2e8f0;
	}

	.map-unconfigured {
		width: 100%;
		height: 100%;
		min-height: 540px;
		display: grid;
		place-items: center;
		padding: 24px;
		background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
	}

	.map-unconfigured-card {
		max-width: 480px;
		background: #ffffff;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		padding: 24px;
		box-shadow: var(--shadow-md);
		text-align: center;
	}

	.map-unconfigured-card h2 {
		margin: 0 0 8px;
		font-size: 18px;
	}

	.map-unconfigured-card p {
		margin: 0 0 10px;
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.coord-readout {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		color: var(--brand-blue-dark);
	}

	.map-legend {
		position: absolute;
		bottom: 18px;
		left: 16px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		padding: 8px 14px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid var(--border-subtle);
		box-shadow: var(--shadow-md);
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary);
		pointer-events: none;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		display: inline-block;
	}

	.legend-dot.driver {
		background: #2563eb;
	}

	.legend-dot.ev {
		background: #059669;
	}

	.legend-dot.repair {
		background: #d97706;
	}

	.legend-ring {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		border: 2px solid #2563eb;
		background: rgba(37, 99, 235, 0.14);
		display: inline-block;
	}

	@media (max-width: 960px) {
		.app-shell {
			height: auto;
			overflow: visible;
		}

		.workspace {
			flex-direction: column-reverse;
			overflow: visible;
		}

		.dispatch-sidebar {
			width: 100%;
			border-right: none;
			border-top: 1px solid var(--border-subtle);
		}

		.map-pane,
		.map-canvas,
		.map-unconfigured {
			min-height: 540px;
			height: 540px;
		}
	}
</style>
