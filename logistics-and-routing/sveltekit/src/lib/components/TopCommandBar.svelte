<script lang="ts">
	import type { LatLngPoint, LogisticsHub, StatusFilter } from '$lib/types/logistics';
	import { DALLAS_CENTER } from '$lib/data/dallasFleet';

	interface Props {
		activeFilter: StatusFilter;
		counts: {
			all: number;
			enRoute: number;
			delayed: number;
			idle: number;
		};
		trafficEnabled: boolean;
		placesLib: google.maps.PlacesLibrary | null;
		onFilterChange: (filter: StatusFilter) => void;
		onToggleTraffic: () => void;
		onAddPlaceHub: (hub: LogisticsHub) => void;
	}

	let {
		activeFilter,
		counts,
		trafficEnabled,
		placesLib,
		onFilterChange,
		onToggleTraffic,
		onAddPlaceHub
	}: Props = $props();

	let autocompleteHost: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!placesLib || !autocompleteHost) return;

		const element = new placesLib.PlaceAutocompleteElement({
			locationBias: {
				center: DALLAS_CENTER,
				radius: 45000
			} as google.maps.places.LocationBias,
			includedRegionCodes: ['us']
		});
		element.setAttribute('aria-label', 'Search Dallas hub or stop');
		element.style.width = '100%';
		element.style.display = 'block';

		const handleSelect = async (event: Event) => {
			const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
			if (!selectEvent.placePrediction) return;
			const place = selectEvent.placePrediction.toPlace();
			await place.fetchFields({
				fields: ['id', 'displayName', 'formattedAddress', 'location']
			});

			if (!place.location) return;
			const loc: LatLngPoint = {
				lat: place.location.lat(),
				lng: place.location.lng()
			};
			onAddPlaceHub({
				id: place.id || `custom-${Date.now()}`,
				name: place.displayName || 'Custom Dallas Stop',
				address: place.formattedAddress || 'Dallas, TX',
				location: loc
			});
		};

		element.addEventListener('gmp-select', handleSelect);
		autocompleteHost.replaceChildren(element);

		return () => {
			element.removeEventListener('gmp-select', handleSelect);
			autocompleteHost?.replaceChildren();
		};
	});
</script>

<header class="command-bar">
	<div class="brand-group">
		<div class="brand-mark" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12h4l3-7 4 14 3-7h4" />
			</svg>
		</div>
		<div class="brand-text">
			<h1 class="brand-title">Dallas Fleet Dispatch</h1>
			<span class="brand-subtitle">Telematics · Roads API · Routes v2</span>
		</div>
	</div>

	<div class="filter-group" role="group" aria-label="Fleet status filters">
		<button
			type="button"
			data-testid="status-filter-all"
			class="filter-pill"
			class:active={activeFilter === 'all'}
			onclick={() => onFilterChange('all')}
		>
			All <span class="pill-count">{counts.all}</span>
		</button>
		<button
			type="button"
			data-testid="status-filter-en-route"
			class="filter-pill en-route"
			class:active={activeFilter === 'en-route'}
			onclick={() => onFilterChange('en-route')}
		>
			<span class="dot dot-green"></span>
			En Route <span class="pill-count">{counts.enRoute}</span>
		</button>
		<button
			type="button"
			data-testid="status-filter-delayed"
			class="filter-pill delayed"
			class:active={activeFilter === 'delayed'}
			onclick={() => onFilterChange('delayed')}
		>
			<span class="dot dot-amber"></span>
			Delayed <span class="pill-count">{counts.delayed}</span>
		</button>
		<button
			type="button"
			data-testid="status-filter-idle"
			class="filter-pill idle"
			class:active={activeFilter === 'idle'}
			onclick={() => onFilterChange('idle')}
		>
			<span class="dot dot-slate"></span>
			Idle <span class="pill-count">{counts.idle}</span>
		</button>
	</div>

	<div class="controls-right">
		<button
			type="button"
			data-testid="traffic-layer-toggle"
			class="traffic-btn"
			class:active={trafficEnabled}
			onclick={onToggleTraffic}
			aria-pressed={trafficEnabled}
		>
			<span class="traffic-indicator" class:on={trafficEnabled}></span>
			Live Traffic
		</button>

		<div
			bind:this={autocompleteHost}
			data-testid="place-autocomplete-container"
			class="autocomplete-slot"
		>
			{#if !placesLib}
				<input
					type="text"
					class="autocomplete-placeholder"
					placeholder="Add Dallas hub via Places Autocomplete..."
					disabled
					aria-label="Places Autocomplete unavailable until API key loads"
				/>
			{/if}
		</div>
	</div>
</header>

<style>
	.command-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 56px;
		padding: 6px 16px;
		background: var(--bg-command);
		color: #f8fafc;
		border-bottom: 1px solid #1e293b;
		flex-wrap: wrap;
		z-index: 20;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.brand-mark {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: linear-gradient(135deg, #2563eb, #0ea5e9);
		display: grid;
		place-items: center;
		color: #ffffff;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.brand-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: #ffffff;
	}

	.brand-subtitle {
		font-size: 0.72rem;
		color: #94a3b8;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 999px;
		border: 1px solid #334155;
		background: #1e293b;
		color: #cbd5e1;
		font-size: 0.78rem;
		font-weight: 600;
		transition: all 0.15s ease;
	}

	.filter-pill:hover {
		background: #334155;
		color: #ffffff;
	}

	.filter-pill.active {
		background: #2563eb;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.filter-pill.en-route.active {
		background: #059669;
		border-color: #10b981;
	}

	.filter-pill.delayed.active {
		background: #d97706;
		border-color: #f59e0b;
	}

	.filter-pill.idle.active {
		background: #475569;
		border-color: #64748b;
	}

	.pill-count {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		opacity: 0.9;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
	.dot-green {
		background: #10b981;
	}
	.dot-amber {
		background: #f59e0b;
	}
	.dot-slate {
		background: #94a3b8;
	}

	.controls-right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		justify-content: flex-end;
		min-width: 260px;
	}

	.traffic-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 11px;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #1e293b;
		color: #e2e8f0;
		font-size: 0.78rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.traffic-btn.active {
		background: #0f766e;
		border-color: #14b8a6;
		color: #ffffff;
	}

	.traffic-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #64748b;
	}

	.traffic-indicator.on {
		background: #2dd4bf;
		box-shadow: 0 0 6px #2dd4bf;
	}

	.autocomplete-slot {
		width: 260px;
		max-width: 100%;
		color-scheme: light;
	}

	.autocomplete-placeholder {
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #1e293b;
		color: #94a3b8;
		font-size: 0.78rem;
	}

	@media (max-width: 960px) {
		.command-bar {
			padding: 10px 12px;
		}
		.controls-right {
			width: 100%;
			justify-content: space-between;
		}
		.autocomplete-slot {
			flex: 1;
		}
	}
</style>
