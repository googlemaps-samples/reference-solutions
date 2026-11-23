<script lang="ts">
	import type { OriginLocation, RouteSummary, TravelModeOption } from '$lib/types/storefront';

	interface Props {
		autocompleteContainer?: HTMLDivElement | null;
		origin: OriginLocation;
		travelMode: TravelModeOption;
		routeSummary: RouteSummary | null;
		routeLoading: boolean;
		routeError: string | null;
		onSelectTravelMode: (mode: TravelModeOption) => void;
		onResetOrigin: () => void;
	}

	let {
		autocompleteContainer = $bindable<HTMLDivElement | null>(null),
		origin,
		travelMode,
		routeSummary,
		routeLoading,
		routeError,
		onSelectTravelMode,
		onResetOrigin
	}: Props = $props();

	const modeLabels: Record<TravelModeOption, string> = {
		DRIVING: 'Driving',
		TRANSIT: 'Transit',
		WALKING: 'Walking'
	};
</script>

<section class="card">
	<div class="card-header">
		<div>
			<p class="eyebrow">Routes &amp; Arrival</p>
			<h2 class="card-title">Get Directions to Clinic</h2>
		</div>
		<button type="button" class="text-action" onclick={onResetOrigin}>
			Use Ferry Building
		</button>
	</div>

	<div class="directions-field">
		<label class="field-label" for="origin-autocomplete">Starting Address</label>
		<div
			class="autocomplete-host"
			data-testid="origin-autocomplete-container"
			bind:this={autocompleteContainer}
		></div>
		<p class="origin-caption">
			Active origin: <strong>{origin.label}</strong>
		</p>
	</div>

	<div class="mode-pills" role="group" aria-label="Travel mode">
		<button
			type="button"
			class="mode-pill"
			class:is-active={travelMode === 'DRIVING'}
			data-testid="travel-mode-driving"
			aria-pressed={travelMode === 'DRIVING'}
			onclick={() => onSelectTravelMode('DRIVING')}
		>
			Drive
		</button>
		<button
			type="button"
			class="mode-pill"
			class:is-active={travelMode === 'TRANSIT'}
			data-testid="travel-mode-transit"
			aria-pressed={travelMode === 'TRANSIT'}
			onclick={() => onSelectTravelMode('TRANSIT')}
		>
			Transit
		</button>
		<button
			type="button"
			class="mode-pill"
			class:is-active={travelMode === 'WALKING'}
			data-testid="travel-mode-walking"
			aria-pressed={travelMode === 'WALKING'}
			onclick={() => onSelectTravelMode('WALKING')}
		>
			Walk
		</button>
	</div>

	<div class="route-summary-card" data-testid="route-summary-card">
		{#if routeLoading}
			<div class="route-loading">
				<span class="spinner" aria-hidden="true"></span>
				<span>Calculating {modeLabels[travelMode].toLowerCase()} route...</span>
			</div>
		{:else if routeError}
			<div class="notice-banner notice-warning">
				<span>{routeError}</span>
			</div>
		{:else if routeSummary}
			<div class="route-metrics">
				<div class="metric-block">
					<span class="metric-label">{modeLabels[routeSummary.travelMode]} ETA</span>
					<strong class="metric-value">{routeSummary.durationText}</strong>
				</div>
				<div class="metric-divider" aria-hidden="true"></div>
				<div class="metric-block">
					<span class="metric-label">Distance</span>
					<strong class="metric-value">{routeSummary.distanceText}</strong>
				</div>
			</div>
			<p class="route-endpoints">
				{routeSummary.originLabel} → {routeSummary.destinationLabel}
			</p>
		{:else}
			<p class="muted-copy">Select an origin address to preview travel time and route.</p>
		{/if}
	</div>
</section>
