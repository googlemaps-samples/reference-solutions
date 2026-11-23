<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import TopCommandBar from '$lib/components/TopCommandBar.svelte';
	import TelemetrySidebar from '$lib/components/TelemetrySidebar.svelte';
	import DispatchMap from '$lib/components/DispatchMap.svelte';
	import { DALLAS_DEPOT, DALLAS_FLEET_VEHICLES } from '$lib/data/dallasFleet';
	import { loadGmpLibraries, type LoadedGmpLibraries } from '$lib/maps/loader';
	import {
		computeDispatchRoute,
		computeHubMatrix,
		discoverDallasHubs,
		snapVehicleTrace
	} from '$lib/maps/services';
	import type {
		DispatchRouteResult,
		FleetVehicle,
		LogisticsHub,
		MatrixEntry,
		SnapAnalysis,
		StatusFilter
	} from '$lib/types/logistics';

	const rawKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
	const apiKeyConfigured = Boolean(rawKey && rawKey !== 'your_google_maps_api_key_here');

	let libs: LoadedGmpLibraries | null = $state(null);
	let mapError: string | null = $state(null);

	let activeFilter: StatusFilter = $state('all');
	let trafficEnabled = $state(false);
	let showRoadSnapped = $state(true);
	let optimizeOrder = $state(true);

	const allVehicles: FleetVehicle[] = DALLAS_FLEET_VEHICLES;
	let selectedVehicleId = $state(DALLAS_FLEET_VEHICLES[0].id);

	let snapCache = $state<Record<string, SnapAnalysis>>({});
	let snappingLoading = $state(false);

	let hubs = $state<LogisticsHub[]>([]);
	let selectedHubIds = $state<string[]>([]);
	let hubsNote = $state<string | null>(null);

	let computingDispatch = $state(false);
	let dispatchResult = $state<DispatchRouteResult | null>(null);
	let dispatchError = $state<string | null>(null);
	let matrixEntries = $state<MatrixEntry[]>([]);

	const counts = $derived({
		all: allVehicles.length,
		enRoute: allVehicles.filter((v) => v.status === 'en-route').length,
		delayed: allVehicles.filter((v) => v.status === 'delayed').length,
		idle: allVehicles.filter((v) => v.status === 'idle').length
	});

	const filteredVehicles = $derived(
		activeFilter === 'all' ? allVehicles : allVehicles.filter((v) => v.status === activeFilter)
	);

	const selectedVehicle = $derived(
		allVehicles.find((v) => v.id === selectedVehicleId) ?? filteredVehicles[0] ?? null
	);

	const activeSnapAnalysis = $derived(
		selectedVehicle ? (snapCache[selectedVehicle.id] ?? null) : null
	);

	async function runSnapForVehicle(vehicle: FleetVehicle) {
		if (!apiKeyConfigured) return;
		if (snapCache[vehicle.id]) return;

		snappingLoading = true;
		try {
			const analysis = await snapVehicleTrace(vehicle);
			snapCache = { ...snapCache, [vehicle.id]: analysis };
		} finally {
			snappingLoading = false;
		}
	}

	async function handleSelectVehicle(vehicleId: string) {
		selectedVehicleId = vehicleId;
		const vehicle = allVehicles.find((v) => v.id === vehicleId);
		if (vehicle) {
			await runSnapForVehicle(vehicle);
		}
	}

	function handleFilterChange(filter: StatusFilter) {
		activeFilter = filter;
		const nextVisible =
			filter === 'all' ? allVehicles : allVehicles.filter((v) => v.status === filter);
		if (nextVisible.length > 0 && !nextVisible.some((v) => v.id === selectedVehicleId)) {
			void handleSelectVehicle(nextVisible[0].id);
		}
	}

	function handleToggleHubSelection(hubId: string) {
		if (selectedHubIds.includes(hubId)) {
			selectedHubIds = selectedHubIds.filter((id) => id !== hubId);
		} else {
			selectedHubIds = [...selectedHubIds, hubId];
		}
	}

	function handleAddPlaceHub(hub: LogisticsHub) {
		if (!hubs.some((h) => h.id === hub.id)) {
			hubs = [...hubs, hub];
		}
		if (!selectedHubIds.includes(hub.id)) {
			selectedHubIds = [...selectedHubIds, hub.id];
		}
	}

	async function handleComputeDispatch() {
		if (!libs || selectedHubIds.length === 0) return;

		const stops = hubs.filter((h) => selectedHubIds.includes(h.id));
		if (stops.length === 0) return;

		computingDispatch = true;
		dispatchError = null;
		try {
			const [routeOutcome, matrixOutcome] = await Promise.all([
				computeDispatchRoute(DALLAS_DEPOT, stops, optimizeOrder, libs.geometry, libs.routes),
				computeHubMatrix(DALLAS_DEPOT, stops, libs.routes)
			]);
			dispatchResult = routeOutcome;
			matrixEntries = matrixOutcome;
		} catch (err) {
			dispatchError =
				err instanceof Error ? err.message : 'Unable to compute dispatch route or matrix.';
		} finally {
			computingDispatch = false;
		}
	}

	onMount(async () => {
		if (!apiKeyConfigured) {
			hubsNote = 'Configure PUBLIC_GOOGLE_MAPS_API_KEY in .env to load live Dallas hubs.';
			return;
		}

		try {
			const loaded = await loadGmpLibraries(rawKey);
			libs = loaded;

			// Run initial Places discovery & Roads API snap concurrently
			const [hubDiscovery] = await Promise.all([
				discoverDallasHubs(loaded.places),
				runSnapForVehicle(allVehicles[0])
			]);

			hubs = hubDiscovery.hubs;
			hubsNote = hubDiscovery.note ?? null;
			if (hubDiscovery.hubs.length > 0) {
				selectedHubIds = hubDiscovery.hubs.slice(0, 4).map((h) => h.id);
				await handleComputeDispatch();
			}
		} catch (err) {
			mapError =
				err instanceof Error
					? err.message
					: 'Failed to initialize Google Maps Platform libraries.';
		}
	});
</script>

<div class="dashboard-shell">
	<TopCommandBar
		{activeFilter}
		{counts}
		{trafficEnabled}
		placesLib={libs?.places ?? null}
		onFilterChange={handleFilterChange}
		onToggleTraffic={() => (trafficEnabled = !trafficEnabled)}
		onAddPlaceHub={handleAddPlaceHub}
	/>

	<div class="workspace-split">
		<TelemetrySidebar
			vehicles={filteredVehicles}
			{selectedVehicleId}
			snapAnalysis={activeSnapAnalysis}
			{snappingLoading}
			{showRoadSnapped}
			depot={DALLAS_DEPOT}
			{hubs}
			{selectedHubIds}
			{hubsNote}
			{optimizeOrder}
			{computingDispatch}
			{dispatchResult}
			{dispatchError}
			{matrixEntries}
			{apiKeyConfigured}
			onSelectVehicle={handleSelectVehicle}
			onToggleRoadSnapped={() => (showRoadSnapped = !showRoadSnapped)}
			onToggleHubSelection={handleToggleHubSelection}
			onToggleOptimizeOrder={() => (optimizeOrder = !optimizeOrder)}
			onComputeDispatch={handleComputeDispatch}
		/>

		<DispatchMap
			{libs}
			{apiKeyConfigured}
			{mapError}
			vehicles={filteredVehicles}
			{selectedVehicle}
			snapAnalysis={activeSnapAnalysis}
			{showRoadSnapped}
			depot={DALLAS_DEPOT}
			{hubs}
			{selectedHubIds}
			{dispatchResult}
			{trafficEnabled}
			onSelectVehicle={handleSelectVehicle}
		/>
	</div>
</div>

<style>
	.dashboard-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg-app);
	}

	.workspace-split {
		display: flex;
		flex: 1;
		min-height: 520px;
	}

	@media (max-width: 900px) {
		.workspace-split {
			flex-direction: column;
		}
	}
</style>
