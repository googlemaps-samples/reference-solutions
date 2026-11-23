<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		CHICAGO_DELIVERY_ZONE_POLYGON,
		CHICAGO_TAX_RATE,
		DEFAULT_CART_ITEMS,
		DEMO_MAP_ID,
		GMP_ATTRIBUTION_ID,
		IN_ZONE_PRESET_ADDRESS,
		KITCHEN_HUB,
		OUT_OF_ZONE_PRESET_ADDRESS,
		SEED_CUSTOMER_ADDRESS
	} from '$lib/constants/chicago';
	import {
		buildStaticReceiptMapUrl,
		computeDeliveryRoute,
		validateCustomerAddress
	} from '$lib/services/deliveryApi';
	import {
		hasConfiguredMapsKey,
		loadGoogleMapsLibraries,
		type LoadedGoogleMapsLibraries
	} from '$lib/services/mapsLoader';
	import type {
		AddressValidationResult,
		CourierProgress,
		DeliveryFeeTier,
		LatLngPoint,
		PlacedOrder,
		RouteComputationResult
	} from '$lib/types/delivery';
	import {
		calculateTieredDeliveryFee,
		deriveCourierStage,
		formatCurrency,
		formatDistanceKm,
		formatDurationMinutes,
		interpolatePathAtFraction
	} from '$lib/utils/deliveryPricing';
	import {
		createCourierMarkerElement,
		createCustomerMarkerElement,
		createKitchenMarkerElement,
		type CourierMarkerHandle
	} from '$lib/utils/markerElements';

	let mapContainerEl = $state<HTMLDivElement | null>(null);
	let autocompleteHostEl = $state<HTMLDivElement | null>(null);

	let libs: LoadedGoogleMapsLibraries | null = null;
	let mapInstance: google.maps.Map | null = null;
	let deliveryPolygon: google.maps.Polygon | null = null;
	let routePolyline: google.maps.Polyline | null = null;
	let kitchenMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let customerMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let courierMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let courierHandle: CourierMarkerHandle | null = null;
	let placeAutocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;

	let apiKeyConfigured = $state(true);
	let mapsReady = $state(false);
	let loadingEvaluation = $state(false);
	let errorMessage = $state<string | null>(null);

	let addressInput = $state(SEED_CUSTOMER_ADDRESS);
	let validationResult = $state<AddressValidationResult | null>(null);
	let routeResult = $state<RouteComputationResult | null>(null);
	let feeTier = $state<DeliveryFeeTier | null>(null);

	let staticMapUrl = $state<string | null>(null);
	let staticMapLoadError = $state(false);
	let placedOrder = $state<PlacedOrder | null>(null);

	let simulationFraction = $state(0);
	let simulationRunning = $state(false);
	let rafId: number | null = null;
	let lastFrameTime = 0;

	const SIMULATION_DURATION_MS = 22000;

	const cartSubtotal = $derived(
		DEFAULT_CART_ITEMS.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
	);
	const effectiveDeliveryFee = $derived(feeTier?.fee ?? 0);
	const estimatedTax = $derived(cartSubtotal * CHICAGO_TAX_RATE);
	const orderTotal = $derived(cartSubtotal + effectiveDeliveryFee + estimatedTax);

	const courierProgress = $derived.by<CourierProgress>(() => {
		const path = routeResult?.path ?? [];
		const totalDist = routeResult?.distanceMeters ?? 0;
		const totalDuration = routeResult?.durationSeconds ?? 0;
		const frac = Math.max(0, Math.min(1, simulationFraction));
		const pose = interpolatePathAtFraction(path, frac);
		const stage = deriveCourierStage(frac, simulationRunning);

		let currentInstruction = 'Awaiting order dispatch from Fulton Market Kitchen Hub.';
		if (routeResult && routeResult.steps.length > 0 && (simulationRunning || frac > 0)) {
			const idx = Math.min(
				routeResult.steps.length - 1,
				Math.floor(frac * routeResult.steps.length)
			);
			currentInstruction = routeResult.steps[idx]?.instruction ?? 'Proceed toward drop-off';
		}
		if (stage === 'delivered') {
			currentInstruction = 'Order delivered at customer drop-off point.';
		}

		return {
			stage,
			progressPercent: Math.round(frac * 100),
			currentPosition: pose.position,
			headingDegrees: pose.headingDegrees,
			remainingDistanceMeters: Math.max(0, Math.round(totalDist * (1 - frac))),
			remainingEtaSeconds: Math.max(0, Math.round(totalDuration * (1 - frac))),
			currentInstruction,
			running: simulationRunning
		};
	});

	const topStatusLabel = $derived.by(() => {
		if (!apiKeyConfigured) return 'API Key Required';
		if (loadingEvaluation) return 'Validating Address & Route...';
		if (courierProgress.stage === 'delivered') return 'Order Delivered';
		if (courierProgress.running) return `Courier En Route • ${courierProgress.progressPercent}%`;
		if (feeTier?.eligible) return 'Zone Verified • Ready to Order';
		if (feeTier && !feeTier.eligible) return 'Outside Delivery Zone';
		return 'Chicago Dispatch Ready';
	});

	const topStatusClass = $derived.by(() => {
		if (!apiKeyConfigured) return 'status-pill--warn';
		if (courierProgress.stage === 'delivered' || feeTier?.eligible) return 'status-pill--ok';
		if (feeTier && !feeTier.eligible) return 'status-pill--danger';
		return 'status-pill--info';
	});

	function stopAnimationLoop() {
		if (rafId !== null && typeof window !== 'undefined') {
			window.cancelAnimationFrame(rafId);
			rafId = null;
		}
		simulationRunning = false;
	}

	function syncCourierMarker(fraction: number, active: boolean) {
		if (!courierMarker || !courierHandle || !routeResult || routeResult.path.length < 2) return;
		const pose = interpolatePathAtFraction(routeResult.path, fraction);
		courierMarker.position = pose.position;
		courierHandle.updatePose(pose.headingDegrees, active);
	}

	function animationTick(timestamp: number) {
		if (!simulationRunning || !routeResult || routeResult.path.length < 2) return;

		if (lastFrameTime === 0) {
			lastFrameTime = timestamp;
		}
		const deltaMs = Math.min(100, timestamp - lastFrameTime);
		lastFrameTime = timestamp;

		const nextFraction = Math.min(1, simulationFraction + deltaMs / SIMULATION_DURATION_MS);
		simulationFraction = nextFraction;
		syncCourierMarker(nextFraction, nextFraction < 1);

		if (nextFraction >= 1) {
			stopAnimationLoop();
			return;
		}

		rafId = window.requestAnimationFrame(animationTick);
	}

	function startCourierSimulation(resetToStart = false) {
		if (!mapInstance || !courierMarker || !routeResult || routeResult.path.length < 2) return;
		stopAnimationLoop();
		if (resetToStart || simulationFraction >= 0.995) {
			simulationFraction = 0;
		}
		courierMarker.map = mapInstance;
		syncCourierMarker(simulationFraction, true);
		simulationRunning = true;
		lastFrameTime = 0;
		rafId = window.requestAnimationFrame(animationTick);
	}

	function toggleCourierSimulation() {
		if (simulationRunning) {
			stopAnimationLoop();
			syncCourierMarker(simulationFraction, false);
		} else {
			const shouldRestart = simulationFraction >= 0.995;
			startCourierSimulation(shouldRestart);
		}
	}

	async function evaluateDeliveryAddress(
		targetAddress: string,
		fallbackCoords?: LatLngPoint | null,
		fallbackPlaceId?: string
	) {
		const trimmed = targetAddress.trim();
		if (!trimmed || !libs || !mapInstance || !deliveryPolygon) return;

		stopAnimationLoop();
		simulationFraction = 0;
		if (courierMarker) courierMarker.map = null;
		placedOrder = null;
		loadingEvaluation = true;
		errorMessage = null;
		staticMapLoadError = false;

		try {
			const validation = await validateCustomerAddress(libs, trimmed, {
				autocompleteElement: placeAutocompleteEl ?? undefined,
				fallbackLocation: fallbackCoords,
				fallbackPlaceId
			});
			validationResult = validation;
			addressInput = validation.formattedAddress;
			if (placeAutocompleteEl) {
				placeAutocompleteEl.value = validation.formattedAddress;
			}

			const dropoffLatLng = new libs.core.LatLng(
				validation.location.lat,
				validation.location.lng
			);
			const insidePolygon = libs.geometry.poly.containsLocation(
				dropoffLatLng,
				deliveryPolygon
			);

			const computedRoute = await computeDeliveryRoute(
				libs,
				KITCHEN_HUB.coords,
				validation.location
			);
			routeResult = computedRoute;

			const computedFee = calculateTieredDeliveryFee(
				computedRoute.distanceMeters,
				insidePolygon
			);
			feeTier = computedFee;

			if (customerMarker) {
				customerMarker.position = validation.location;
				customerMarker.content = createCustomerMarkerElement(computedFee.eligible);
				customerMarker.map = mapInstance;
			}

			if (routePolyline) {
				routePolyline.setOptions({
					path: computedRoute.path,
					strokeColor: computedFee.eligible ? '#2563eb' : '#dc2626',
					strokeOpacity: computedFee.eligible ? 0.92 : 0.72
				});
			}

			const bounds = new libs.core.LatLngBounds();
			bounds.extend(KITCHEN_HUB.coords);
			bounds.extend(validation.location);
			for (const pt of computedRoute.path) {
				bounds.extend(pt);
			}
			mapInstance.fitBounds(bounds, { top: 56, right: 48, bottom: 72, left: 48 });

			staticMapUrl = buildStaticReceiptMapUrl(
				KITCHEN_HUB.coords,
				validation.location,
				computedRoute.encodedPolyline
			);
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Unable to validate address and compute route.';
		} finally {
			loadingEvaluation = false;
		}
	}

	function handlePresetSelect(presetAddress: string) {
		addressInput = presetAddress;
		if (placeAutocompleteEl) {
			placeAutocompleteEl.value = presetAddress;
		}
		void evaluateDeliveryAddress(presetAddress);
	}

	function handleValidateClick() {
		const liveVal = placeAutocompleteEl?.value?.trim() || addressInput;
		void evaluateDeliveryAddress(liveVal);
	}

	function handlePlaceOrder() {
		if (!validationResult || !routeResult || !feeTier?.eligible || feeTier.fee === null) {
			return;
		}
		const mapUrl =
			staticMapUrl ??
			buildStaticReceiptMapUrl(
				KITCHEN_HUB.coords,
				validationResult.location,
				routeResult.encodedPolyline
			);

		placedOrder = {
			orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
			placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			customerAddress: validationResult.formattedAddress,
			items: DEFAULT_CART_ITEMS,
			subtotal: cartSubtotal,
			deliveryFee: feeTier.fee,
			tax: estimatedTax,
			total: orderTotal,
			distanceMeters: routeResult.distanceMeters,
			etaSeconds: routeResult.durationSeconds,
			staticMapUrl: mapUrl
		};

		startCourierSimulation(true);
	}

	onMount(async () => {
		const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY;
		if (!hasConfiguredMapsKey(apiKey)) {
			apiKeyConfigured = false;
			errorMessage =
				'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Maps Demo Key or Google Cloud API key.';
			return;
		}

		try {
			libs = await loadGoogleMapsLibraries(apiKey!);
			if (!mapContainerEl) return;

			mapInstance = new libs.maps.Map(mapContainerEl, {
				center: KITCHEN_HUB.coords,
				zoom: 13,
				mapId: DEMO_MAP_ID,
				internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true
			});

			deliveryPolygon = new libs.maps.Polygon({
				paths: CHICAGO_DELIVERY_ZONE_POLYGON,
				strokeColor: '#0f766e',
				strokeOpacity: 0.9,
				strokeWeight: 2.5,
				fillColor: '#14b8a6',
				fillOpacity: 0.14,
				map: mapInstance
			});

			routePolyline = new libs.maps.Polyline({
				path: [],
				geodesic: true,
				strokeColor: '#2563eb',
				strokeOpacity: 0.92,
				strokeWeight: 5,
				map: mapInstance
			});

			kitchenMarker = new libs.marker.AdvancedMarkerElement({
				map: mapInstance,
				position: KITCHEN_HUB.coords,
				title: KITCHEN_HUB.name,
				content: createKitchenMarkerElement(),
				zIndex: 20
			});

			customerMarker = new libs.marker.AdvancedMarkerElement({
				map: null,
				position: KITCHEN_HUB.coords,
				title: 'Customer Drop-off',
				content: createCustomerMarkerElement(true),
				zIndex: 25
			});

			courierHandle = createCourierMarkerElement();
			courierMarker = new libs.marker.AdvancedMarkerElement({
				map: null,
				position: KITCHEN_HUB.coords,
				title: 'Live Courier',
				content: courierHandle.element,
				zIndex: 30
			});

			if (autocompleteHostEl) {
				const ac = new libs.places.PlaceAutocompleteElement({
					includedRegionCodes: ['us'],
					locationBias: { center: KITCHEN_HUB.coords, radius: 15000 }
				});
				ac.placeholder = 'Search Chicago delivery address...';
				ac.value = SEED_CUSTOMER_ADDRESS;

				ac.addEventListener('gmp-select', async (rawEvent) => {
					const selectEvent = rawEvent as google.maps.places.PlacePredictionSelectEvent;
					try {
						const place = selectEvent.placePrediction.toPlace();
						await place.fetchFields({
							fields: ['displayName', 'formattedAddress', 'location', 'id']
						});
						const selectedAddr =
							place.formattedAddress ?? place.displayName ?? ac.value ?? SEED_CUSTOMER_ADDRESS;
						const fallbackLoc = place.location
							? { lat: place.location.lat(), lng: place.location.lng() }
							: null;
						addressInput = selectedAddr;
						await evaluateDeliveryAddress(selectedAddr, fallbackLoc, place.id);
					} catch (selectErr) {
						errorMessage =
							selectErr instanceof Error
								? selectErr.message
								: 'Unable to load selected place details.';
					}
				});

				ac.addEventListener('gmp-error', () => {
					errorMessage =
						'Places Autocomplete encountered an API error. Verify Places API (New) is enabled on your key.';
				});

				placeAutocompleteEl = ac;
				autocompleteHostEl.replaceChildren(ac);
			}

			mapsReady = true;
			await evaluateDeliveryAddress(SEED_CUSTOMER_ADDRESS);
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform.';
		}
	});

	onDestroy(() => {
		stopAnimationLoop();
	});
</script>

<div class="app-shell">
	<header class="topbar">
		<div class="topbar__brand">
			<div class="topbar__logo" aria-hidden="true">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 17h14l-1.5-8h-11z" />
					<path d="M8 9V6a4 4 0 0 1 8 0v3" />
				</svg>
			</div>
			<div>
				<h1 class="topbar__title">Fulton Fresh Dispatch</h1>
				<p class="topbar__subtitle">Chicago On-Demand Delivery Checkout & Live Tracker</p>
			</div>
		</div>

		<div class="topbar__meta">
			<span class="hub-badge">
				<strong>Kitchen Hub:</strong> 820 W Fulton Market (41.8868, -87.6486)
			</span>
			<span class={`status-pill ${topStatusClass}`} data-testid="topbar-status-pill">
				{topStatusLabel}
			</span>
		</div>
	</header>

	<main class="workspace">
		<aside class="sidebar">
			{#if !apiKeyConfigured}
				<div class="alert-banner" role="alert">
					<strong>Configuration Required:</strong> Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in
					<code>.env</code> (see <code>.env.example</code> for free Maps Demo Key instructions),
					then restart the server.
				</div>
			{/if}

			{#if errorMessage}
				<div class="alert-banner alert-banner--error" role="alert">
					{errorMessage}
				</div>
			{/if}

			<!-- Card 1: Checkout Address Autocomplete & Validation -->
			<section class="panel-card" aria-labelledby="step-1-heading">
				<div class="panel-card__header">
					<h2 id="step-1-heading" class="panel-card__step">
						<span class="step-dot">1</span>
						Checkout Address & Deliverability
					</h2>
					{#if validationResult}
						<span
							class={`status-pill ${validationResult.deliverable ? 'status-pill--ok' : 'status-pill--warn'}`}
						>
							{validationResult.deliverable ? 'Deliverable' : 'Check Address'}
						</span>
					{/if}
				</div>

				<div class="autocomplete-shell">
					<div
						id="checkout-address-autocomplete"
						data-testid="checkout-address-autocomplete"
						class="autocomplete-host"
						bind:this={autocompleteHostEl}
					>
						{#if !mapsReady}
							<input
								class="fallback-input"
								type="text"
								bind:value={addressInput}
								placeholder="Enter Chicago delivery address..."
								aria-label="Chicago delivery address"
							/>
						{/if}
					</div>

					<div class="action-row">
						<button
							id="validate-address-btn"
							data-testid="validate-address-btn"
							type="button"
							class="btn btn--primary"
							disabled={loadingEvaluation || !mapsReady}
							onclick={handleValidateClick}
						>
							{loadingEvaluation ? 'Validating...' : 'Validate & Quote'}
						</button>
					</div>

					<div class="action-row">
						<button
							id="preset-address-in-zone-btn"
							data-testid="preset-address-in-zone-btn"
							type="button"
							class="btn btn--secondary"
							disabled={loadingEvaluation || !mapsReady}
							onclick={() => handlePresetSelect(IN_ZONE_PRESET_ADDRESS)}
						>
							In-Zone: 401 N Michigan
						</button>
						<button
							id="preset-address-out-of-zone-btn"
							data-testid="preset-address-out-of-zone-btn"
							type="button"
							class="btn btn--secondary"
							disabled={loadingEvaluation || !mapsReady}
							onclick={() => handlePresetSelect(OUT_OF_ZONE_PRESET_ADDRESS)}
						>
							Out-of-Zone: 6330 N Sheridan
						</button>
					</div>
				</div>

				<div id="validation-status-panel" data-testid="validation-status-panel" class="validation-box">
					{#if validationResult}
						<div class="validation-box__top">
							<div>
								<p class="validation-address">{validationResult.formattedAddress}</p>
								<p class="validation-sub">
									{validationResult.deliverabilityReason}
									{#if validationResult.plusCode}
										• Plus Code: {validationResult.plusCode}
									{/if}
								</p>
							</div>
						</div>

						<div class="verdict-grid">
							<div class="verdict-chip">
								<span class="verdict-chip__label">Validation Granularity</span>
								<span class="verdict-chip__value"
									>{validationResult.verdict.validationGranularity}</span
								>
							</div>
							<div class="verdict-chip">
								<span class="verdict-chip__label">Geocode Granularity</span>
								<span class="verdict-chip__value"
									>{validationResult.verdict.geocodeGranularity}</span
								>
							</div>
							<div class="verdict-chip">
								<span class="verdict-chip__label">Address Complete</span>
								<span class="verdict-chip__value">
									{validationResult.verdict.addressComplete ? 'Complete' : 'Incomplete'}
								</span>
							</div>
							<div class="verdict-chip">
								<span class="verdict-chip__label">Components Status</span>
								<span class="verdict-chip__value">
									{validationResult.verdict.hasUnconfirmedComponents
										? 'Unconfirmed'
										: validationResult.verdict.hasReplacedComponents
											? 'Replaced'
											: validationResult.verdict.hasInferredComponents
												? 'Inferred'
												: 'All Confirmed'}
								</span>
							</div>
							<div class="verdict-chip">
								<span class="verdict-chip__label">Property Type</span>
								<span class="verdict-chip__value">
									{#if validationResult.metadata?.poBox}
										PO Box
									{:else if validationResult.metadata?.business}
										Commercial
									{:else if validationResult.metadata?.residential}
										Residential
									{:else}
										Verified Premise
									{/if}
								</span>
							</div>
							<div class="verdict-chip">
								<span class="verdict-chip__label">USPS CASS / DPV</span>
								<span class="verdict-chip__value">
									{#if validationResult.uspsData}
										DPV {validationResult.uspsData.dpvConfirmation} • {validationResult.uspsData
											.carrierRoute}
									{:else}
										Standardized
									{/if}
								</span>
							</div>
						</div>
					{:else}
						<p class="validation-sub">
							Select or enter a Chicago address to inspect Address Validation API granularity and
							USPS CASS metadata.
						</p>
					{/if}

					<div
						id="zone-eligibility-badge"
						data-testid="zone-eligibility-badge"
						class="zone-checks"
					>
						<div
							class={`zone-check-item ${feeTier ? (feeTier.insidePolygon ? 'is-pass' : 'is-fail') : ''}`}
						>
							<strong>Polygon Zone:</strong>
							{feeTier ? (feeTier.insidePolygon ? 'Inside Zone' : 'Outside Polygon') : 'Pending'}
						</div>
						<div
							class={`zone-check-item ${feeTier ? (feeTier.withinDistanceLimit ? 'is-pass' : 'is-fail') : ''}`}
						>
							<strong>8 km Cap:</strong>
							{routeResult
								? `${formatDistanceKm(routeResult.distanceMeters)} (${feeTier?.withinDistanceLimit ? 'Pass' : 'Over'})`
								: 'Pending'}
						</div>
					</div>
				</div>
			</section>

			<!-- Card 2: Tiered Delivery Fee, Traffic-Aware ETA & Courier Dispatch -->
			<section class="panel-card" aria-labelledby="step-2-heading">
				<div class="panel-card__header">
					<h2 id="step-2-heading" class="panel-card__step">
						<span class="step-dot">2</span>
						Delivery Quote & Live Dispatch
					</h2>
					{#if feeTier}
						<span class={`status-pill ${feeTier.eligible ? 'status-pill--ok' : 'status-pill--danger'}`}>
							{feeTier.tierLabel}
						</span>
					{/if}
				</div>

				<div
					id="delivery-fee-eta-summary"
					data-testid="delivery-fee-eta-summary"
					class="fee-summary-grid"
				>
					<div class="metric-box">
						<span class="metric-box__label">Delivery Fee</span>
						<span class="metric-box__value">
							{feeTier?.fee !== null && feeTier?.fee !== undefined
								? formatCurrency(feeTier.fee)
								: 'N/A'}
						</span>
					</div>
					<div class="metric-box">
						<span class="metric-box__label">Traffic ETA</span>
						<span class="metric-box__value">
							{routeResult ? formatDurationMinutes(routeResult.durationSeconds) : '--'}
						</span>
					</div>
					<div class="metric-box">
						<span class="metric-box__label">Road Distance</span>
						<span class="metric-box__value">
							{routeResult ? formatDistanceKm(routeResult.distanceMeters) : '--'}
						</span>
					</div>
				</div>

				<div class="tier-list" aria-label="Distance-based fee tiers">
					<div
						class={`tier-pill ${routeResult && feeTier?.eligible && routeResult.distanceMeters <= 3000 ? 'is-active' : ''}`}
					>
						≤ 3.0 km<br /><strong>$2.99</strong>
					</div>
					<div
						class={`tier-pill ${routeResult && feeTier?.eligible && routeResult.distanceMeters > 3000 && routeResult.distanceMeters <= 5500 ? 'is-active' : ''}`}
					>
						≤ 5.5 km<br /><strong>$4.99</strong>
					</div>
					<div
						class={`tier-pill ${routeResult && feeTier?.eligible && routeResult.distanceMeters > 5500 && routeResult.distanceMeters <= 8000 ? 'is-active' : ''}`}
					>
						≤ 8.0 km<br /><strong>$6.99</strong>
					</div>
				</div>

				{#if feeTier && !feeTier.eligible}
					<div class="alert-banner alert-banner--error">{feeTier.reason}</div>
				{/if}

				<button
					id="place-order-btn"
					data-testid="place-order-btn"
					type="button"
					class="btn btn--cobalt"
					disabled={!feeTier?.eligible || !validationResult?.deliverable || loadingEvaluation}
					onclick={handlePlaceOrder}
				>
					{placedOrder
						? `Order ${placedOrder.orderId} Dispatched`
						: feeTier?.eligible
							? `Place Delivery Order • ${formatCurrency(orderTotal)}`
							: 'Address Must Be Deliverable & In-Zone'}
				</button>

				<div id="courier-progress-panel" data-testid="courier-progress-panel" class="courier-panel">
					<div class="panel-card__header">
						<strong style="font-size: 0.82rem;">Live Courier Progress</strong>
						<button
							id="courier-simulation-toggle-btn"
							data-testid="courier-simulation-toggle-btn"
							type="button"
							class="btn btn--secondary"
							style="flex: 0 0 auto;"
							disabled={!routeResult || routeResult.path.length < 2 || !feeTier?.eligible}
							onclick={toggleCourierSimulation}
						>
							{#if simulationRunning}
								Pause Courier
							{:else if simulationFraction >= 0.995}
								Replay Delivery
							{:else if simulationFraction > 0}
								Resume Courier
							{:else}
								Simulate Courier
							{/if}
						</button>
					</div>

					<div class="progress-track" role="progressbar" aria-valuenow={courierProgress.progressPercent} aria-valuemin={0} aria-valuemax={100}>
						<div class="progress-fill" style={`width: ${courierProgress.progressPercent}%;`}></div>
					</div>

					<div class="stage-steps">
						<div
							class={`stage-step ${courierProgress.stage === 'preparing' ? 'is-current' : courierProgress.progressPercent >= 10 ? 'is-done' : ''}`}
						>
							Preparing
						</div>
						<div
							class={`stage-step ${courierProgress.stage === 'en_route' ? 'is-current' : courierProgress.progressPercent >= 80 ? 'is-done' : ''}`}
						>
							En Route
						</div>
						<div
							class={`stage-step ${courierProgress.stage === 'arriving' ? 'is-current' : courierProgress.stage === 'delivered' ? 'is-done' : ''}`}
						>
							Arriving
						</div>
						<div class={`stage-step ${courierProgress.stage === 'delivered' ? 'is-done' : ''}`}>
							Delivered
						</div>
					</div>

					<div class="instruction-banner">
						<strong>Next Step:</strong> {courierProgress.currentInstruction}
						{#if routeResult}
							<span style="display: block; margin-top: 3px; color: #64748b;">
								Remaining: {formatDistanceKm(courierProgress.remainingDistanceMeters)} • ~{formatDurationMinutes(courierProgress.remainingEtaSeconds)}
							</span>
						{/if}
					</div>
				</div>
			</section>

			<!-- Card 3: Order Receipt Card & Maps Static API Preview -->
			<section id="order-receipt-card" data-testid="order-receipt-card" class="panel-card" aria-labelledby="step-3-heading">
				<div class="panel-card__header">
					<h2 id="step-3-heading" class="panel-card__step">
						<span class="step-dot">3</span>
						Order Receipt & Route Summary
					</h2>
					{#if placedOrder}
						<span class="status-pill status-pill--ok">{placedOrder.orderId}</span>
					{:else}
						<span class="status-pill status-pill--info">Preview</span>
					{/if}
				</div>

				<div class="receipt-items">
					{#each DEFAULT_CART_ITEMS as item (item.id)}
						<div class="receipt-row">
							<span>{item.quantity}× {item.name}</span>
							<strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
						</div>
					{/each}
				</div>

				<div class="receipt-totals">
					<div class="receipt-row">
						<span>Items Subtotal</span>
						<span>{formatCurrency(cartSubtotal)}</span>
					</div>
					<div class="receipt-row">
						<span>Delivery Fee ({feeTier?.tierLabel ?? 'Pending'})</span>
						<span>{feeTier?.fee !== null && feeTier?.fee !== undefined ? formatCurrency(feeTier.fee) : '--'}</span>
					</div>
					<div class="receipt-row">
						<span>Chicago Tax (10.25%)</span>
						<span>{formatCurrency(estimatedTax)}</span>
					</div>
					<div class="receipt-row receipt-row--total">
						<span>Total</span>
						<span>{formatCurrency(orderTotal)}</span>
					</div>
				</div>

				<div class="static-map-frame">
					{#if staticMapUrl && !staticMapLoadError}
						<img
							id="static-receipt-map-img"
							data-testid="static-receipt-map-img"
							src={staticMapUrl}
							alt="Maps Static API route summary from Fulton Market Kitchen Hub to drop-off address"
							onerror={() => {
								staticMapLoadError = true;
							}}
						/>
					{:else}
						<div class="static-map-fallback">
							{#if staticMapLoadError}
								Maps Static API image unavailable (verify Maps Static API is enabled for your key).
							{:else}
								Route summary preview will appear once an address is validated.
							{/if}
						</div>
					{/if}
				</div>
			</section>
		</aside>

		<section class="map-stage" aria-label="Live Chicago delivery tracking map">
			<div
				id="live-tracking-map"
				data-testid="live-tracking-map"
				class="live-map-canvas"
				bind:this={mapContainerEl}
			></div>

			<div class="map-overlay-eta">
				<div>
					<div class="map-overlay-eta__title">Live ETA</div>
					<div class="map-overlay-eta__value">
						{#if courierProgress.stage === 'delivered'}
							Arrived
						{:else if routeResult}
							{formatDurationMinutes(
								simulationRunning || simulationFraction > 0
									? courierProgress.remainingEtaSeconds
									: routeResult.durationSeconds
							)}
						{:else}
							--
						{/if}
					</div>
				</div>
				<div style="height: 28px; width: 1px; background: #e2e8f0;"></div>
				<div>
					<div class="map-overlay-eta__title">Route Distance</div>
					<div class="map-overlay-eta__value">
						{routeResult ? formatDistanceKm(routeResult.distanceMeters) : '--'}
					</div>
				</div>
			</div>

			<div class="map-legend">
				<span class="legend-item">
					<span class="legend-swatch" style="background: #0f766e;"></span>
					Kitchen Hub
				</span>
				<span class="legend-item">
					<span class="legend-swatch" style="background: #2563eb;"></span>
					Drop-off Pin
				</span>
				<span class="legend-item">
					<span class="legend-swatch" style="background: #0f172a;"></span>
					Live Courier
				</span>
				<span class="legend-item">
					<span class="legend-swatch--line" style="background: #14b8a6;"></span>
					8 km / Polygon Zone
				</span>
				<span class="legend-item">
					<span class="legend-swatch--line" style="background: #2563eb;"></span>
					Routes API Path
				</span>
			</div>
		</section>
	</main>
</div>
