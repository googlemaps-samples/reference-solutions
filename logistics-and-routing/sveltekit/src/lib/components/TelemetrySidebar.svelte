<script lang="ts">
	import type {
		DispatchRouteResult,
		FleetVehicle,
		LogisticsHub,
		MatrixEntry,
		SnapAnalysis
	} from '$lib/types/logistics';
	import { formatDistanceMiles, formatDuration } from '$lib/utils/geo';

	interface Props {
		vehicles: FleetVehicle[];
		selectedVehicleId: string;
		snapAnalysis: SnapAnalysis | null;
		snappingLoading: boolean;
		showRoadSnapped: boolean;
		depot: LogisticsHub;
		hubs: LogisticsHub[];
		selectedHubIds: string[];
		hubsNote: string | null;
		optimizeOrder: boolean;
		computingDispatch: boolean;
		dispatchResult: DispatchRouteResult | null;
		dispatchError: string | null;
		matrixEntries: MatrixEntry[];
		apiKeyConfigured: boolean;
		onSelectVehicle: (vehicleId: string) => void;
		onToggleRoadSnapped: () => void;
		onToggleHubSelection: (hubId: string) => void;
		onToggleOptimizeOrder: () => void;
		onComputeDispatch: () => void;
	}

	let {
		vehicles,
		selectedVehicleId,
		snapAnalysis,
		snappingLoading,
		showRoadSnapped,
		depot,
		hubs,
		selectedHubIds,
		hubsNote,
		optimizeOrder,
		computingDispatch,
		dispatchResult,
		dispatchError,
		matrixEntries,
		apiKeyConfigured,
		onSelectVehicle,
		onToggleRoadSnapped,
		onToggleHubSelection,
		onToggleOptimizeOrder,
		onComputeDispatch
	}: Props = $props();

	function statusLabel(status: FleetVehicle['status']): string {
		if (status === 'en-route') return 'En Route';
		if (status === 'delayed') return 'Delayed';
		return 'Idle';
	}
</script>

<aside class="sidebar" aria-label="Fleet telemetry and dispatch sidebar">
	<!-- Section 1: Active Fleet Telemetry -->
	<section class="panel-section">
		<div class="section-header">
			<h2>Active Fleet Telemetry</h2>
			<span class="section-badge">{vehicles.length} units</span>
		</div>

		<div data-testid="fleet-vehicle-list" class="vehicle-list">
			{#if vehicles.length === 0}
				<div class="empty-note">No vehicles match the selected status filter.</div>
			{:else}
				{#each vehicles as vehicle (vehicle.id)}
					<button
						type="button"
						class="vehicle-card"
						class:selected={vehicle.id === selectedVehicleId}
						onclick={() => onSelectVehicle(vehicle.id)}
					>
						<div class="vehicle-top">
							<div class="vehicle-id-row">
								<span class="vehicle-id">{vehicle.id}</span>
								<span class="status-badge {vehicle.status}">{statusLabel(vehicle.status)}</span>
							</div>
							<span class="speed-readout">{vehicle.speedMph} mph</span>
						</div>

						<div class="vehicle-meta">
							<span>{vehicle.driver} · {vehicle.vehicleType}</span>
							<span class="corridor-tag">{vehicle.corridor}</span>
						</div>

						<div class="vehicle-route-row">
							<span class="next-stop">Next: {vehicle.nextStop}</span>
							<span class="eta-value" class:delayed={vehicle.status === 'delayed'}>
								ETA {vehicle.etaLabel}
							</span>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</section>

	<!-- Section 2: GPS Trace & Roads API Inspector -->
	<section data-testid="raw-vs-snapped-panel" class="panel-section">
		<div class="section-header">
			<h2>GPS Trace &amp; Roads API</h2>
			<button
				type="button"
				data-testid="snap-to-roads-toggle"
				class="toggle-chip"
				class:active={showRoadSnapped}
				onclick={onToggleRoadSnapped}
				aria-pressed={showRoadSnapped}
			>
				{showRoadSnapped ? 'Snapped Overlay On' : 'Raw Only'}
			</button>
		</div>

		<p class="section-desc">
			Compares noisy raw GPS breadcrumbs (dashed red) against Roads API <code>snapToRoads</code>
			interpolated geometry (solid blue) for <strong>{selectedVehicleId}</strong>.
		</p>

		{#if snappingLoading}
			<div class="info-box">Snapping raw GPS breadcrumbs via Roads API...</div>
		{:else if snapAnalysis}
			<div class="metrics-grid">
				<div class="metric-cell">
					<span class="metric-label">Raw GPS Pts</span>
					<span class="metric-value">{snapAnalysis.rawCount}</span>
				</div>
				<div class="metric-cell">
					<span class="metric-label">Snapped Pts</span>
					<span class="metric-value">{snapAnalysis.snappedCount}</span>
				</div>
				<div class="metric-cell">
					<span class="metric-label">Road Segments</span>
					<span class="metric-value">{snapAnalysis.uniqueRoadSegments}</span>
				</div>
				<div class="metric-cell">
					<span class="metric-label">Mean Offset</span>
					<span class="metric-value">
						{snapAnalysis.source === 'roads-api' ? `${snapAnalysis.meanOffsetMeters} m` : '—'}
					</span>
				</div>
			</div>
			{#if snapAnalysis.warningMessage}
				<div class="warning-note">{snapAnalysis.warningMessage}</div>
			{/if}
		{:else}
			<div class="info-box">Select an active vehicle to inspect its road-snapped GPS trace.</div>
		{/if}
	</section>

	<!-- Section 3: Multi-Stop Dispatch & Route Matrix -->
	<section data-testid="dispatch-matrix-panel" class="panel-section">
		<div class="section-header">
			<h2>Multi-Stop Dispatch &amp; Matrix</h2>
			<label class="optimize-label">
				<input
					type="checkbox"
					data-testid="optimize-waypoints-toggle"
					checked={optimizeOrder}
					onchange={onToggleOptimizeOrder}
				/>
				<span>Optimize Stops</span>
			</label>
		</div>

		<div class="depot-row">
			<span class="depot-tag">DEPOT</span>
			<div class="depot-info">
				<strong>{depot.name}</strong>
				<span>{depot.address}</span>
			</div>
		</div>

		{#if hubsNote}
			<div class="warning-note">{hubsNote}</div>
		{/if}

		<div class="hub-list">
			{#each hubs as hub, index (hub.id)}
				{@const checked = selectedHubIds.includes(hub.id)}
				<label class="hub-item" class:checked>
					<input
						type="checkbox"
						{checked}
						onchange={() => onToggleHubSelection(hub.id)}
					/>
					<span class="hub-num">{index + 1}</span>
					<div class="hub-text">
						<span class="hub-name">{hub.name}</span>
						<span class="hub-addr">{hub.address}</span>
					</div>
				</label>
			{/each}
		</div>

		<button
			type="button"
			data-testid="calculate-dispatch-route-btn"
			class="dispatch-btn"
			disabled={computingDispatch || !apiKeyConfigured || selectedHubIds.length === 0}
			onclick={onComputeDispatch}
		>
			{#if computingDispatch}
				Computing Dispatch &amp; Matrix...
			{:else}
				Compute Dispatch Corridor &amp; Matrix
			{/if}
		</button>

		{#if dispatchError}
			<div class="warning-note">{dispatchError}</div>
		{/if}

		{#if dispatchResult}
			<div class="dispatch-summary">
				<div>
					<span class="summary-k">Total Corridor</span>
					<strong class="summary-v">{formatDistanceMiles(dispatchResult.totalDistanceMeters)}</strong>
				</div>
				<div>
					<span class="summary-k">Traffic-Aware ETA</span>
					<strong class="summary-v">{formatDuration(dispatchResult.totalDurationSeconds)}</strong>
				</div>
				<div>
					<span class="summary-k">Stops</span>
					<strong class="summary-v">{dispatchResult.orderedHubs.length} hubs</strong>
				</div>
			</div>

			{#if dispatchResult.legs.length > 0}
				<div class="legs-list">
					{#each dispatchResult.legs as leg, idx (idx)}
						<div class="leg-row">
							<span class="leg-step">Leg {idx + 1}</span>
							<span class="leg-dest">{leg.toName}</span>
							<span class="leg-stats">
								{formatDistanceMiles(leg.distanceMeters)} · {formatDuration(leg.durationSeconds)}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if matrixEntries.length > 0}
			<div class="matrix-wrap">
				<h3>Depot-to-Hub Matrix (Routes API)</h3>
				<table class="matrix-table">
					<thead>
						<tr>
							<th>Drop-Off Hub</th>
							<th>Dist</th>
							<th>ETA</th>
						</tr>
					</thead>
					<tbody>
						{#each matrixEntries as entry (entry.hubId)}
							<tr>
								<td class="td-hub">{entry.hubName}</td>
								<td class="td-num">{formatDistanceMiles(entry.distanceMeters)}</td>
								<td class="td-num">{formatDuration(entry.durationSeconds)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</aside>

<style>
	.sidebar {
		width: 400px;
		flex-shrink: 0;
		height: calc(100vh - 56px);
		overflow-y: auto;
		background: var(--bg-surface);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
	}

	.panel-section {
		padding: 14px 16px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 10px;
	}

	.section-header h2 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.section-badge {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--bg-surface-muted);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.vehicle-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.vehicle-card {
		text-align: left;
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-surface);
		transition: all 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.vehicle-card:hover {
		border-color: var(--border-strong);
		background: var(--bg-surface-muted);
	}

	.vehicle-card.selected {
		border-color: var(--accent-blue);
		background: #eff6ff;
		box-shadow: 0 0 0 1px var(--accent-blue);
	}

	.vehicle-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.vehicle-id-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.vehicle-id {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.status-badge {
		font-size: 0.7rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 999px;
	}

	.status-badge.en-route {
		background: var(--status-en-route-bg);
		color: var(--status-en-route-text);
	}

	.status-badge.delayed {
		background: var(--status-delayed-bg);
		color: var(--status-delayed-text);
	}

	.status-badge.idle {
		background: var(--status-idle-bg);
		color: var(--status-idle-text);
	}

	.speed-readout {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.vehicle-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.74rem;
		color: var(--text-secondary);
		gap: 8px;
	}

	.corridor-tag {
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.vehicle-route-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.76rem;
		padding-top: 4px;
		border-top: 1px dashed var(--border-subtle);
	}

	.next-stop {
		color: var(--text-primary);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.eta-value {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--status-en-route-text);
		flex-shrink: 0;
	}

	.eta-value.delayed {
		color: var(--status-delayed-text);
	}

	.toggle-chip {
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--bg-surface-muted);
		color: var(--text-secondary);
		font-size: 0.73rem;
		font-weight: 600;
	}

	.toggle-chip.active {
		background: #e0f2fe;
		border-color: #0284c7;
		color: #0369a1;
	}

	.section-desc {
		margin: 0 0 10px;
		font-size: 0.76rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.section-desc code {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		background: var(--bg-surface-muted);
		padding: 1px 4px;
		border-radius: 4px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.metric-cell {
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--bg-surface-muted);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.metric-label {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.metric-value {
		font-family: var(--font-mono);
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.optimize-label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
	}

	.depot-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 8px;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
		margin-bottom: 10px;
	}

	.depot-tag {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: #4f46e5;
		color: #ffffff;
	}

	.depot-info {
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
	}

	.depot-info span {
		color: var(--text-secondary);
		font-size: 0.71rem;
	}

	.hub-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 10px;
	}

	.hub-item {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 7px 9px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-surface);
		cursor: pointer;
	}

	.hub-item.checked {
		border-color: #a5b4fc;
		background: #f5f7ff;
	}

	.hub-num {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #4f46e5;
		color: #ffffff;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.hub-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.hub-name {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hub-addr {
		font-size: 0.7rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dispatch-btn {
		width: 100%;
		padding: 10px 14px;
		border: none;
		border-radius: 8px;
		background: var(--accent-blue);
		color: #ffffff;
		font-size: 0.82rem;
		font-weight: 600;
		transition: background 0.15s ease;
	}

	.dispatch-btn:hover:not(:disabled) {
		background: var(--accent-blue-dark);
	}

	.dispatch-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.dispatch-summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		margin-top: 10px;
		padding: 9px 10px;
		border-radius: 8px;
		background: #eef2ff;
		border: 1px solid #c7d2fe;
	}

	.summary-k {
		display: block;
		font-size: 0.68rem;
		color: var(--text-secondary);
	}

	.summary-v {
		font-family: var(--font-mono);
		font-size: 0.84rem;
		color: #312e81;
	}

	.legs-list {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.leg-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		font-size: 0.73rem;
		padding: 5px 8px;
		border-radius: 6px;
		background: var(--bg-surface-muted);
	}

	.leg-step {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--corridor-indigo);
		flex-shrink: 0;
	}

	.leg-dest {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary);
	}

	.leg-stats {
		font-family: var(--font-mono);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.matrix-wrap {
		margin-top: 12px;
	}

	.matrix-wrap h3 {
		margin: 0 0 6px;
		font-size: 0.74rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--text-secondary);
	}

	.matrix-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.matrix-table th,
	.matrix-table td {
		padding: 6px 8px;
		border-bottom: 1px solid var(--border-subtle);
		text-align: left;
	}

	.matrix-table th {
		color: var(--text-muted);
		font-weight: 600;
		background: var(--bg-surface-muted);
	}

	.td-hub {
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.td-num {
		font-family: var(--font-mono);
		font-weight: 600;
		white-space: nowrap;
	}

	.info-box,
	.empty-note {
		font-size: 0.76rem;
		color: var(--text-secondary);
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--bg-surface-muted);
		border: 1px solid var(--border-subtle);
	}

	.warning-note {
		margin-top: 8px;
		font-size: 0.74rem;
		color: #92400e;
		background: #fffbeb;
		border: 1px solid #fde68a;
		padding: 7px 9px;
		border-radius: 8px;
	}

	@media (max-width: 900px) {
		.sidebar {
			width: 100%;
			height: auto;
			max-height: none;
			border-right: none;
			border-bottom: 1px solid var(--border-subtle);
		}
	}
</style>
