<script lang="ts">
	import type { ClinicProfile, ViewMode } from '$lib/types/storefront';

	interface Props {
		clinic: ClinicProfile | null;
		loadingClinic: boolean;
		showCoverage: boolean;
		viewMode: ViewMode;
		streetViewAvailable: boolean;
		onToggleCoverage: () => void;
		onToggleStreetView: () => void;
		onSelectViewMode: (mode: ViewMode) => void;
	}

	let {
		clinic,
		loadingClinic,
		showCoverage,
		viewMode,
		streetViewAvailable,
		onToggleCoverage,
		onToggleStreetView,
		onSelectViewMode
	}: Props = $props();

	let clinicName = $derived(clinic?.displayName ?? '450 Sutter Dental Collective');
	let clinicAddress = $derived(
		clinic?.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108'
	);
	let openNow = $derived(clinic?.openNow);
	let isStreetViewOpen = $derived(viewMode !== 'map');
</script>

<header class="clinic-header" data-testid="clinic-header">
	<div class="brand-cluster">
		<div class="brand-emblem" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 4v16M4 12h16" stroke-linecap="round" />
			</svg>
		</div>
		<div class="brand-copy">
			<div class="brand-title-row">
				<h1 class="brand-title">{clinicName}</h1>
				{#if loadingClinic}
					<span class="status-pill status-neutral">Loading hours...</span>
				{:else if openNow}
					<span
						class="status-pill"
						class:status-open={openNow.isOpen === true}
						class:status-closed={openNow.isOpen === false}
						class:status-neutral={openNow.isOpen === null}
					>
						<span class="status-dot" aria-hidden="true"></span>
						{openNow.label}
					</span>
				{/if}
			</div>
			<div class="brand-meta">
				<span>{clinicAddress}</span>
				{#if clinic?.nationalPhoneNumber}
					<span class="meta-sep" aria-hidden="true">·</span>
					<a href={`tel:${clinic.nationalPhoneNumber}`} class="meta-link">
						{clinic.nationalPhoneNumber}
					</a>
				{/if}
			</div>
		</div>
	</div>

	<div class="header-actions">
		<button
			type="button"
			class="header-btn"
			class:is-active={showCoverage}
			data-testid="coverage-overlay-toggle"
			aria-pressed={showCoverage}
			onclick={onToggleCoverage}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke-dasharray="3 2" />
				<circle cx="12" cy="12" r="2.5" fill="currentColor" />
			</svg>
			<span>Home-Visit Radius (3.5 km)</span>
		</button>

		<button
			type="button"
			class="header-btn"
			class:is-active={isStreetViewOpen}
			data-testid="street-view-toggle"
			aria-pressed={isStreetViewOpen}
			onclick={onToggleStreetView}
			title={streetViewAvailable
				? 'Toggle Street View entrance preview'
				: 'Street View entrance preview'}
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="12" cy="7" r="3" />
				<path d="M7 20v-4a5 5 0 0 1 10 0v4" stroke-linecap="round" />
			</svg>
			<span>{isStreetViewOpen ? 'Hide Street View' : 'Street View Entrance'}</span>
		</button>

		<div class="view-switcher" role="group" aria-label="Viewport layout mode">
			<button
				type="button"
				class="view-pill"
				class:is-selected={viewMode === 'map'}
				onclick={() => onSelectViewMode('map')}
			>
				Map
			</button>
			<button
				type="button"
				class="view-pill"
				class:is-selected={viewMode === 'split'}
				onclick={() => onSelectViewMode('split')}
			>
				Split
			</button>
			<button
				type="button"
				class="view-pill"
				class:is-selected={viewMode === 'streetview'}
				onclick={() => onSelectViewMode('streetview')}
			>
				Street View
			</button>
		</div>
	</div>
</header>
