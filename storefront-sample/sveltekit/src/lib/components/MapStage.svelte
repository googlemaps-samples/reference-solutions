<script lang="ts">
	import type { ViewMode } from '$lib/types/storefront';

	interface Props {
		mapContainer?: HTMLDivElement | null;
		streetViewContainer?: HTMLDivElement | null;
		viewMode: ViewMode;
		showCoverage: boolean;
		missingApiKey: boolean;
		mapError: string | null;
		streetViewDescription: string;
	}

	let {
		mapContainer = $bindable<HTMLDivElement | null>(null),
		streetViewContainer = $bindable<HTMLDivElement | null>(null),
		viewMode,
		showCoverage,
		missingApiKey,
		mapError,
		streetViewDescription
	}: Props = $props();
</script>

<div class="map-stage" class:is-split={viewMode === 'split'} class:is-streetview={viewMode === 'streetview'}>
	<div
		class="map-pane"
		class:is-hidden={viewMode === 'streetview'}
	>
		<div
			class="map-canvas"
			data-testid="map-container"
			bind:this={mapContainer}
			aria-label="Interactive Google Map of clinic and directions"
		></div>

		{#if missingApiKey || mapError}
			<div class="map-overlay-notice">
				{#if missingApiKey}
					<h3>Google Maps API Key Required</h3>
					<p>
						Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> using a free
						<a
							href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
							target="_blank"
							rel="noopener noreferrer"
						>
							Maps Demo Key
						</a>
						or Google Cloud key to render the interactive map, Places details, Routes, and Street View.
					</p>
				{:else if mapError}
					<h3>Map Initialization Issue</h3>
					<p>{mapError}</p>
				{/if}
			</div>
		{/if}

		<div class="map-legend" aria-label="Map legend">
			<span class="legend-item">
				<span class="swatch swatch-clinic"></span>
				Clinic Pin
			</span>
			<span class="legend-item">
				<span class="swatch swatch-origin"></span>
				Origin
			</span>
			{#if showCoverage}
				<span class="legend-item">
					<span class="swatch swatch-radius"></span>
					3.5 km Home-Visit Zone
				</span>
			{/if}
		</div>
	</div>

	<div
		class="street-view-pane"
		class:is-hidden={viewMode === 'map'}
	>
		<div class="street-view-banner">
			<span>Street View Entrance Preview</span>
			<small>{streetViewDescription}</small>
		</div>
		<div
			class="street-view-canvas"
			data-testid="street-view-container"
			bind:this={streetViewContainer}
			aria-label="Street View panorama of clinic entrance"
		></div>
	</div>
</div>
