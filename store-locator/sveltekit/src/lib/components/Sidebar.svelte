<script lang="ts">
	import {
		BRANCH_TYPE_LABELS,
		NYC_ORIGIN_PRESETS,
		SERVICE_LABELS,
		type ActiveRouteInfo,
		type BranchFilterType,
		type BranchLocation,
		type OriginLocation,
		type ServiceTag
	} from '$lib/types';

	interface Props {
		origin: OriginLocation;
		branches: BranchLocation[];
		totalBranchesCount: number;
		selectedBranchId: string | null;
		fastestBranchId: string | null;
		activeTypeFilter: BranchFilterType;
		activeServices: ServiceTag[];
		activeRoute: ActiveRouteInfo | null;
		isLoadingBranches: boolean;
		isComputingMatrix: boolean;
		errorMessage: string | null;
		onTypeFilterChange: (type: BranchFilterType) => void;
		onToggleService: (service: ServiceTag) => void;
		onSelectBranch: (branch: BranchLocation) => void;
		onSelectOriginPreset: (preset: OriginLocation) => void;
	}

	let {
		origin,
		branches,
		totalBranchesCount,
		selectedBranchId,
		fastestBranchId,
		activeTypeFilter,
		activeServices,
		activeRoute,
		isLoadingBranches,
		isComputingMatrix,
		errorMessage,
		onTypeFilterChange,
		onToggleService,
		onSelectBranch,
		onSelectOriginPreset
	}: Props = $props();

	const serviceOptions: { key: ServiceTag; testId: string; label: string }[] = [
		{ key: 'pickup', testId: 'filter-service-pickup', label: 'Click & Collect' },
		{ key: 'coffee', testId: 'filter-service-coffee', label: 'Express Espresso' },
		{ key: 'cash', testId: 'filter-service-cash', label: 'Cash Deposit' },
		{ key: 'open24', testId: 'filter-service-open24', label: 'Open 24h' }
	];
</script>

<aside class="sidebar" aria-label="Branch locator sidebar">
	<div class="sidebar-filters">
		<div class="origin-pill-bar">
			<span>
				Origin: <strong>{origin.label}</strong>
			</span>
			<div class="chip-row">
				{#each NYC_ORIGIN_PRESETS.slice(0, 2) as preset (preset.label)}
					<button
						type="button"
						class="preset-btn"
						onclick={() => onSelectOriginPreset(preset)}
						title={preset.address}
					>
						{preset.label.split(' / ')[0]}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<div class="filter-section-label">Branch Type</div>
			<div class="chip-row">
				<button
					type="button"
					data-testid="filter-type-all"
					class="filter-chip"
					class:active={activeTypeFilter === 'all'}
					onclick={() => onTypeFilterChange('all')}
				>
					All ({totalBranchesCount})
				</button>
				<button
					type="button"
					data-testid="filter-type-flagship"
					class="filter-chip"
					class:active={activeTypeFilter === 'flagship'}
					onclick={() => onTypeFilterChange('flagship')}
				>
					Flagship Store
				</button>
				<button
					type="button"
					data-testid="filter-type-kiosk"
					class="filter-chip"
					class:active={activeTypeFilter === 'kiosk'}
					onclick={() => onTypeFilterChange('kiosk')}
				>
					Express Kiosk
				</button>
				<button
					type="button"
					data-testid="filter-type-atm"
					class="filter-chip"
					class:active={activeTypeFilter === 'atm'}
					onclick={() => onTypeFilterChange('atm')}
				>
					24/7 ATM
				</button>
			</div>
		</div>

		<div>
			<div class="filter-section-label">Inventory &amp; Services</div>
			<div class="chip-row">
				{#each serviceOptions as service (service.key)}
					<button
						type="button"
						data-testid={service.testId}
						class="filter-chip service"
						class:active={activeServices.includes(service.key)}
						onclick={() => onToggleService(service.key)}
					>
						{service.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if errorMessage}
		<div class="status-banner error" role="alert">{errorMessage}</div>
	{/if}

	{#if activeRoute}
		<div class="route-summary-banner" data-testid="route-summary-banner">
			<div class="route-summary-top">
				<span class="route-summary-title">{activeRoute.branchName}</span>
				<span class="route-summary-metrics">
					{activeRoute.durationText} • {activeRoute.distanceText}
				</span>
			</div>
			<div class="route-summary-sub">
				<span>
					{BRANCH_TYPE_LABELS[activeRoute.branchType]} • {activeRoute.travelMode}
				</span>
				<a
					class="directions-link"
					href={activeRoute.googleMapsUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open in Google Maps
				</a>
			</div>
		</div>
	{/if}

	<div class="branch-list-header">
		<span>
			{#if isLoadingBranches}
				Searching live NYC locations...
			{:else}
				Showing {branches.length} {branches.length === 1 ? 'location' : 'locations'}
			{/if}
		</span>
		<span>{isComputingMatrix ? 'Updating ETAs...' : 'Sorted by road ETA'}</span>
	</div>

	<div class="branch-list" data-testid="branch-list">
		{#if !isLoadingBranches && branches.length === 0}
			<div class="status-banner info">
				No branches match your current filters. Clear a service toggle or switch branch type to
				see nearby NYC locations.
			</div>
		{/if}

		{#each branches as branch (branch.id)}
			{@const isFastest = branch.id === fastestBranchId}
			{@const isSelected = branch.id === selectedBranchId}
			<button
				type="button"
				data-testid="branch-card"
				class="branch-card"
				class:selected={isSelected}
				onclick={() => onSelectBranch(branch)}
			>
				<div class="branch-card-top">
					<span class="branch-name">{branch.name}</span>
					<div class="badge-group">
						{#if isFastest}
							<span class="fastest-badge" data-testid="fastest-branch-badge">
								Fastest Nearby
							</span>
						{/if}
						<span class={`type-badge ${branch.type}`}>
							{BRANCH_TYPE_LABELS[branch.type]}
						</span>
					</div>
				</div>

				<div class="branch-address">{branch.address}</div>

				<div class="branch-meta-row">
					<span class="branch-rating">
						{#if branch.rating !== null}
							★ {branch.rating.toFixed(1)}
							{#if branch.userRatingCount}
								({branch.userRatingCount.toLocaleString()})
							{/if}
						{:else}
							Live Google Place
						{/if}
					</span>
					<div class="branch-travel">
						<span class="branch-eta" data-testid="branch-eta">
							{branch.durationText ?? 'Calculating...'}
						</span>
						<span class="branch-distance" data-testid="branch-distance">
							{branch.distanceText ?? '—'}
						</span>
					</div>
				</div>

				<div class="service-tags">
					{#each branch.services as svc (svc)}
						<span class="service-tag">{SERVICE_LABELS[svc]}</span>
					{/each}
				</div>

				{#if branch.weekdayDescriptions.length > 0}
					<div class="branch-hours">{branch.weekdayDescriptions[0]}</div>
				{/if}
			</button>
		{/each}
	</div>
</aside>
